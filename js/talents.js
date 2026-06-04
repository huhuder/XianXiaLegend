/* ============================================================
   js/talents.js — 天赋系统
   依赖 Game.data（状态）、utils.js
   ============================================================ */

var Talents = {

    /* ----------------------------------------------------------
       天赋树定义：三维 × 10层
       cost = 升到此层所需天赋点
       效果在 getEffect() 中定义
       ---------------------------------------------------------- */
    TREES: {
        sword: {
            name: '剑道',
            icon: '⚔',
            desc: '淬炼剑意，精进杀伐',
            color: '#e74c3c',
            levels: [
                { cost: 1,  name: '剑心初成',  short: '攻击+5%' },
                { cost: 1,  name: '剑意凝实',  short: '攻击+10%' },
                { cost: 2,  name: '剑势凌厉',  short: '暴击率+3%' },
                { cost: 2,  name: '剑气纵横',  short: '攻击+20%' },
                { cost: 3,  name: '剑胆琴心',  short: '暴击伤害+25%' },
                { cost: 3,  name: '剑破苍穹',  short: '攻击+35%' },
                { cost: 4,  name: '剑开天门',  short: '暴击率+5%' },
                { cost: 4,  name: '剑灭万法',  short: '攻击+50%' },
                { cost: 5,  name: '剑道通神',  short: '暴击伤害+50%' },
                { cost: 5,  name: '无上剑域',  short: '攻击+70%·暴击回血' }
            ]
        },
        body: {
            name: '体道',
            icon: '🛡',
            desc: '铸就不朽，以身证道',
            color: '#2ecc71',
            levels: [
                { cost: 1,  name: '炼皮锻骨',  short: '生命+5%' },
                { cost: 1,  name: '百炼成钢',  short: '生命+10%' },
                { cost: 2,  name: '铜皮铁骨',  short: '防御+10%' },
                { cost: 2,  name: '金刚不坏',  short: '生命+20%' },
                { cost: 3,  name: '万法不侵',  short: '伤害减免5%' },
                { cost: 3,  name: '肉身成圣',  short: '生命+35%' },
                { cost: 4,  name: '不朽神躯',  short: '防御+25%' },
                { cost: 4,  name: '不灭金身',  short: '生命+50%' },
                { cost: 5,  name: '万劫不朽',  short: '伤害减免10%' },
                { cost: 5,  name: '大道真身',  short: '生命+80%·回合回血' }
            ]
        },
        qi: {
            name: '气道',
            icon: '🌀',
            desc: '贯通天地，灵气自涌',
            color: '#3498db',
            levels: [
                { cost: 1,  name: '吐纳导引',  short: '修炼速度+10%' },
                { cost: 1,  name: '灵气感应',  short: '修炼速度+20%' },
                { cost: 2,  name: '丹田扩充',  short: '灵石获取+15%' },
                { cost: 2,  name: '周天循环',  short: '修炼速度+35%' },
                { cost: 3,  name: '天人合一',  short: '经验获取+20%' },
                { cost: 3,  name: '灵气化液',  short: '修炼速度+55%' },
                { cost: 4,  name: '金丹大道',  short: '灵石获取+25%' },
                { cost: 4,  name: '元神灵动',  short: '修炼速度+80%' },
                { cost: 5,  name: '破碎虚空',  short: '经验获取+40%' },
                { cost: 5,  name: '道法自然',  short: '修炼+120%·飞升+1点' }
            ]
        }
    },

    /* ----------------------------------------------------------
       获取某一天赋树的当前层数
       ---------------------------------------------------------- */
    getLevel: function (treeKey) {
        var d = Game.data;
        if (!d.talents || !d.talents[treeKey]) return 0;
        return d.talents[treeKey];
    },

    /* ----------------------------------------------------------
       获取可用天赋点数
       ---------------------------------------------------------- */
    getAvailablePoints: function () {
        return Game.data.talentPoints || 0;
    },

    /* ----------------------------------------------------------
       计算升到指定层数总共需要的天赋点
       @param {string} treeKey - sword/body/qi
       @param {number} targetLevel - 目标层数 0~10
       ---------------------------------------------------------- */
    getTotalCost: function (treeKey, targetLevel) {
        var tree = this.TREES[treeKey];
        if (!tree) return 0;
        var total = 0;
        for (var i = 0; i < targetLevel; i++) {
            total += tree.levels[i].cost;
        }
        return total;
    },

    /* ----------------------------------------------------------
       检查是否可以升级
       ---------------------------------------------------------- */
    canUpgrade: function (treeKey) {
        var curLevel = this.getLevel(treeKey);
        if (curLevel >= 10) return false;
        var nextCost = this.TREES[treeKey].levels[curLevel].cost;
        return this.getAvailablePoints() >= nextCost;
    },

    /* ----------------------------------------------------------
       获取三维天赋已消耗的总点数
       ---------------------------------------------------------- */
    getTotalSpent: function () {
        var total = 0;
        var keys = ['sword', 'body', 'qi'];
        for (var i = 0; i < keys.length; i++) {
            total += this.getTotalCost(keys[i], this.getLevel(keys[i]));
        }
        return total;
    },

    /* ----------------------------------------------------------
       升级天赋
       ---------------------------------------------------------- */
    upgrade: function (treeKey) {
        var curLevel = this.getLevel(treeKey);
        if (curLevel >= 10) {
            showToast('已达最高境界，无法继续提升！', 2000);
            return false;
        }

        var nextCost = this.TREES[treeKey].levels[curLevel].cost;
        if (this.getAvailablePoints() < nextCost) {
            showToast('天赋点不足！需要 ' + nextCost + ' 点，当前剩余 ' + this.getAvailablePoints() + ' 点', 2000);
            return false;
        }

        Game.data.talentPoints -= nextCost;
        Game.data.talents[treeKey] = curLevel + 1;
        Game.saveGame();

        var levelInfo = this.TREES[treeKey].levels[curLevel];
        showToast('「' + levelInfo.name + '」解锁！' + levelInfo.short, 2000);
        return true;
    },

    /* ----------------------------------------------------------
       增加天赋点（飞升时调用）
       ---------------------------------------------------------- */
    addPoints: function (points) {
        Game.data.talentPoints = (Game.data.talentPoints || 0) + points;
        // 气道10层额外+1
        if (this.getLevel('qi') >= 10) {
            Game.data.talentPoints += 1;
        }
    },

    /* ----------------------------------------------------------
       获取所有天赋的汇总效果（用于战斗/修炼计算）
       @returns {object} { atkPct, hpPct, defPct, critRate, critDmg, dmgReduce,
                           cultSpeed, expBonus, spiritBonus, lifestealOnCrit,
                           regenPerTick }
       ---------------------------------------------------------- */
    getEffects: function () {
        var eff = {
            atkPct: 0, hpPct: 0, defPct: 0,
            critRate: 0, critDmg: 0, dmgReduce: 0,
            cultSpeed: 0, expBonus: 0, spiritBonus: 0,
            lifestealOnCrit: 0, regenPerTick: 0
        };

        // 剑道
        var swLv = this.getLevel('sword');
        var swordAtkPct = [0, 5, 10, 10, 20, 20, 35, 35, 50, 50, 70];
        var swordCritRate = [0, 0, 0, 3, 3, 3, 3, 5, 5, 5, 5];
        var swordCritDmg = [0, 0, 0, 0, 0, 25, 25, 25, 25, 50, 50];
        if (swLv >= 1) { eff.atkPct = swordAtkPct[swLv]; eff.critRate = swordCritRate[swLv]; eff.critDmg = swordCritDmg[swLv]; }
        if (swLv >= 10) { eff.lifestealOnCrit = 5; }

        // 体道
        var bdLv = this.getLevel('body');
        var bodyHpPct = [0, 5, 10, 10, 20, 20, 35, 35, 50, 50, 80];
        var bodyDefPct = [0, 0, 0, 10, 10, 10, 10, 25, 25, 25, 25];
        var bodyDmgReduce = [0, 0, 0, 0, 0, 5, 5, 5, 5, 10, 10];
        if (bdLv >= 1) { eff.hpPct = bodyHpPct[bdLv]; eff.defPct = bodyDefPct[bdLv]; eff.dmgReduce = bodyDmgReduce[bdLv]; }
        if (bdLv >= 10) { eff.regenPerTick = 2; }

        // 气道
        var qiLv = this.getLevel('qi');
        var qiCultSpeed = [0, 10, 20, 20, 35, 35, 55, 55, 80, 80, 120];
        var qiExpBonus = [0, 0, 0, 0, 0, 20, 20, 20, 20, 40, 40];
        var qiSpiritBonus = [0, 0, 0, 15, 15, 15, 15, 25, 25, 25, 25];
        if (qiLv >= 1) { eff.cultSpeed = qiCultSpeed[qiLv]; eff.expBonus = qiExpBonus[qiLv]; eff.spiritBonus = qiSpiritBonus[qiLv]; }

        return eff;
    },

    /* ----------------------------------------------------------
       获取修炼速度加成（百分比整数）
       ---------------------------------------------------------- */
    getCultSpeedBonus: function () {
        return this.getEffects().cultSpeed;
    },

    /* ----------------------------------------------------------
       获取经验加成率（0~1 小数）
       ---------------------------------------------------------- */
    getExpBonusRate: function () {
        return this.getEffects().expBonus / 100;
    },

    /* ----------------------------------------------------------
       获取灵石加成率（0~1 小数）
       ---------------------------------------------------------- */
    getSpiritBonusRate: function () {
        return this.getEffects().spiritBonus / 100;
    },

    /* ----------------------------------------------------------
       渲染天赋页面
       ---------------------------------------------------------- */
    render: function () {
        var container = document.getElementById('talents-content');
        if (!container) return;

        var available = this.getAvailablePoints();
        var html = '';

        // 天赋点余额
        html += '<div class="talents-points">' +
            '<span class="talents-points-label">可用天赋点</span>' +
            '<span class="talents-points-value">' + available + '</span>' +
            '</div>';

        // 三维子Tab切换
        var keys = ['sword', 'body', 'qi'];
        var activeTree = this._activeTree || 'sword';
        html += '<div class="talent-sub-tabs">';
        for (var i = 0; i < keys.length; i++) {
            var tree = this.TREES[keys[i]];
            var lv = this.getLevel(keys[i]);
            var isActive = keys[i] === activeTree;
            html += '<button class="talent-sub-tab-btn' + (isActive ? ' active' : '') + '"' +
                ' data-tree="' + keys[i] + '"' +
                ' style="' + (isActive ? 'border-color:' + tree.color + ';color:' + tree.color : '') + '"' +
                '>' + tree.icon + ' ' + tree.name + ' Lv.' + lv + '/10</button>';
        }
        html += '</div>';

        // 只渲染当前激活的天赋树
        var tree = this.TREES[activeTree];
        var lv = this.getLevel(activeTree);
        var maxLv = 10;

        html += '<div class="talent-tree-card" style="border-color:' + tree.color + '">' +
            '<div class="talent-tree-header" style="color:' + tree.color + '">' +
            tree.icon + ' ' + tree.name + ' <span class="talent-tree-level">Lv.' + lv + '/' + maxLv + '</span>' +
            '</div>' +
            '<div class="talent-tree-desc">' + tree.desc + '</div>';

        // 层级列表
        html += '<div class="talent-levels">';
        for (var j = 0; j < maxLv; j++) {
            var levelDef = tree.levels[j];
            var unlocked = lv > j;
            var isCurrent = lv === j;

            var cls = 'talent-node';
            if (unlocked) cls += ' unlocked';
            if (isCurrent) cls += ' current';
            if (!unlocked && !isCurrent) cls += ' locked';

            html += '<div class="' + cls + '" style="border-color:' + tree.color + '">' +
                '<div class="talent-node-num">' + (j + 1) + '</div>' +
                '<div class="talent-node-info">' +
                '<div class="talent-node-name">' + levelDef.name + '</div>' +
                '<div class="talent-node-effect">' + levelDef.short + '</div>' +
                '</div>';

            if (isCurrent && lv < maxLv) {
                html += '<button class="talent-upgrade-btn" style="background:' + tree.color + '"' +
                    ' onclick="Talents.upgrade(\'' + activeTree + '\');Talents.render();Game.updatePower();Cultivation.updateAllUI();"' +
                    '>' + levelDef.cost + ' 点</button>';
            } else if (unlocked) {
                html += '<span class="talent-check">✓</span>';
            } else {
                html += '<span class="talent-cost-locked">' + levelDef.cost + '</span>';
            }

            html += '</div>';
        }
        html += '</div></div>';

        // 满级提示
        if (this.getLevel('sword') === 10 && this.getLevel('body') === 10 && this.getLevel('qi') === 10) {
            html += '<div class="talent-max-hint">✨ 三脉圆满，大道已成！</div>';
        }

        container.innerHTML = html;

        // 绑定子Tab事件
        var self = this;
        var subBtns = container.querySelectorAll('.talent-sub-tab-btn');
        for (var k = 0; k < subBtns.length; k++) {
            subBtns[k].addEventListener('click', function () {
                self._activeTree = this.getAttribute('data-tree');
                self.render();
            });
        }
    }

};
