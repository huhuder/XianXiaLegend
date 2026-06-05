/* ============================================================
   js/equipment.js — 装备系统
   依赖 Game.data / utils.js / components.js
   第2批：装备掉落、背包管理、装备/卸下
   ============================================================ */

var Equipment = {

    // ========== 装备层级（Tier） ==========
    // 每个境界一张地图，一套专属装备
    EQUIP_TIERS: [
        {
            realm: '凡人', series: '凡铁',
            names: ['铁剑','布巾','布衣','草鞋','铜环','石坠'],
            atk: [3,8], def: [2,6], hp: [15,40],
            qRates: [65, 25, 8, 1.5, 0.4, 0.1]
        },
        {
            realm: '炼气', series: '灵器',
            names: ['灵风剑','灵光冠','灵纹袍','灵羽靴','灵韵戒','灵心坠'],
            atk: [18,30], def: [12,22], hp: [80,150],
            qRates: [55, 28, 12, 3.5, 1.2, 0.3]
        },
        {
            realm: '筑基', series: '法宝',
            names: ['天罡剑','天罡冠','天罡铠','天罡靴','天罡戒','天罡坠'],
            atk: [40,70], def: [28,50], hp: [180,320],
            qRates: [45, 30, 16, 6, 2.5, 0.5]
        },
        {
            realm: '金丹', series: '仙器',
            names: ['诛仙剑','诛仙冠','诛仙铠','诛仙靴','诛仙戒','诛仙坠'],
            atk: [85,150], def: [60,110], hp: [380,680],
            qRates: [35, 30, 18, 10, 5.5, 1.5]
        },
        {
            realm: '元婴', series: '圣器',
            names: ['盘古斧','盘古冠','开天铠','破碎靴','盘古戒','起源坠'],
            atk: [180,320], def: [130,240], hp: [800,1450],
            qRates: [28, 28, 20, 14, 8, 2]
        },
        {
            realm: '化神', series: '荒器',
            names: ['裂荒斧','荒神冠','荒古铠','踏荒靴','荒天戒','荒元坠'],
            atk: [380,680], def: [280,500], hp: [1700,3100],
            qRates: [22, 25, 22, 18, 10, 3]
        },
        {
            realm: '合体', series: '星器',
            names: ['星辰剑','星辉冠','星河铠','星痕靴','星芒戒','星云坠'],
            atk: [800,1450], def: [600,1050], hp: [3600,6500],
            qRates: [18, 22, 25, 20, 12, 3]
        },
        {
            realm: '大乘', series: '轮回器',
            names: ['轮回剑','轮回冠','轮回铠','轮回靴','轮回戒','轮回坠'],
            atk: [1700,3100], def: [1300,2300], hp: [7500,14000],
            qRates: [15, 20, 25, 22, 14, 4]
        },
        {
            realm: '渡劫', series: '混沌器',
            names: ['混沌刃','混沌冠','混沌甲','混沌靴','混沌戒','混沌坠'],
            atk: [3600,6500], def: [2700,5000], hp: [16000,30000],
            qRates: [12, 18, 25, 24, 16, 5]
        },
        {
            realm: '真仙', series: '天道器',
            names: ['天道剑','天道冠','天道铠','天道靴','天道戒','天道坠'],
            atk: [7500,14000], def: [5500,10000], hp: [35000,65000],
            qRates: [10, 15, 25, 25, 18, 7]
        }
    ],

    /* ----------------------------------------------------------
       装备品质常量
       ---------------------------------------------------------- */
    QUALITIES: [
        { name: '凡品', color: '#cccccc', rate: 0.60,  mult: 1.0 },
        { name: '良品', color: '#00ff88', rate: 0.25,  mult: 1.5 },
        { name: '上品', color: '#3399ff', rate: 0.10,  mult: 2.5 },
        { name: '极品', color: '#cc33ff', rate: 0.035, mult: 4.0 },
        { name: '仙品', color: '#ff8800', rate: 0.013, mult: 7.0 },
        { name: '神器', color: '#ff2222', rate: 0.002, mult: 12.0 },
    ],

    /* ----------------------------------------------------------
       槽位定义
       ---------------------------------------------------------- */
    SLOTS: [
        { name: '武器', icon: '⚔️' },
        { name: '头盔', icon: '👑' },
        { name: '衣服', icon: '👘' },
        { name: '戒指', icon: '💍' },
        { name: '项链', icon: '📿' },
        { name: '鞋子', icon: '👢' },
    ],

    /* ----------------------------------------------------------
       套装系统定义（4套，每套6件，覆盖全部槽位）
       ---------------------------------------------------------- */
    SETS: [
        {
            name: '青龙',
            slots: ['青龙刃', '青龙冠', '青龙袍', '青龙戒', '青龙坠', '青龙靴'],
            setBonuses: [
                { count: 2, desc: '攻击+15%',  effects: { atkPct: 15 } },
                { count: 4, desc: '暴击率+10%', effects: { critRate: 10 } },
                { count: 6, desc: '攻击时20%概率附带一次额外伤害（值为攻击的50%）', effects: { extraDmgPct: 50 } },
            ],
        },
        {
            name: '玄武',
            slots: ['玄武剑', '玄武盔', '玄武甲', '玄武环', '玄武珞', '玄武履'],
            setBonuses: [
                { count: 2, desc: '防御+15%',  effects: { defPct: 15 } },
                { count: 4, desc: '闪避率+8%', effects: { dodgeRate: 8 } },
                { count: 6, desc: '受击时15%概率减免50%伤害', effects: { dmgReducePct: 50, dmgReduceChance: 15 } },
            ],
        },
        {
            name: '朱雀',
            slots: ['朱雀锋', '朱雀翎', '朱雀羽', '朱雀印', '朱雀佩', '朱雀翼'],
            setBonuses: [
                { count: 2, desc: '生命+15%',  effects: { hpPct: 15 } },
                { count: 4, desc: '吸血+8%',   effects: { lifesteal: 8 } },
                { count: 6, desc: '击杀怪物时回复20%生命', effects: { killHealPct: 20 } },
            ],
        },
        {
            name: '白虎',
            slots: ['白虎斩', '白虎额', '白虎铠', '白虎玦', '白虎坠', '白虎踏'],
            setBonuses: [
                { count: 2, desc: '经验+15%',     effects: { expBonus: 15 } },
                { count: 4, desc: '灵石+15%',     effects: { spiritBonus: 15 } },
                { count: 6, desc: '修炼速度+20%',  effects: { cultSpeed: 20 } },
            ],
        },
    ],

    /* 装备生成时带套装的概率（30%） */
    SET_CHANCE: 0.30,

    /* ----------------------------------------------------------
       特殊效果常量
       ---------------------------------------------------------- */
    EFFECTS: [
        { name: '暴击率',   key: 'critRate',   min: 2,  max: 8,   desc: '+%d%暴击率' },
        { name: '闪避率',   key: 'dodgeRate',  min: 2,  max: 6,   desc: '+%d%概率闪避' },
        { name: '吸血',     key: 'lifesteal',   min: 3,  max: 10,  desc: '伤害的%d%转化为生命' },
        { name: '经验加成', key: 'expBonus',    min: 5,  max: 20,  desc: '获得经验+%d%' },
        { name: '灵石加成', key: 'spiritBonus', min: 5,  max: 20,  desc: '获得灵石+%d%' },
        { name: '修炼速度', key: 'cultSpeed',   min: 5,  max: 15,  desc: '修炼速度+%d%' },
        { name: 'BOSS增伤', key: 'bossDmg',    min: 10, max: 30,  desc: '对BOSS伤害+%d%' },
        { name: '反击',     key: 'counterRate', min: 10, max: 25,  desc: '受击时%d%概率反击' },
    ],

    /* 品质对应的效果数量：[最小, 最大] */
    QUALITY_EFFECT_COUNT: [
        0,  // 凡品
        1,  // 良品
        1,  // 上品
        2,  // 极品（1~2）
        2,  // 仙品
        3,  // 神器（2~3）
    ],

    /* ----------------------------------------------------------
       名称词库
       ---------------------------------------------------------- */
    WORD_BANK: {
        0: ['青冥剑', '紫电剑', '玄铁剑', '龙骨刃', '赤霄', '太阿'],
        1: ['紫金冠', '星辰冠', '龙鳞盔', '凤翅冠'],
        2: ['天蚕衣', '玄武甲', '金缕衣', '流云袍'],
        3: ['乾坤戒', '须弥戒', '灵犀戒'],
        4: ['玉龙坠', '星辰链'],
        5: ['踏云靴', '追风履'],
    },

    /** 装备自增 ID */
    nextId: 1,

    /* ----------------------------------------------------------
       生成随机装备
       @param {number} mapIndex - 地图索引
       ---------------------------------------------------------- */
    generateEquip: function (mapIndex) {
        var tierIndex = mapIndex;
        var tier = this.EQUIP_TIERS[tierIndex];

        // 随机品质（按 Tier 品质率）
        var qualityIndex = 0;
        var roll = Math.random() * 100;
        var cumulative = 0;
        for (var i = 0; i < tier.qRates.length; i++) {
            cumulative += tier.qRates[i];
            if (roll <= cumulative) {
                qualityIndex = i;
                break;
            }
        }

        // 随机槽位
        var slotIndex = randInt(0, 5);
        var quality = this.QUALITIES[qualityIndex];
        var slot = this.SLOTS[slotIndex];

        // 套装判定：约30%概率附带套装标签
        var setName = null;
        var setSlotName = null;
        if (Math.random() < this.SET_CHANCE) {
            var setIdx = randInt(0, this.SETS.length - 1);
            var set = this.SETS[setIdx];
            setName = set.name;
            setSlotName = set.slots[slotIndex];
        }

        // 名称：[品质]·[套装件名] 或 [品质]·[系列][部位名]
        var equipName;
        if (setName && setSlotName) {
            equipName = quality.name + '·' + setSlotName;
        } else {
            equipName = quality.name + '·' + tier.series + tier.names[slotIndex];
            setSlotName = tier.names[slotIndex];
        }

        // 基础属性从 Tier 范围随机 × 品质倍率
        var baseAtk = Math.floor(randInt(tier.atk[0], tier.atk[1]) * quality.mult);
        var baseDef = Math.floor(randInt(tier.def[0], tier.def[1]) * quality.mult);
        var baseHp  = Math.floor(randInt(tier.hp[0], tier.hp[1]) * quality.mult);

        var equip = {
            id: this.nextId++,
            name: equipName,
            quality: qualityIndex,
            slot: slotIndex,
            baseAtk: baseAtk,
            baseDef: baseDef,
            baseHp:  baseHp,
            atk: baseAtk,
            def: baseDef,
            hp:  baseHp,
            enhance: 0,
            tier: tierIndex,
            mapIndex: mapIndex,
            effects: this.rollEffects(qualityIndex),
            setName: setName,
            setSlotName: setSlotName,
        };

        return equip;
    },

    /* ----------------------------------------------------------
       怪物死亡掉落判定（从高品质到低品质依次判定）
       @param {number} mapIndex - 当前地图索引
       ---------------------------------------------------------- */
    rollDrop: function (mapIndex, isBoss) {
        var dropRate = isBoss ? 0.6 : 0.3;
        // 先判定是否触发掉落（普通怪 30%，BOSS 60%）
        if (Math.random() > dropRate) return;

        var tier = this.EQUIP_TIERS[mapIndex];
        var qRates = tier.qRates;
        var totalWeight = 0;
        for (var i = 0; i < qRates.length; i++) {
            totalWeight += qRates[i];
        }
        var roll = Math.random() * totalWeight;
        var cumulative = 0;
        var selectedQuality = -1;
        for (var i = qRates.length - 1; i >= 0; i--) {
            cumulative += qRates[i];
            if (roll < cumulative) {
                selectedQuality = i;
                break;
            }
        }
        if (selectedQuality >= 0) {
            if (Game.data.inventory.length >= 50) {
                showToast('背包已满，无法拾取！', 2000);
                return;
            }
            var equip = this.generateEquipWithQuality(mapIndex, selectedQuality);
            Game.data.inventory.push(equip);
            this.showDropCard(equip);
            Game.saveGame();
        }
    },

    /** 生成指定品质倾向的装备 */
    generateEquipWithQuality: function (mapIndex, targetQuality) {
        var tierIndex = mapIndex;
        var tier = this.EQUIP_TIERS[tierIndex];

        // 目标品质 70% 概率，其余按正态分布
        var qualityIndex;
        var r = Math.random();
        if (r < 0.70) {
            qualityIndex = targetQuality;
        } else if (r < 0.85) {
            qualityIndex = Math.max(0, targetQuality - 1);
        } else if (r < 0.95) {
            qualityIndex = Math.min(this.QUALITIES.length - 1, targetQuality + 1);
        } else {
            qualityIndex = randInt(0, this.QUALITIES.length - 1);
        }

        var slotIndex = randInt(0, 5);
        var quality = this.QUALITIES[qualityIndex];
        var slot = this.SLOTS[slotIndex];

        // 套装判定
        var setName = null;
        var setSlotName = null;
        if (Math.random() < this.SET_CHANCE) {
            var setIdx = randInt(0, this.SETS.length - 1);
            var set = this.SETS[setIdx];
            setName = set.name;
            setSlotName = set.slots[slotIndex];
        }

        var equipName;
        if (setName && setSlotName) {
            equipName = quality.name + '·' + setSlotName;
        } else {
            equipName = quality.name + '·' + tier.series + tier.names[slotIndex];
            setSlotName = tier.names[slotIndex];
        }

        var baseAtk = Math.floor(randInt(tier.atk[0], tier.atk[1]) * quality.mult);
        var baseDef = Math.floor(randInt(tier.def[0], tier.def[1]) * quality.mult);
        var baseHp  = Math.floor(randInt(tier.hp[0], tier.hp[1]) * quality.mult);

        return {
            id: this.nextId++,
            name: equipName,
            quality: qualityIndex,
            slot: slotIndex,
            baseAtk: baseAtk,
            baseDef: baseDef,
            baseHp:  baseHp,
            atk: baseAtk,
            def: baseDef,
            hp:  baseHp,
            enhance: 0,
            tier: tierIndex,
            mapIndex: mapIndex,
            effects: this.rollEffects(qualityIndex),
            setName: setName,
            setSlotName: setSlotName,
        };
    },

    /* ----------------------------------------------------------
       随机生成特殊效果
       @param {number} qualityIndex - 品质索引
       ---------------------------------------------------------- */
    rollEffects: function (qualityIndex) {
        var countRange = this.QUALITY_EFFECT_COUNT[qualityIndex];
        if (countRange <= 0) return [];

        // 品质 → [最小条数, 最大条数]
        var minCount, maxCount;

        if (qualityIndex === 0) { minCount = 0; maxCount = 0; }           // 凡品: 0
        else if (qualityIndex === 1) { minCount = 1; maxCount = 1; }      // 良品: 1
        else if (qualityIndex === 2) { minCount = 1; maxCount = 1; }      // 上品: 1
        else if (qualityIndex === 3) { minCount = 1; maxCount = 2; }      // 极品: 1~2
        else if (qualityIndex === 4) { minCount = 2; maxCount = 2; }      // 仙品: 2
        else if (qualityIndex === 5) { minCount = 2; maxCount = 3; }      // 神器: 2~3
        else { minCount = 0; maxCount = 0; }

        var count = randInt(minCount, maxCount);
        if (count <= 0) return [];

        var qualityMult = this.QUALITIES[qualityIndex].mult;
        var effects = [];
        var pool = this.EFFECTS.slice(); // 复制池子

        for (var i = 0; i < count; i++) {
            if (pool.length === 0) break;
            var idx = randInt(0, pool.length - 1);
            var efDef = pool[idx];
            // 数值 = 随机范围 × 品质倍率，取整
            var rawVal = randInt(efDef.min, efDef.max);
            var val = Math.max(efDef.min, Math.floor(rawVal * qualityMult * 0.5 + rawVal * 0.5));
            effects.push({
                name: efDef.name,
                key: efDef.key,
                value: val,
            });
            // 不允许重复效果
            pool.splice(idx, 1);
        }

        return effects;
    },

    /* ----------------------------------------------------------
       汇总所有已装备装备的特殊效果和套装加成（唯一聚合入口）
       返回对象包含所有战斗/修炼相关数值，供各处统一使用
       @returns {object} { critRate, dodgeRate, lifesteal, bossDmg, counterRate,
                           extraDmgPct, extraDmgChance, dmgReducePct, dmgReduceChance,
                           killHealPct, expBonus, spiritBonus, cultSpeed }
       ---------------------------------------------------------- */
    getTotalEquipEffects: function () {
        var result = {
            critRate: 0, dodgeRate: 0, lifesteal: 0, bossDmg: 0, counterRate: 0,
            extraDmgPct: 0, extraDmgChance: 0, dmgReducePct: 0, dmgReduceChance: 0,
            killHealPct: 0, expBonus: 0, spiritBonus: 0, cultSpeed: 0
        };

        // 遍历已装备的6个槽位
        var equipped = Game.data.equipped;
        for (var i = 0; i < 6; i++) {
            var eq = equipped[i];
            if (eq && eq.effects) {
                for (var j = 0; j < eq.effects.length; j++) {
                    var ef = eq.effects[j];
                    if (result[ef.key] !== undefined) {
                        result[ef.key] += ef.value;
                    }
                }
            }
        }

        // 遍历套装加成
        var bonuses = this.getActiveSetBonuses();
        for (var b = 0; b < bonuses.length; b++) {
            var eff = bonuses[b].effects;
            for (var key in eff) {
                if (result[key] !== undefined) {
                    result[key] += eff[key];
                }
            }
        }

        return result;
    },

    /* ----------------------------------------------------------
       获取当前激活的套装加成
       遍历已装备栏，统计各套装件数，返回所有激活的加成效果
       ---------------------------------------------------------- */
    getActiveSetBonuses: function () {
        var setCounts = {}; // { 套装名: 件数 }
        var equipped = Game.data.equipped;
        for (var i = 0; i < 6; i++) {
            var eq = equipped[i];
            if (eq && eq.setName) {
                if (!setCounts[eq.setName]) {
                    setCounts[eq.setName] = 0;
                }
                setCounts[eq.setName]++;
            }
        }

        var result = []; // [{ setName, count, bonusDesc, effects }]
        var setNameKeys = Object.keys(setCounts);
        for (var s = 0; s < setNameKeys.length; s++) {
            var setName = setNameKeys[s];
            var count = setCounts[setName];

            // 找到对应套装定义
            var setDef = null;
            for (var d = 0; d < this.SETS.length; d++) {
                if (this.SETS[d].name === setName) {
                    setDef = this.SETS[d];
                    break;
                }
            }
            if (!setDef) continue;

            // 遍历 setBonuses，找到已激活的加成（count >= 所需件数，取最高档）
            var bonusDesc = '';
            var mergedEffects = {};
            for (var b = 0; b < setDef.setBonuses.length; b++) {
                var bonus = setDef.setBonuses[b];
                if (count >= bonus.count) {
                    bonusDesc = bonus.desc;
                    // 合并 effects
                    var effKeys = Object.keys(bonus.effects);
                    for (var k = 0; k < effKeys.length; k++) {
                        mergedEffects[effKeys[k]] = bonus.effects[effKeys[k]];
                    }
                }
            }

            if (bonusDesc) {
                result.push({
                    setName: setName,
                    count: count,
                    bonusDesc: bonusDesc,
                    effects: mergedEffects,
                });
            }
        }

        return result;
    },

    /* ----------------------------------------------------------
       掉落提示卡片（居中显示，2秒自动消失）
       ---------------------------------------------------------- */
    showDropCard: function (equip) {
        var self = this;
        var q = this.QUALITIES[equip.quality];
        var s = this.SLOTS[equip.slot];

        // 构建效果文本
        var effectsHtml = '';
        if (equip.effects && equip.effects.length > 0) {
            effectsHtml = '<div style="font-size:12px;color:#ffd700;margin-top:6px;line-height:1.7;">';
            for (var i = 0; i < equip.effects.length; i++) {
                var ef = equip.effects[i];
                effectsHtml += '✨ ' + ef.name + ' +' + ef.value + '%<br>';
            }
            effectsHtml += '</div>';
        }

        // 创建遮罩+卡片
        var overlay = document.createElement('div');
        overlay.className = 'drop-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
            'background:rgba(0,0,0,0.6);z-index:9999;display:flex;' +
            'align-items:center;justify-content:center;';

        var card = document.createElement('div');
        card.className = 'drop-card';
        card.style.cssText = 'background:rgba(22,33,62,0.95);border:2px solid ' + q.color +
            ';border-radius:16px;padding:24px 28px;text-align:center;' +
            'box-shadow:0 0 30px ' + q.color + ', 0 0 60px ' + q.color + '44;' +
            'max-width:300px;animation:dropCardIn 0.3s ease-out;';

        card.innerHTML = '<div style="font-size:20px;color:' + q.color + ';font-weight:bold;margin-bottom:4px;">' +
            '🎁 获得装备</div>' +
            '<div style="font-size:26px;color:' + q.color + ';font-weight:bold;margin:8px 0;">' +
            s.icon + ' ' + equip.name + '</div>' +
            '<div style="font-size:14px;color:' + q.color + ';margin-bottom:12px;">' +
            '【' + q.name + '】' + s.name + '</div>' +
            '<div style="font-size:13px;color:#a09080;line-height:1.8;">' +
            '⚔️ 攻击 +' + equip.atk + '<br>' +
            '🛡️ 防御 +' + equip.def + '<br>' +
            '❤️ 生命 +' + equip.hp + '</div>' +
            effectsHtml;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // 点击或2秒后消失
        var removeFn = function () {
            if (overlay.parentNode) {
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.3s';
                setTimeout(function () {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                }, 300);
            }
        };

        overlay.addEventListener('click', removeFn);
        setTimeout(removeFn, 2000);
    },

    /** 筛选按钮样式 */
    _btnStyle: function (isActive, color) {
        return 'padding:3px 8px;border-radius:12px;font-size:10px;cursor:pointer;' +
            'border:1px solid ' + (isActive ? color : '#444') + ';' +
            'background:' + (isActive ? color + '33' : 'rgba(0,0,0,0.3)') + ';' +
            'color:' + (isActive ? '#fff' : '#888') + ';' +
            'font-family:inherit;transition:all 0.15s;';
    },

    /* ----------------------------------------------------------
       渲染背包列表（加入品质筛选和批量出售）
       ---------------------------------------------------------- */
    renderInventory: function () {
        var container = document.getElementById('inventory-list');
        if (!container) return;

        container.innerHTML = '';

        var inventory = Game.data.inventory;
        if (!inventory || inventory.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:var(--text-muted);' +
                'padding:30px;">🎒 背包空空如也<br><span style="font-size:12px;">去历练吧，道友！</span></div>';
            return;
        }

        // 过滤品质（当前筛选，默认显示全部）
        var filterQuality = (this._invFilter !== undefined && this._invFilter !== null) ? this._invFilter : -1;

        // 筛选按钮行
        var filterRow = document.createElement('div');
        filterRow.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;align-items:center;';
        filterRow.innerHTML = '<span style="font-size:11px;color:var(--text-muted);margin-right:4px;">筛选:</span>';

        var self = this;
        // "全部"按钮
        var allBtn = document.createElement('button');
        allBtn.textContent = '全部(' + inventory.length + ')';
        allBtn.style.cssText = this._btnStyle(filterQuality === -1, '#888');
        allBtn.addEventListener('click', function () { self._invFilter = -1; self.renderInventory(); });
        filterRow.appendChild(allBtn);

        for (var qi = 0; qi < this.QUALITIES.length; qi++) {
            (function (qIdx) {
                var q = self.QUALITIES[qIdx];
                var count = 0;
                for (var ci = 0; ci < inventory.length; ci++) {
                    if (inventory[ci].quality === qIdx) count++;
                }
                if (count === 0) return;
                var btn = document.createElement('button');
                btn.textContent = q.name + '(' + count + ')';
                btn.style.cssText = self._btnStyle(filterQuality === qIdx, q.color);
                btn.addEventListener('click', function () { self._invFilter = qIdx; self.renderInventory(); });
                filterRow.appendChild(btn);
            })(qi);
        }
        container.appendChild(filterRow);

        // 批量操作行
        var batchRow = document.createElement('div');
        batchRow.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;';
        // 批量出售低于某品质的
        var sellLowBtn = document.createElement('button');
        sellLowBtn.textContent = '一键出售凡品';
        sellLowBtn.style.cssText = 'flex:1;padding:6px;border:1px solid #666;border-radius:6px;' +
            'background:rgba(0,0,0,0.3);color:#ccc;font-size:11px;cursor:pointer;';
        sellLowBtn.addEventListener('click', function () {
            var count = 0;
            var stones = 0;
            for (var si = inventory.length - 1; si >= 0; si--) {
                if (inventory[si].quality === 0) {  // 凡品
                    stones += Math.floor((inventory[si].atk + inventory[si].def + inventory[si].hp) * 0.3);
                    inventory.splice(si, 1);
                    count++;
                }
            }
            if (count > 0) {
                Game.data.spiritStones += stones;
                showToast('出售 ' + count + ' 件凡品，获得 ' + stones + ' 灵石', 2000);
                Game.saveGame();
                self.renderInventory();
                Cultivation.updateAllUI();
            } else {
                showToast('没有凡品装备可出售', 1500);
            }
        });
        batchRow.appendChild(sellLowBtn);

        var sellAllBtn = document.createElement('button');
        sellAllBtn.textContent = '一件不留💀';
        sellAllBtn.style.cssText = 'flex:1;padding:6px;border:1px solid #e74c3c;border-radius:6px;' +
            'background:rgba(231,76,60,0.15);color:#e74c3c;font-size:11px;cursor:pointer;';
        sellAllBtn.addEventListener('click', function () {
            if (inventory.length === 0) { showToast('背包已空', 1000); return; }
            if (!confirm('确定出售全部 ' + inventory.length + ' 件装备？此操作不可撤销！')) return;
            var stones = 0;
            for (var si2 = inventory.length - 1; si2 >= 0; si2--) {
                stones += Math.floor((inventory[si2].atk + inventory[si2].def + inventory[si2].hp) * 0.3);
            }
            inventory.length = 0;
            Game.data.spiritStones += stones;
            showToast('出售全部装备，获得 ' + stones + ' 灵石', 2000);
            Game.saveGame();
            self.renderInventory();
            Cultivation.updateAllUI();
        });
        batchRow.appendChild(sellAllBtn);
        container.appendChild(batchRow);

        // 容量提示
        var capHint = document.createElement('div');
        capHint.style.cssText = 'text-align:right;color:var(--text-muted);font-size:11px;margin-bottom:6px;';
        capHint.textContent = inventory.length + ' / 50';
        container.appendChild(capHint);

        var self = this;
        // 遍历背包（支持品质筛选）
        var displayIndices = [];
        for (var di = 0; di < inventory.length; di++) {
            if (filterQuality === -1 || inventory[di].quality === filterQuality) {
                displayIndices.push(di);
            }
        }

        for (var vi = 0; vi < displayIndices.length; vi++) {
            (function (idx) {
                var eq = inventory[idx];
                var q = self.QUALITIES[eq.quality];
                var s = self.SLOTS[eq.slot];

                // 与已装备同槽位装备对比
                var compareHtml = '';
                var equipped = Game.data.equipped[eq.slot];
                if (equipped) {
                    var dAtk = eq.atk - equipped.atk;
                    var dDef = eq.def - equipped.def;
                    var dHp = eq.hp - equipped.hp;
                    var diffs = [];
                    if (dAtk !== 0) diffs.push((dAtk > 0 ? '<span style="color:#00ff88;">攻+' : '<span style="color:#ff4444;">攻') + dAtk + '</span>');
                    if (dDef !== 0) diffs.push((dDef > 0 ? '<span style="color:#00ff88;">防+' : '<span style="color:#ff4444;">防') + dDef + '</span>');
                    if (dHp !== 0) diffs.push((dHp > 0 ? '<span style="color:#00ff88;">命+' : '<span style="color:#ff4444;">命') + dHp + '</span>');
                    compareHtml = '<div style="font-size:10px;margin-top:4px;border-top:1px solid rgba(255,255,255,0.1);padding-top:3px;">' +
                        (diffs.length > 0 ? '对比已装备：' + diffs.join(' ') : '<span style="color:#888;">与已装备相同</span>') +
                        '</div>';
                }

                var cardEl = document.createElement('div');
                cardEl.className = 'inv-card inv-card-q' + eq.quality;
                cardEl.style.cssText = 'border:1px solid ' + q.color + ';border-radius:10px;padding:12px 14px;margin-bottom:10px;' +
                    'background:rgba(15,52,96,0.4);box-shadow:0 0 8px ' + q.color + '22;cursor:pointer;' +
                    'transition:all 0.2s;position:relative;overflow:hidden;';

                cardEl.innerHTML =
                    '<div style="display:flex;align-items:center;gap:10px;">' +
                        '<div style="font-size:24px;min-width:32px;text-align:center;">' + s.icon + '</div>' +
                        '<div style="flex:1;min-width:0;">' +
                            '<div style="font-size:13px;font-weight:bold;color:' + q.color + ';">' + eq.name + '</div>' +
                            '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">【' + q.name + '】' + s.name + '</div>' +
                            '<div style="display:flex;gap:12px;margin-top:6px;">' +
                                '<span style="font-size:12px;color:' + q.color + ';">⚔️+' + eq.atk + '</span>' +
                                '<span style="font-size:12px;color:' + q.color + ';">🛡️+' + eq.def + '</span>' +
                                '<span style="font-size:12px;color:' + q.color + ';">❤️+' + eq.hp + '</span>' +
                            '</div>' +
                            compareHtml +
                        '</div>' +
                        '<div style="display:flex;flex-direction:column;gap:6px;">' +
                            '<button class="inv-equip-btn" data-idx="' + idx + '" style="padding:6px 14px;border:1px solid ' + q.color + ';border-radius:6px;background:rgba(0,0,0,0.3);color:' + q.color + ';font-size:12px;cursor:pointer;white-space:nowrap;transition:all 0.15s;">装备</button>' +
                            '<button class="inv-sell-btn" data-idx="' + idx + '" style="padding:4px 10px;border:1px solid #555;border-radius:6px;background:rgba(0,0,0,0.3);color:#888;font-size:11px;cursor:pointer;transition:all 0.15s;">出售</button>' +
                        '</div>' +
                    '</div>';

                container.appendChild(cardEl);

                // 卡片点击显示详情（按钮点击会阻止冒泡）
                cardEl.addEventListener('click', function (e) {
                    if (e.target.tagName !== 'BUTTON') {
                        self.showDetail(eq);
                    }
                });
            })(displayIndices[vi]);
        }

        // 绑定事件
        var self = this;
        setTimeout(function () {
            var equipBtns = container.querySelectorAll('.inv-equip-btn');
            for (var i = 0; i < equipBtns.length; i++) {
                equipBtns[i].addEventListener('click', function (e) {
                    e.stopPropagation();
                    var idx = parseInt(this.getAttribute('data-idx'));
                    self.equipItem(idx);
                });
            }
            var sellBtns = container.querySelectorAll('.inv-sell-btn');
            for (var j = 0; j < sellBtns.length; j++) {
                sellBtns[j].addEventListener('click', function (e) {
                    e.stopPropagation();
                    var idx = parseInt(this.getAttribute('data-idx'));
                    self.sellItem(idx);
                });
            }
        }, 0);
    },

    /* ----------------------------------------------------------
       装备到槽位
       @param {number} invIndex - 背包索引
       ---------------------------------------------------------- */
    equipItem: function (invIndex) {
        var equip = Game.data.inventory[invIndex];
        if (!equip) return;

        var slotIndex = equip.slot;

        // 如果该槽位已有装备，先卸下旧的
        if (Game.data.equipped[slotIndex]) {
            var old = Game.data.equipped[slotIndex];
            Game.data.inventory.push(old);
            // 移除旧装备属性
            Game.data.hp     -= old.hp;
            Game.data.attack -= old.atk;
            Game.data.defense -= old.def;
        }

        // 卸下背包中的这件
        Game.data.equipped[slotIndex] = equip;
        Game.data.inventory.splice(invIndex, 1);

        // 添加属性
        Game.data.hp     += equip.hp;
        Game.data.attack += equip.atk;
        Game.data.defense += equip.def;

        // 更新UI
        Cultivation.updateAllUI();
        this.renderInventory();
        this.renderEquipped();
        Game.saveGame();

        showToast('装备「' + equip.name + '」', 1500);
    },

    /* ----------------------------------------------------------
       卸下装备
       @param {number} slotIndex - 槽位索引
       ---------------------------------------------------------- */
    unequipItem: function (slotIndex) {
        var equip = Game.data.equipped[slotIndex];
        if (!equip) return;

        // 检查背包容量
        if (Game.data.inventory.length >= 50) {
            showToast('背包已满，无法卸下', 2000);
            return;
        }

        Game.data.equipped[slotIndex] = null;
        Game.data.inventory.push(equip);

        // 移除属性
        Game.data.hp     -= equip.hp;
        Game.data.attack -= equip.atk;
        Game.data.defense -= equip.def;

        Cultivation.updateAllUI();
        this.renderInventory();
        this.renderEquipped();
        Game.saveGame();

        showToast('卸下「' + equip.name + '」', 1500);
    },

    /* ----------------------------------------------------------
       查看装备详情弹窗
       @param {object} equip - 装备对象
       @param {number} [slotIndex] - 已装备槽位索引（可选）
       ---------------------------------------------------------- */
    showDetail: function (equip, slotIndex) {
        // 清理已有的详情弹窗（防止多个弹窗叠加导致ID冲突卡死）
        var existingOverlays = document.querySelectorAll('.equip-detail-overlay');
        for (var o = 0; o < existingOverlays.length; o++) {
            if (existingOverlays[o].parentNode) {
                existingOverlays[o].parentNode.removeChild(existingOverlays[o]);
            }
        }

        var self = this;
        var q = this.QUALITIES[equip.quality];
        var s = this.SLOTS[equip.slot];

        // 构建效果列表 HTML
        var effectsHtml = '';
        if (equip.effects && equip.effects.length > 0) {
            effectsHtml = '<div style="margin-top:12px;">' +
                '<div style="font-size:13px;color:#ffd700;font-weight:bold;margin-bottom:6px;">特殊效果</div>';
            for (var i = 0; i < equip.effects.length; i++) {
                var ef = equip.effects[i];
                effectsHtml += '<div style="font-size:12px;color:#ffd700;padding:3px 0;border-bottom:1px solid rgba(255,215,0,0.1);">' +
                    '✦ ' + ef.name + ' +' + ef.value + '%</div>';
            }
            effectsHtml += '</div>';
        } else {
            effectsHtml = '<div style="margin-top:12px;font-size:12px;color:#6a5f50;">无特殊效果</div>';
        }

        // 强化区域
        var enhanceLevel = equip.enhance || 0;
        var qualityMult = this.QUALITIES[equip.quality].mult;
        var enhanceCost = Math.floor((enhanceLevel + 1) * 50 * qualityMult);
        var enhanceRate = Math.max(30, 100 - enhanceLevel * 5);
        var canEnhance = enhanceLevel < EQUIP_MAX_ENHANCE;

        var enhanceHtml = '';
        if (canEnhance) {
            enhanceHtml = '<div style="margin-top:12px;background:rgba(255,215,0,0.05);' +
                'border:1px solid rgba(255,215,0,0.2);border-radius:10px;padding:10px;">' +
                '<div style="font-size:13px;color:#ffd700;font-weight:bold;margin-bottom:6px;">强化</div>' +
                '<div style="font-size:12px;color:#a09080;line-height:1.8;">' +
                '当前：+' + enhanceLevel + ' 级<br>' +
                '消耗：' + formatNumber(enhanceCost) + ' 灵石<br>' +
                '成功率：' + enhanceRate + '%</div>' +
                '<button id="detail-enhance-btn" class="enhance-btn" ' +
                'style="width:100%;margin-top:8px;padding:8px;border:1px solid #ffd700;' +
                'border-radius:8px;background:rgba(255,215,0,0.1);color:#ffd700;' +
                'font-size:14px;font-family:inherit;cursor:pointer;">强化</button></div>';
        } else {
            enhanceHtml = '<div style="margin-top:12px;background:rgba(255,215,0,0.05);' +
                'border:1px solid rgba(255,215,0,0.15);border-radius:10px;padding:10px;">' +
                '<div style="font-size:13px;color:#ffd700;font-weight:bold;margin-bottom:4px;">强化 MAX</div>' +
                '<div style="font-size:12px;color:#a09080;">已达最高强化等级 +' + EQUIP_MAX_ENHANCE + '</div></div>';
        }

        // 按钮区域
        var btnHtml = '';
        if (slotIndex !== undefined) {
            btnHtml = '<button id="detail-unequip-btn" ' +
                'style="width:100%;margin-top:8px;padding:10px;border:1px solid ' + q.color +
                ';border-radius:8px;background:rgba(0,0,0,0.3);color:' + q.color +
                ';font-size:14px;font-family:inherit;cursor:pointer;">卸下装备</button>';
        } else {
            btnHtml = '<button id="detail-equip-btn" ' +
                'style="width:100%;margin-top:8px;padding:10px;border:1px solid ' + q.color +
                ';border-radius:8px;background:rgba(0,0,0,0.3);color:' + q.color +
                ';font-size:14px;font-family:inherit;cursor:pointer;">装备</button>';
        }

        // 创建遮罩
        var overlay = document.createElement('div');
        overlay.className = 'equip-detail-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
            'background:rgba(0,0,0,0.6);z-index:9999;display:flex;' +
            'align-items:center;justify-content:center;';

        // 创建详情卡片
        var card = document.createElement('div');
        card.className = 'equip-detail-card';
        card.style.cssText = 'background:rgba(22,33,62,0.97);border:2px solid ' + q.color +
            ';border-radius:16px;padding:24px 28px;text-align:center;' +
            'box-shadow:0 0 30px ' + q.color + ', 0 0 60px ' + q.color + '44;' +
            'max-width:300px;width:90%;animation:equipDetailIn 0.3s ease-out;' +
            'position:relative;';

        card.innerHTML =
            // 关闭按钮
            '<div id="detail-close-btn" ' +
            'style="position:absolute;top:10px;right:14px;font-size:20px;color:#888;' +
            'cursor:pointer;line-height:1;">✕</div>' +

            // 装备名
            '<div style="font-size:24px;color:' + q.color + ';font-weight:bold;margin:4px 0;">' +
            s.icon + ' ' + equip.name + '</div>' +

            // 品质和槽位
            '<div style="font-size:14px;color:' + q.color + ';margin-bottom:4px;">' +
            '【' + q.name + '】' + s.name + '</div>' +

            // 套装信息
            (equip.setName ? '<div style="font-size:13px;color:#00ff88;margin-bottom:10px;' +
                'background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.2);' +
                'border-radius:6px;padding:4px 10px;display:inline-block;">套装：' + equip.setName + '</div>' : '') +

            // 基础属性
            '<div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:12px;">' +
            '<div style="font-size:12px;color:#a09080;margin-bottom:6px;">基础属性</div>' +
            '<div style="display:flex;justify-content:space-around;font-size:14px;color:#e0d5c1;">' +
            '<div>⚔️ 攻击<br><span style="color:#e67e22;font-weight:bold;">' + equip.atk + '</span></div>' +
            '<div>🛡️ 防御<br><span style="color:#3498db;font-weight:bold;">' + equip.def + '</span></div>' +
            '<div>❤️ 生命<br><span style="color:#e74c3c;font-weight:bold;">' + equip.hp + '</span></div>' +
            '</div></div>' +

            // 特殊效果
            effectsHtml +

            // 强化区域
            enhanceHtml +

            // 操作按钮
            btnHtml;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // 关闭函数
        var removeOverlay = function () {
            if (overlay.parentNode) {
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.25s';
                setTimeout(function () {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                }, 250);
            }
        };

        // 点击遮罩关闭
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) removeOverlay();
        });

        // 关闭按钮
        var closeBtn = document.getElementById('detail-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                removeOverlay();
            });
        }

        // 装备/卸下按钮
        if (slotIndex !== undefined) {
            var unequipBtn = document.getElementById('detail-unequip-btn');
            if (unequipBtn) {
                unequipBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    removeOverlay();
                    self.unequipItem(slotIndex);
                });
            }
        } else {
            var equipBtn = document.getElementById('detail-equip-btn');
            if (equipBtn) {
                equipBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var invIdx = -1;
                    for (var i = 0; i < Game.data.inventory.length; i++) {
                        if (Game.data.inventory[i].id === equip.id) {
                            invIdx = i;
                            break;
                        }
                    }
                    removeOverlay();
                    if (invIdx >= 0) {
                        self.equipItem(invIdx);
                    }
                });
            }
        }

        // 强化按钮
        var enhanceBtn = document.getElementById('detail-enhance-btn');
        if (enhanceBtn) {
            enhanceBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                var result = self.enhanceEquip(equip, slotIndex !== undefined ? slotIndex : -1);
                removeOverlay();
                // 强化后重新打开详情弹窗
                if (result) {
                    var updatedEquip;
                    if (slotIndex !== undefined) {
                        updatedEquip = Game.data.equipped[slotIndex];
                    } else {
                        for (var k = 0; k < Game.data.inventory.length; k++) {
                            if (Game.data.inventory[k].id === equip.id) {
                                updatedEquip = Game.data.inventory[k];
                                break;
                            }
                        }
                    }
                    if (updatedEquip) {
                        // 等待旧弹窗完全移除（250ms 过渡 + 缓冲）后再打开新弹窗，避免 ID 冲突
                        setTimeout(function () { self.showDetail(updatedEquip, slotIndex); }, 300);
                    }
                }
            });
        }
    },

    /* ----------------------------------------------------------
       装备强化（公式化重构，基于 baseAtk/baseDef/baseHp）
       属性始终 = Math.floor(base × 1.08^enhance)，无漂移
       @param {object} equip - 装备对象（引用或副本，内部会查找实际引用）
       @param {number} slotIndex - 已装备槽位索引（>=0），背包中为 -1
       @returns {boolean} 是否强化成功
       ---------------------------------------------------------- */
    enhanceEquip: function (equip, slotIndex) {
        var level = equip.enhance || 0;
        if (level >= EQUIP_MAX_ENHANCE) {
            showToast('已达最高强化等级 +' + EQUIP_MAX_ENHANCE, 2000);
            return false;
        }

        var qualityMult = this.QUALITIES[equip.quality].mult;
        var cost = Math.floor((level + 1) * 50 * qualityMult);

        if (Game.data.spiritStones < cost) {
            showToast('灵石不足！需要 ' + formatNumber(cost) + ' 灵石', 2000);
            return false;
        }

        // 定位实际对象引用（showDetail 传入的可能是查找后的副本）
        if (slotIndex >= 0) {
            equip = Game.data.equipped[slotIndex];
        } else {
            var invIdx = -1;
            for (var i = 0; i < Game.data.inventory.length; i++) {
                if (Game.data.inventory[i].id === equip.id) {
                    invIdx = i;
                    break;
                }
            }
            if (invIdx < 0) return false;
            equip = Game.data.inventory[invIdx];
        }

        level = equip.enhance || 0;

        // 兼容旧存档：无 baseAtk 字段时从当前属性反推基础值
        if (!equip.baseAtk) {
            equip.baseAtk = Math.round(equip.atk / Math.pow(1.08, level));
            equip.baseDef = Math.round(equip.def / Math.pow(1.08, level));
            equip.baseHp  = Math.round(equip.hp  / Math.pow(1.08, level));
        }

        // 保存旧属性（用于同步 Game.data 差值）
        var oldAtk = equip.atk;
        var oldDef = equip.def;
        var oldHp  = equip.hp;

        // 成功率：Lv0~14 递减（100%→30%），Lv15~19 固定 30%
        var baseRate = level < 15 ? Math.max(30, 100 - level * 5) : 30;
        var successRate = baseRate + (Game.data.enhanceRateBuff || 0);
        var success = Math.random() * 100 < successRate;

        Game.data.spiritStones -= cost;

        // 消耗强化符 Buff（单次有效）
        Game.data.enhanceRateBuff = 0;

        // 新强化等级
        var newLevel;
        if (success) {
            newLevel = level + 1;
            showToast('强化成功！+' + newLevel, 1500);
        } else {
            if (level >= 5) {
                newLevel = level - 1;
                showToast('强化失败，等级 ' + level + ' → ' + newLevel, 2000);
            } else {
                newLevel = level;
                showToast('强化失败，无惩罚', 2000);
            }
        }

        // 公式重算属性（base × 1.08^newLevel），消除增量漂移
        equip.enhance = newLevel;
        equip.atk = Math.floor(equip.baseAtk * Math.pow(1.08, newLevel));
        equip.def = Math.floor(equip.baseDef * Math.pow(1.08, newLevel));
        equip.hp  = Math.floor(equip.baseHp  * Math.pow(1.08, newLevel));

        // 同步 Game.data 属性差异
        if (slotIndex >= 0) {
            Game.data.attack += equip.atk - oldAtk;
            Game.data.defense += equip.def - oldDef;
            Game.data.hp     += equip.hp  - oldHp;
        }

        Game.updatePower();
        Cultivation.updateAllUI();
        this.renderInventory();
        this.renderEquipped();
        Game.saveGame();

        return success;
    },

    /* ----------------------------------------------------------
       出售装备
       @param {number} invIndex - 背包索引
       ---------------------------------------------------------- */
    sellItem: function (invIndex) {
        var equip = Game.data.inventory[invIndex];
        if (!equip) return;

        var price = Math.floor(this.QUALITIES[equip.quality].mult * 50);
        Game.data.inventory.splice(invIndex, 1);
        Game.addSpirit(price);

        this.renderInventory();
        Game.saveGame();

        showToast('售出「' + equip.name + '」，获得 ' + price + ' 灵石', 2000);
    },

    /* ----------------------------------------------------------
       渲染已装备区（6槽位网格）
       ---------------------------------------------------------- */
    renderEquipped: function () {
        var self = this;
        var container = document.getElementById('equipped-grid');
        if (!container) return;

        container.innerHTML = '';

        // 战力加成汇总
        var totalAtk = 0, totalDef = 0, totalHp = 0;
        for (var i = 0; i < 6; i++) {
            if (Game.data.equipped[i]) {
                totalAtk += Game.data.equipped[i].atk;
                totalDef += Game.data.equipped[i].def;
                totalHp  += Game.data.equipped[i].hp;
            }
        }
        if (totalAtk > 0 || totalDef > 0 || totalHp > 0) {
            var bonusDiv = document.createElement('div');
            bonusDiv.style.cssText = 'text-align:center;padding:8px 12px;margin-bottom:12px;' +
                'background:rgba(212,165,116,0.08);border:1px solid rgba(212,165,116,0.2);border-radius:8px;';
            bonusDiv.innerHTML = '<span style="color:#d4a574;font-size:12px;">装备加成：</span>' +
                '<span style="color:#ffd700;font-size:13px;font-weight:bold;">⚔️+' + totalAtk + '</span> ' +
                '<span style="color:#ffd700;font-size:13px;font-weight:bold;">🛡️+' + totalDef + '</span> ' +
                '<span style="color:#ffd700;font-size:13px;font-weight:bold;">❤️+' + totalHp + '</span>';
            container.appendChild(bonusDiv);
        }

        // 套装汇总
        var activeSets = self.getActiveSetBonuses();
        if (activeSets.length > 0) {
            var setSummary = document.createElement('div');
            setSummary.style.cssText = 'text-align:center;margin-bottom:12px;';
            for (var si = 0; si < activeSets.length; si++) {
                var as = activeSets[si];
                var badge = document.createElement('span');
                badge.style.cssText = 'display:inline-block;margin:2px 4px;padding:4px 12px;' +
                    'background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);' +
                    'border-radius:12px;font-size:11px;color:#00ff88;letter-spacing:1px;';
                badge.textContent = '✨ ' + as.setName + ' ' + as.count + '/6 · ' + as.bonusDesc;
                setSummary.appendChild(badge);
            }
            container.appendChild(setSummary);
        }

        // 槽位网格
        var grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;';
        var self = this;

        for (var j = 0; j < 6; j++) {
            (function (idx) {
                var slot = self.SLOTS[idx];
                var equip = Game.data.equipped[idx];

                var slotCard = document.createElement('div');
                if (equip) {
                    var q = self.QUALITIES[equip.quality];
                    slotCard.className = 'equip-slot filled';
                    slotCard.style.cssText = 'border:1px solid ' + q.color +
                        ';border-radius:10px;padding:10px 8px;text-align:center;' +
                        'background:rgba(15,52,96,0.35);cursor:pointer;' +
                        'box-shadow:0 0 6px ' + q.color + '22;transition:all 0.2s;';
                    slotCard.innerHTML = '<div style="font-size:22px;">' + slot.icon + '</div>' +
                        '<div style="font-size:10px;color:var(--text-muted);margin:2px 0;">' + slot.name + '</div>' +
                        '<div style="font-size:11px;color:' + q.color + ';font-weight:bold;margin:2px 0;">' +
                        equip.name.substring(0, 6) +
                        (equip.enhance > 0 ? '<span style="font-size:9px;background:#ffd700;color:#1a1a2e;' +
                            'padding:1px 5px;border-radius:4px;margin-left:4px;font-weight:bold;">+' + equip.enhance + '</span>' : '') +
                        '</div>' +
                        '<div style="display:flex;gap:4px;justify-content:center;margin-top:4px;">' +
                            '<span style="font-size:9px;color:' + q.color + ';">⚔️+' + equip.atk + '</span>' +
                            '<span style="font-size:9px;color:' + q.color + ';">🛡️+' + equip.def + '</span>' +
                            '<span style="font-size:9px;color:' + q.color + ';">❤️+' + equip.hp + '</span>' +
                        '</div>';
                    slotCard.title = '点击查看 ' + equip.name;
                    slotCard.addEventListener('click', function () {
                        self.showDetail(equip, idx);
                    });
                } else {
                    slotCard.className = 'equip-slot empty';
                    slotCard.style.cssText = 'border:1px dashed rgba(58,58,74,0.5);border-radius:10px;' +
                        'padding:10px 8px;text-align:center;background:rgba(10,10,25,0.4);';
                    slotCard.innerHTML = '<div style="font-size:22px;opacity:0.4;">' + slot.icon + '</div>' +
                        '<div style="font-size:10px;color:#555;margin:2px 0;">' + slot.name + '</div>' +
                        '<div style="font-size:11px;color:#3a3a4a;">空</div>';
                }
                grid.appendChild(slotCard);
            })(j);
        }
        container.appendChild(grid);
    },

    /* ----------------------------------------------------------
       初始化子Tab事件绑定
       ---------------------------------------------------------- */
    init: function () {
        var self = this;
        var charTab = document.getElementById('tab-character');
        if (!charTab) return;
        // 子Tab按钮事件（限角色Tab内）
        var subBtns = charTab.querySelectorAll('.sub-tab-btn');
        for (var i = 0; i < subBtns.length; i++) {
            subBtns[i].addEventListener('click', function () {
                var sub = this.getAttribute('data-sub');

                // 切换按钮高亮
                var allBtns = charTab.querySelectorAll('.sub-tab-btn');
                for (var b = 0; b < allBtns.length; b++) {
                    allBtns[b].classList.remove('active');
                }
                this.classList.add('active');

                // 切换子页面
                var allPages = charTab.querySelectorAll('.sub-page');
                for (var p = 0; p < allPages.length; p++) {
                    allPages[p].classList.remove('active');
                }
                var target = document.getElementById('sub-' + sub);
                if (target) target.classList.add('active');

                // 控制修炼区、进度条和子Tab（仅在属性页显示）
                var cultArea = document.getElementById('cultivation-area');
                var realmBar = document.querySelector('.realm-progress-bar');
                var showCult = (sub === 'stats');
                if (cultArea) cultArea.style.display = showCult ? '' : 'none';
                if (realmBar) realmBar.style.display = showCult ? '' : 'none';

                // 渲染对应内容
                if (sub === 'inventory') {
                    self.renderInventory();
                } else if (sub === 'equipped') {
                    self.renderEquipped();
                } else if (sub === 'talents' && typeof Talents !== 'undefined') {
                    Talents.render();
                } else if (sub === 'skills' && typeof Skills !== 'undefined') {
                    Skills.render();
                }
            });
        }
    },

};