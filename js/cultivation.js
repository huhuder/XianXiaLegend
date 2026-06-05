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

        var method = Game.data.cultivateMethod || 'dazuo';
        var mult = getRealmMultiplier(Game.data.realmIndex);

        // 天赋加成
        var talentCultSpeed = (typeof Talents !== 'undefined' && Talents.getCultSpeedBonus) ? Talents.getCultSpeedBonus() : 0;
        var talentExpBonus = (typeof Talents !== 'undefined' && Talents.getExpBonusRate) ? Talents.getExpBonusRate() : 0;
        var talentSpiritBonus = (typeof Talents !== 'undefined' && Talents.getSpiritBonusRate) ? Talents.getSpiritBonusRate() : 0;

        // 基础修炼速度加成（装备+飞升+天赋）
        var totalCultSpeed = 1 + Ascension.getCultivateSpeedBonus() + getEquipCultSpeed() / 100 + talentCultSpeed / 100;

        // 修炼基础收益提升（让修炼回到有意义的水平——约战斗的30%）
        var expBaseMult = 3.0;  // 修炼主产出经验
        var stoneBaseMult = 3.0;  // 修炼也产灵石

        var expGain = 0;
        var stoneGain = 0;
        var methodLabel = '';

        switch (method) {
            case 'dazuo':  // 🧘 打坐 — 稳定收益（比战斗高30%效率，但不出装备）
                expGain = Math.floor(mult * randInt(3, 8) * expBaseMult * totalCultSpeed * (1 + talentExpBonus));
                stoneGain = mult * randInt(2, 5) * stoneBaseMult;
                stoneGain = Math.floor(stoneGain * (1 + talentSpiritBonus));
                methodLabel = '打坐';
                break;

            case 'lilian':  // ⚡ 历练 — 消耗灵石，高倍经验
                var stoneCost = mult * randInt(5, 12);
                if (Game.data.spiritStones < stoneCost) {
                    showToast('灵石不足，无法历练！需要 ' + stoneCost + ' 灵石', 2000);
                    return;
                }
                Game.data.spiritStones -= stoneCost;
                expGain = Math.floor(mult * randInt(10, 25) * expBaseMult * totalCultSpeed * (1 + talentExpBonus));
                stoneGain = mult * randInt(2, 5);
                stoneGain = Math.floor(stoneGain * (1 + talentSpiritBonus));
                methodLabel = '历练';
                break;

            case 'danyao':  // 💊 丹药 — 消耗灵石激活药效，后续修炼加速
                if (!Game.data.cultivatePillBuff || Game.data.cultivatePillBuff <= 0) {
                    var pillCost = mult * randInt(15, 30);
                    if (Game.data.spiritStones < pillCost) {
                        showToast('灵石不足，无法购买丹药！需要 ' + pillCost + ' 灵石', 2000);
                        return;
                    }
                    Game.data.spiritStones -= pillCost;
                    Game.data.cultivatePillBuff = 8;
                    showToast('服用丹药，接下来8次修炼经验+80%！', 2000);
                    return;
                }
                var pillBonus = 0.8;  // +80%
                expGain = Math.floor(mult * randInt(4, 10) * expBaseMult * totalCultSpeed * (1 + talentExpBonus) * (1 + pillBonus));
                stoneGain = mult * randInt(2, 4);
                stoneGain = Math.floor(stoneGain * (1 + talentSpiritBonus));
                Game.data.cultivatePillBuff = Math.max(0, Game.data.cultivatePillBuff - 1);
                methodLabel = '丹药';
                break;
        }

        // 更新状态
        Game.data.experience += expGain;
        Game.data.spiritStones += stoneGain;
        Game.data.totalCultivations += 1;

        // 宗门任务进度联动
        if (typeof Sect !== 'undefined') {
            Sect.updateTaskProgress('cultivate', 1);
            Sect.updateTaskProgress('stones', stoneGain);
        }

        // 视觉效果 - 不同模式不同颜色
        var color = method === 'dazuo' ? '#ffd700' : (method === 'lilian' ? '#ff8800' : '#2ecc71');
        var dom = Game.dom;
        showCultivateFloat(dom.cultivateBtn, dom.floatTextContainer, expGain, stoneGain, methodLabel, color);

        if (!isAuto || Math.random() < 0.3) {
            spawnParticles(dom.cultivateBtn, randInt(3, 6));
        }

        this.updateAllUI();
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
            triggerGoldenFlash(Game.dom.goldenFlash, REALMS[Game.data.realmIndex], true);
        } else {
            Game.data.layer += 1;
            var curRealm = REALMS[Game.data.realmIndex];
            var layerName = curRealm + '·' + (Game.data.layer + 1) + '层';
            triggerGoldenFlash(Game.dom.goldenFlash, layerName, false);
        }

        // 属性提升
        Game.data.hp += mult * 50;
        Game.data.attack += mult * 20;
        Game.data.defense += mult * 15;

        // 如果在战斗挂机中，立即刷新怪物数值（避免用旧属性打怪）
        if (typeof Battle !== 'undefined' && Battle.active) {
            Battle.respawnAfterBreakthrough();
        }

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
        this.updateGuideCard();  // 引导卡片
        Game.updatePower();
    },

    /** 更新引导卡片内容 */
    updateGuideCard: function () {
        var title = document.getElementById('guide-title');
        var desc = document.getElementById('guide-desc');
        if (!title || !desc) return;

        var d = Game.data;
        var realmName = REALMS[d.realmIndex];
        var expFull = this.isExpFull();
        var maxRealm = this.isMaxRealm();

        // 检查装备情况
        var hasEquipped = false;
        if (d.equipped) {
            for (var ei = 0; ei < d.equipped.length; ei++) {
                if (d.equipped[ei]) { hasEquipped = true; break; }
            }
        }

        // 检查背包是否有装备
        var hasInventory = d.inventory && d.inventory.length > 0;

        // 检查宗门
        var hasSect = d.sectIndex >= 0;

        // 检查灵兽
        var hasBeast = d.capturedBeasts && d.capturedBeasts.length > 0;

        if (maxRealm) {
            title.textContent = '🎉 已臻圆满';
            desc.innerHTML = '已至真仙·十层，万法皆空，道友已证大道！';
            return;
        }

        if (expFull && this.isAscensionThreshold()) {
            title.textContent = '⚡ 天劫将至';
            desc.innerHTML = '渡劫圆满，速往 <span class="warn">飞升</span> 界面引动天劫！';
            return;
        }

        if (expFull) {
            title.textContent = '⬆️ 可突破！';
            desc.innerHTML = '经验已满，点击修炼按钮 <span class="highlight">突破</span> 至下一层！';
            return;
        }

        // 战斗Tab已经有挂机装备提示，这里显示修炼建议
        if (d.realmIndex === 0 && d.layer < 3) {
            title.textContent = '📋 新手引导';
            desc.innerHTML = '点击修炼按钮开始修仙，或切换至 <span class="highlight">战斗</span> 打怪刷装备';
            return;
        }

        if (!hasEquipped && !hasInventory && d.totalCultivations > 5) {
            title.textContent = '⚔️ 缺少装备';
            desc.innerHTML = '去 <span class="highlight">战斗</span> 挂机打怪，可掉落装备提升实力';
            return;
        }

        if (!hasSect && d.realmIndex >= 1) {
            title.textContent = '🏯 加入宗门';
            desc.innerHTML = '修为已达炼气，可前往 <span class="highlight">宗门</span> 加入一方势力';
            return;
        }

        if (!hasBeast && d.realmIndex >= 2) {
            title.textContent = '🐾 捕捉灵兽';
            desc.innerHTML = '已达筑基期，可前往 <span class="highlight">宗门 > 灵兽</span> 捕捉灵兽助战';
            return;
        }

        // 普通状态
        title.textContent = '📋 修行指引';
        desc.innerHTML = '继续 <span class="highlight">修炼</span> 积累经验，或去 <span class="highlight">战斗</span> 刷怪获取灵石装备';
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

    /** 计算有效属性（含所有加成来源，与各战斗函数逻辑一致）
     *  @returns {{ atk: number, def: number, hp: number, critRate: number }}
     */
    getEffectiveStats: function () {
        var d = Game.data;
        var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus) ? Sect.getSectBonus() : { atkPct: 0, defPct: 0, hpPct: 0 };
        var activeBuffs = (typeof Sect !== 'undefined' && Sect.getActiveBuffs) ? Sect.getActiveBuffs() : { atkPct: 0, defPct: 0, hpPct: 0 };
        var talentEff = (typeof Talents !== 'undefined') ? Talents.getEffects() : { atkPct: 0, defPct: 0, hpPct: 0, critRate: 0 };

        var totalAtkPct = sectBonus.atkPct + activeBuffs.atkPct + talentEff.atkPct;
        var totalDefPct = sectBonus.defPct + activeBuffs.defPct + talentEff.defPct;
        var totalHpPct = sectBonus.hpPct + activeBuffs.hpPct + talentEff.hpPct;

        if (typeof Equipment !== 'undefined') {
            var setBonuses = Equipment.getActiveSetBonuses();
            for (var si = 0; si < setBonuses.length; si++) {
                var se = setBonuses[si].effects;
                if (se.atkPct) totalAtkPct += se.atkPct;
                if (se.defPct) totalDefPct += se.defPct;
                if (se.hpPct) totalHpPct += se.hpPct;
            }
        }

        var beastAtk = 0, beastDef = 0, beastHp = 0, beastCrit = 0;
        if (typeof Beast !== 'undefined' && Beast.getActiveBeastBonus) {
            var bb = Beast.getActiveBeastBonus();
            beastAtk = bb.atk || 0;
            beastDef = bb.def || 0;
            beastHp = bb.hp || 0;
            beastCrit = bb.critRate || 0;
        }

        // 暴击率：基础 + 装备 + 套装 + 天赋 + 灵兽
        var critRate = (d.critRate || 0.05);
        if (typeof Equipment !== 'undefined') {
            var eff2 = Equipment.getTotalEquipEffects();
            critRate += (eff2.critRate || 0) / 100;
        }
        critRate += talentEff.critRate / 100 + beastCrit / 100;

        return {
            atk: Math.floor(d.attack * (1 + totalAtkPct / 100)) + beastAtk,
            def: Math.floor(d.defense * (1 + totalDefPct / 100)) + beastDef,
            hp: Math.floor(d.hp * (1 + totalHpPct / 100)) + beastHp,
            critRate: critRate
        };
    },

    /** 更新属性面板 — 显示有效属性（含所有来源加成） */
    updateStatsPanel: function () {
        Game.dom.statLevel.textContent = calcLevel(Game.data.realmIndex, Game.data.layer);

        // 计算有效属性（含所有加成来源，与战斗逻辑一致）
        var eff = this.getEffectiveStats();
        Game.dom.statHp.textContent = eff.hp.toLocaleString();
        Game.dom.statAtk.textContent = eff.atk.toLocaleString();
        Game.dom.statDef.textContent = eff.def.toLocaleString();
        Game.dom.statCrit.textContent = (eff.critRate * 100).toFixed(1) + '%';

        var maxVal = Math.max(eff.hp, eff.atk * 3, eff.def * 5, 1);
        Game.dom.hpBar.style.width = Math.min(100, (eff.hp / maxVal) * 100) + '%';
        Game.dom.atkBar.style.width = Math.min(100, (eff.atk * 3 / maxVal) * 100) + '%';
        Game.dom.defBar.style.width = Math.min(100, (eff.def * 5 / maxVal) * 100) + '%';

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

        // 也检查是否有灵兽出战加成（11-4批）
        if (!hasEffects && typeof Beast !== 'undefined' && Beast.getActiveBeastBonus) {
            var bb = Beast.getActiveBeastBonus();
            hasEffects = bb.atk > 0 || bb.hp > 0 || bb.def > 0 || bb.critRate > 0;
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

        // 灵兽出战加成（11-4批）
        var beastBonus = null;
        var beastName = '';
        if (typeof Beast !== 'undefined' && Beast.getActiveBeastBonus) {
            beastBonus = Beast.getActiveBeastBonus();
            if (Game.data.activeBeastIdx !== undefined && Game.data.activeBeastIdx >= 0 &&
                Game.data.activeBeastIdx < Game.data.capturedBeasts.length) {
                beastName = Game.data.capturedBeasts[Game.data.activeBeastIdx].name;
            }
        }

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
            // 灵兽暴击率加成并入总值
            if (a.key === 'critRate' && beastBonus && beastBonus.critRate > 0) {
                total += beastBonus.critRate;
            }

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

        // 灵兽出战加成行
        if (beastBonus && (beastBonus.atk > 0 || beastBonus.hp > 0 || beastBonus.def > 0 || beastBonus.critRate > 0)) {
            html += '<div class="beast-bonus-row" style="margin-top:8px;padding:4px 8px;' +
                'background:rgba(192,132,252,0.08);border:1px solid rgba(192,132,252,0.2);border-radius:6px;' +
                'font-size:12px;color:var(--text-primary);">' +
                '<span style="color:#c084fc;font-weight:bold;">【灵兽加成】</span>' +
                '<span style="color:#c084fc;margin-left:4px;">' + beastName + '</span>' +
                (beastBonus.atk > 0 ? ' <span style="color:var(--atk-color);">攻击+' + beastBonus.atk + '</span>' : '') +
                (beastBonus.hp > 0 ? ' <span style="color:var(--hp-color);"> 生命+' + beastBonus.hp + '</span>' : '') +
                (beastBonus.def > 0 ? ' <span style="color:var(--def-color);"> 防御+' + beastBonus.def + '</span>' : '') +
                (beastBonus.critRate > 0 ? ' <span style="color:var(--gold-highlight);"> 暴击率+' + beastBonus.critRate + '%</span>' : '') +
                '</div>';
        }

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