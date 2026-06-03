/* ============================================================
   js/cultivation.js — 修炼系统
   依赖 Game.data（状态）和 Game.dom（DOM 引用）
   依赖 utils.js 和 components.js 中的全局函数
   ============================================================ */

var Cultivation = {

    /* ----------------------------------------------------------
       修炼计算
       ---------------------------------------------------------- */

    /** 获取突破所需经验 */
    getRequiredExp: function () {
        return calcRequiredExp(Game.data.realmIndex, Game.data.layer);
    },

    /** 计算战力（委托给 Game.calcPower） */
    calcPower: function () {
        return Game.calcPower();
    },

    /** 获取境界显示名 */
    getRealmDisplayName: function () {
        return getRealmDisplayName(Game.data.realmIndex, Game.data.layer);
    },

    /** 检查是否已达最高境界 */
    isMaxRealm: function () {
        return isMaxRealm(Game.data.realmIndex, Game.data.layer);
    },

    /** 检查经验是否已满 */
    isExpFull: function () {
        return Game.data.experience >= this.getRequiredExp();
    },

    /* ----------------------------------------------------------
       修炼
       ---------------------------------------------------------- */

    /**
     * 修炼动作
     * @param {boolean} isAuto - 是否自动修炼
     */
    cultivate: function (isAuto) {
        if (this.isMaxRealm()) return;

        var mult = getRealmMultiplier(Game.data.realmIndex);
        var baseExp = mult * randInt(1, 3);
        var expGain = Math.floor(baseExp * (1 + Ascension.getCultivateSpeedBonus()));
        var stoneGain = mult * randInt(1, 2);

        Game.data.experience += expGain;
        Game.data.spiritStones += stoneGain;
        Game.data.totalCultivations += 1;

        // 宗门任务进度联动 — 修炼
        if (typeof Sect !== 'undefined') {
            Sect.updateTaskProgress('cultivate', 1);
            // 灵石类任务进度联动
            Sect.updateTaskProgress('stones', stoneGain);
        }

        // 视觉效果
        var dom = Game.dom;
        showCultivateFloat(dom.cultivateBtn, dom.floatTextContainer, expGain, stoneGain);

        // 手动点击必定粒子，自动修炼30%概率
        if (!isAuto || Math.random() < 0.3) {
            spawnParticles(dom.cultivateBtn, randInt(3, 6));
        }

        // 更新UI
        this.updateAllUI();

        // 关键操作立即保存
        Game.saveGame();
    },

    /* ----------------------------------------------------------
       境界突破
       ---------------------------------------------------------- */

    breakthrough: function () {
        if (!this.isExpFull()) return;
        if (this.isMaxRealm()) {
            showToast('道友已臻至最高境界——真仙·十层！再无可破之境。', 3000);
            return;
        }

        var requiredExp = this.getRequiredExp();
        var mult = getRealmMultiplier(Game.data.realmIndex);

        // 扣除经验
        Game.data.experience -= requiredExp;

        // 判断是否突破到新境界
        var isNewRealm = (Game.data.layer >= 9);

        if (isNewRealm) {
            Game.data.realmIndex += 1;
            Game.data.layer = 0;
            triggerGoldenFlash(Game.dom.goldenFlash);
        } else {
            Game.data.layer += 1;
        }

        // 属性提升
        Game.data.hp += mult * 50;
        Game.data.attack += mult * 20;
        Game.data.defense += mult * 15;

        // 更新UI
        this.updateAllUI();

        // 立即保存
        Game.saveGame();
    },

    /* ----------------------------------------------------------
       UI更新
       ---------------------------------------------------------- */

    /** 更新全部UI */
    updateAllUI: function () {
        this.updateHeaderResources();
        this.updateAvatarSection();
        this.updateRealmProgress();
        this.updateCultivateButton();
        this.updateStatsPanel();
        this.updateExpBar();
        Game.updatePower();
    },

    /** 更新灵石显示 */
    updateHeaderResources: function () {
        Game.dom.spiritStonesDisplay.textContent = Game.data.spiritStones.toLocaleString();
    },

    /** 更新头像区（道号、境界、战力、修炼次数） */
    updateAvatarSection: function () {
        Game.dom.playerName.textContent = Game.data.playerName;

        // 飞升称号（如有）
        var ascTitle = Ascension.getAscensionTitle();
        if (ascTitle) {
            Game.dom.playerName.textContent = Game.data.playerName + ' [' + ascTitle + ']';
        }

        Game.dom.realmTitle.textContent = this.getRealmDisplayName();
        Game.dom.powerValue.textContent = formatNumber(Game.calcPower());
        Game.dom.totalCults.textContent = Game.data.totalCultivations.toLocaleString();
    },

    /** 更新境界进度条 */
    updateRealmProgress: function () {
        var progress = (Game.data.layer / 9) * 100;
        Game.dom.realmProgressFill.style.width = progress + '%';
        Game.dom.realmProgressText.textContent = (Game.data.layer + 1) + ' / 10 层';
    },

    /** 更新修炼按钮状态 */
    updateCultivateButton: function () {
        var btn = Game.dom.cultivateBtn;
        var label = Game.dom.cultivateBtnLabel;

        // 满境界+经验满 → 渡劫飞升
        if (this.isMaxRealm() && this.isExpFull()) {
            btn.classList.add('breakthrough');
            btn.disabled = false;
            label.textContent = '渡劫飞升';
            return;
        }

        if (this.isMaxRealm()) {
            btn.classList.remove('breakthrough');
            btn.disabled = true;
            label.textContent = '圆满';
            return;
        }

        if (this.isExpFull()) {
            btn.classList.add('breakthrough');
            label.textContent = '突 破';
            btn.disabled = false;
        } else {
            btn.classList.remove('breakthrough');
            label.textContent = '修 炼';
            btn.disabled = false;
        }
    },

    /** 更新属性面板 */
    updateStatsPanel: function () {
        Game.dom.statLevel.textContent = calcLevel(Game.data.realmIndex, Game.data.layer);
        Game.dom.statHp.textContent = Game.data.hp.toLocaleString();
        Game.dom.statAtk.textContent = Game.data.attack.toLocaleString();
        Game.dom.statDef.textContent = Game.data.defense.toLocaleString();
        Game.dom.statCrit.textContent = '5%';

        var maxVal = Math.max(Game.data.hp, Game.data.attack * 3, Game.data.defense * 5, 1);
        Game.dom.hpBar.style.width = Math.min(100, (Game.data.hp / maxVal) * 100) + '%';
        Game.dom.atkBar.style.width = Math.min(100, (Game.data.attack * 3 / maxVal) * 100) + '%';
        Game.dom.defBar.style.width = Math.min(100, (Game.data.defense * 5 / maxVal) * 100) + '%';
    },

    /** 更新经验条 */
    updateExpBar: function () {
        if (this.isMaxRealm()) {
            Game.dom.expBarInner.style.width = '100%';
            Game.dom.expText.textContent = '已臻圆满';
            return;
        }

        var required = this.getRequiredExp();
        var pct = Math.min(100, (Game.data.experience / required) * 100);
        Game.dom.expBarInner.style.width = pct + '%';
        Game.dom.expText.textContent = Game.data.experience.toLocaleString() + ' / ' + required.toLocaleString();
    }

};