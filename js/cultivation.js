/* ============================================================
   js/cultivation.js — 修炼系统
   依赖 Game.data（状态）和 Game.dom（DOM 引用）
   依赖 utils.js 和 components.js 中的全局函数
   ============================================================ */

/**
 * 汇总装备和套装的修炼速度加成（委托到 Equipment 统一入口）
 * @returns {number} 修炼速度总值
 */
function getEquipCultSpeed() {
    if (typeof Equipment !== 'undefined' && Equipment.getTotalEquipEffects) {
        return Equipment.getTotalEquipEffects().cultSpeed || 0;
    }
    return 0;
}

/**
 * 汇总装备和套装的暴击率（委托到 Equipment 统一入口）
 * @returns {number} 实际暴击率（百分比整数，如5、15、23）
 */
function getTotalCritRate() {
    var total = 5; // 基础5%
    if (typeof Equipment !== 'undefined' && Equipment.getTotalEquipEffects) {
        total += Equipment.getTotalEquipEffects().critRate || 0;
    }
    return total;
}

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

    /** 检查是否已达凡人修炼终点（渡劫·十层，需飞升） */
    isMaxRealm: function () {
        return isMaxRealm(Game.data.realmIndex, Game.data.layer);
    },

    /** 检查是否到达飞升门槛（渡劫·十层） */
    isAscensionThreshold: function () {
        return Game.data.realmIndex >= REALMS.length - 2 && Game.data.layer >= 9;
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

        // 天赋修炼速度和经验加成
        var talentCultSpeed = (typeof Talents !== 'undefined' && Talents.getCultSpeedBonus) ? Talents.getCultSpeedBonus() : 0;
        var talentExpBonus = (typeof Talents !== 'undefined' && Talents.getExpBonusRate) ? Talents.getExpBonusRate() : 0;

        var totalCultSpeed = 1 + Ascension.getCultivateSpeedBonus() + getEquipCultSpeed() / 100 + talentCultSpeed / 100;
        var expGain = Math.floor(baseExp * totalCultSpeed * (1 + talentExpBonus));
        var stoneGain = mult * randInt(1, 2);

        // 天赋灵石加成
        var talentSpiritBonus = (typeof Talents !== 'undefined' && Talents.getSpiritBonusRate) ? Talents.getSpiritBonusRate() : 0;
        stoneGain = Math.floor(stoneGain * (1 + talentSpiritBonus));

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
        if (this.isAscensionThreshold()) {
            showToast('渡劫圆满！请前往飞升界面引动天劫。', 3000);
            Game.switchTab('ascend');
            return;
        }
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

        // 飞升门槛（渡劫圆满） + 经验满 → 渡劫飞升
        if (this.isAscensionThreshold() && this.isExpFull()) {
            btn.classList.add('breakthrough');
            btn.disabled = false;
            label.textContent = '渡劫飞升';
            return;
        }

        // 真仙·十层 → 圆满
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
        Game.dom.statCrit.textContent = getTotalCritRate() + '%';

        var maxVal = Math.max(Game.data.hp, Game.data.attack * 3, Game.data.defense * 5, 1);
        Game.dom.hpBar.style.width = Math.min(100, (Game.data.hp / maxVal) * 100) + '%';
        Game.dom.atkBar.style.width = Math.min(100, (Game.data.attack * 3 / maxVal) * 100) + '%';
        Game.dom.defBar.style.width = Math.min(100, (Game.data.defense * 5 / maxVal) * 100) + '%';

        // 详细附加属性 — 如果有装备效果则显示入口
        this.toggleDetailSection();
    },

    /** 检测装备效果 — 有则显示「查看详细属性」入口，无则隐藏 */
    toggleDetailSection: function () {
        var section = document.getElementById('detail-stats-section');
        if (!section) return;

        var effects = null;
        if (typeof Equipment !== 'undefined' && Equipment.getTotalEquipEffects) {
            effects = Equipment.getTotalEquipEffects();
        }

        // 检查是否任何非零装备效果
        var hasEffects = false;
        if (effects) {
            var keys = Object.keys(effects);
            for (var i = 0; i < keys.length; i++) {
                if (effects[keys[i]] > 0) { hasEffects = true; break; }
            }
        }

        // 也检查是否有套装激活
        var activeSets = [];
        if (!hasEffects && typeof Equipment !== 'undefined' && Equipment.getActiveSetBonuses) {
            activeSets = Equipment.getActiveSetBonuses();
            hasEffects = activeSets.length > 0;
        }

        section.style.display = hasEffects ? 'block' : 'none';

        // 如果当前已展开，刷新内容
        var content = document.getElementById('detail-stats-content');
        var btn = document.getElementById('detail-stats-toggle');
        if (content && btn && content.style.display !== 'none') {
            this.renderDetailStats(effects, activeSets);
        }
    },

    /** 渲染详细属性列表 */
    renderDetailStats: function (effects, activeSets) {
        var content = document.getElementById('detail-stats-content');
        if (!content) return;

        if (!effects && typeof Equipment !== 'undefined' && Equipment.getTotalEquipEffects) {
            effects = Equipment.getTotalEquipEffects();
        }
        if (!activeSets && typeof Equipment !== 'undefined' && Equipment.getActiveSetBonuses) {
            activeSets = Equipment.getActiveSetBonuses();
        }

        // 属性定义：key, name, base(0=无基础值), isPercent
        var attrs = [
            { key: 'critRate',    name: '暴击率',      base: 5,  unit: '%' },
            { key: 'dodgeRate',   name: '闪避率',      base: 0,  unit: '%' },
            { key: 'lifesteal',   name: '吸血率',      base: 0,  unit: '%' },
            { key: 'bossDmg',     name: 'Boss增伤',    base: 0,  unit: '%' },
            { key: 'counterRate', name: '反击率',      base: 0,  unit: '%' },
            { key: 'expBonus',    name: '经验加成',    base: 0,  unit: '%' },
            { key: 'spiritBonus', name: '灵石加成',    base: 0,  unit: '%' },
            { key: 'cultSpeed',   name: '修炼速度',    base: 0,  unit: '%' },
            { key: 'killHealPct', name: '击杀回复',    base: 0,  unit: '%' },
            { key: 'extraDmgChance', name: '额外伤害触发', base: 0, unit: '%' },
            { key: 'extraDmgPct', name: '额外伤害倍率', base: 0, unit: '%' },
            { key: 'dmgReduceChance', name: '减伤触发', base: 0, unit: '%' },
            { key: 'dmgReducePct', name: '减伤比例',   base: 0,  unit: '%' }
        ];

        var html = '<table class="detail-stats-table"><thead><tr>' +
            '<th>属性</th><th>基础值</th><th>装备加成</th><th>套装加成</th><th>总值</th>' +
            '</tr></thead><tbody>';

        for (var i = 0; i < attrs.length; i++) {
            var a = attrs[i];
            var equipVal = (effects && effects[a.key]) ? effects[a.key] : 0;

            // 套装中该属性的贡献
            var setVal = 0;
            if (activeSets) {
                for (var s = 0; s < activeSets.length; s++) {
                    if (activeSets[s].effects && activeSets[s].effects[a.key]) {
                        setVal += activeSets[s].effects[a.key];
                    }
                }
            }

            // 装备独有（扣除套装部分）——但实际上 getTotalEquipEffects 已包含套装，所以这里 equipVal 就是装备+套装总和
            // 需要重新只统计装备本身
            var equipOnly = equipVal - setVal;
            if (equipOnly < 0) equipOnly = 0;

            var total = a.base + equipVal;

            if (total > 0 || a.key === 'critRate') {
                html += '<tr>' +
                    '<td class="ds-name">' + a.name + '</td>' +
                    '<td class="ds-base">' + a.base + a.unit + '</td>' +
                    '<td class="ds-equip">' + (equipOnly > 0 ? '+' + equipOnly + a.unit : '—') + '</td>' +
                    '<td class="ds-set">' + (setVal > 0 ? '+' + setVal + a.unit : '—') + '</td>' +
                    '<td class="ds-total">' + total + a.unit + '</td>' +
                    '</tr>';
            }
        }

        html += '</tbody></table>';

        // 套装信息
        if (activeSets && activeSets.length > 0) {
            html += '<div class="active-sets-info">';
            for (var b = 0; b < activeSets.length; b++) {
                html += '<div class="active-set-tag">套装：' + activeSets[b].setName + '</div>';
            }
            html += '</div>';
        }

        content.innerHTML = html;
    },

    /** 初始化详细属性面板的事件监听 */
    initDetailStats: function () {
        var btn = document.getElementById('detail-stats-toggle');
        if (!btn || btn._detailInit) return;
        btn._detailInit = true;

        btn.addEventListener('click', function () {
            var content = document.getElementById('detail-stats-content');
            if (!content) return;
            var isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'block' : 'none';
            btn.textContent = isHidden ? '收起详细属性 ▲' : '查看详细属性 ▼';

            if (isHidden) {
                Cultivation.renderDetailStats();
            }
        });
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