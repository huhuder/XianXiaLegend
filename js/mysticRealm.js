/* ================================================================
   MysticRealm - 秘境系统 v2
   层数机制 + 扫荡 + 万兽荒原产出改造 + 无尽试炼
   ================================================================ */

var MysticRealm = (function () {
    'use strict';

    /* ===========================================
       配置
       =========================================== */
    var CONFIG = {
        dailyTokens: 5,
        tokenCost: 100,
        maxExtraTokens: 10,
        refreshHour: 5,
        layersPerRealmIndex: 3,
        maxLayers: 30,
        sweepRate: 0.8,
    };

    /* ===========================================
       境界基数表 — 已废弃，改为基于玩家有效属性动态计算
       =========================================== */
    // var REALM_BASE = [ ... ]; — see getRealmEnemyStats() below

    /* ===========================================
       固定数值敌人属性（传奇风格，基于玩家当前境界缩放）
       realmIndex: 玩家当前境界索引（0-9），由此计算境界系数
       layerWithinRealm: 层内难度 0=简单 1=普通 2=困难
       =========================================== */
    function getRealmEnemyStats(realmIndex, layerWithinRealm) {
        // 基础属性（校准至玩家凡人期可打的合理范围）
        var baseHp = 100;
        var baseAtk = 15;
        var baseDef = 8;

        // 境界系数：每个境界递增（比玩家属性增长稍慢，保持可挑战）
        var realmMult = Math.pow(1.6, realmIndex);

        // 层内难度系数：简单/普通/困难
        var hpMult  = [1.0, 1.6, 2.5];
        var atkMult = [1.0, 1.4, 1.9];
        var defMult = [1.0, 1.3, 1.7];

        // 随机波动 ±5%
        var rnd = 0.95 + Math.random() * 0.1;

        return {
            hp:  Math.floor(baseHp  * realmMult * hpMult[layerWithinRealm]  * rnd),
            atk: Math.floor(baseAtk * realmMult * atkMult[layerWithinRealm] * rnd),
            def: Math.floor(baseDef * realmMult * defMult[layerWithinRealm] * rnd)
        };
    }

    /* ===========================================
       秘境类型定义（4个常规 + 无尽试炼）
       怪物属性现在由境界基数+层内倍率动态计算，不再使用静态值
       =========================================== */
    var REALMS = [
        {
            id: 'spirit_stone',
            name: '灵石秘窟',
            desc: '灵气浓郁的矿脉深处，击败守卫可获取大量灵石',
            icon: '💰',
            color: '#4ade80',
            lootType: 'spiritStones',
            lootRange: [50, 200],
            enemies: [
                { name: '矿脉守卫·石甲', dropM: 1.0 },
                { name: '矿脉统领·晶岩', dropM: 1.5 },
                { name: '矿脉之主·灵髓', dropM: 2.0 },
            ],
            unlockStage: 1,
        },
        {
            id: 'forge_trial',
            name: '熔炉试炼',
            desc: '地心熔岩中的远古锻造场，产出稀有装备',
            icon: '⚔️',
            color: '#f87171',
            lootType: 'equipment',
            lootTierRange: [1, 3],
            enemies: [
                { name: '熔岩卫士·赤火', dropM: 1.0 },
                { name: '锻造大师·铁砧', dropM: 1.5 },
                { name: '烈焰统领·锻魂', dropM: 1.8 },
                { name: '熔炉之主·天工', dropM: 2.5 },
            ],
            unlockStage: 2,
        },
        {
            id: 'skill_hall',
            name: '功法残殿',
            desc: '上古宗门遗留下的功法大殿，击败试炼者可获得技能书',
            icon: '📜',
            color: '#a78bfa',
            lootType: 'skillBook',
            lootTierRange: [1, 3],
            enemies: [
                { name: '守殿弟子·剑影', dropM: 1.0 },
                { name: '内门长老·传功', dropM: 1.6 },
                { name: '殿主残魂·大能', dropM: 2.2 },
            ],
            unlockStage: 3,
        },
        {
            id: 'beast_wilds',
            name: '万兽荒原',
            desc: '蛮荒妖兽盘踞之地，击败兽群可获得灵兽口粮与进化材料',
            icon: '🐉',
            color: '#fb923c',
            lootType: 'beastFood',
            enemies: [
                { name: '荒原妖兽·铁牙', dropM: 0.8 },
                { name: '荒原妖兽·钢爪', dropM: 1.0 },
                { name: '兽群统领·金角', dropM: 1.5 },
                { name: '远古凶兽·裂地', dropM: 2.0 },
                { name: '荒原之主·万兽王', dropM: 3.0 },
            ],
            unlockStage: 4,
        },
    ];

    /* ===========================================
       无尽试炼配置
       =========================================== */
    var ENDLESS_CONFIG = {
        id: 'endless_trial',
        name: '无尽试炼',
        desc: '无尽深渊中的永恒战场，每5层BOSS战，每10层大BOSS',
        icon: '🔥',
        color: '#ffd700',
        bgColor: '#0a0a0a',
        borderColor: '#d4a017',
        enemyBase: { hp: 100, atk: 10, def: 5 },
        bossMultiplier: 2.0,
        superBossMultiplier: 3.5,
    };

    /* ===========================================
       试炼装备词条池
       =========================================== */
    var TRIAL_AFFIXES = [
        { name: '破甲', desc: '无视20%防御', key: 'ignoreDef', value: 20 },
        { name: '嗜血', desc: '攻击吸血+15%', key: 'lifesteal', value: 15 },
        { name: '雷击', desc: '攻击附带雷击（30%攻击力）', key: 'lightningStrike', value: 30 },
        { name: '火焰', desc: '攻击附带灼烧', key: 'burnDot', value: 10 },
        { name: '冰霜', desc: '攻击减速敌人', key: 'slow', value: 1 },
        { name: '连击', desc: '10%概率触发连击', key: 'doubleStrike', value: 10 },
        { name: '不屈', desc: '生命低于30%时防御翻倍', key: 'lastStand', value: 100 },
        { name: '致命', desc: '暴击伤害+50%', key: 'critDmg', value: 50 },
        { name: '精准', desc: '暴击率+8%', key: 'critRate', value: 8 },
        { name: '壁垒', desc: '受到伤害-15%', key: 'dmgReduction', value: 15 },
    ];

    /* ===========================================
       状态
       =========================================== */
    var state = {
        tokens: 5,
        extraBought: 0,
        lastRefreshDate: '',
        currentRealm: null,
        currentLayer: 0,
        currentWave: 0,
        inBattle: false,
        isEndless: false,
        clearedRealms: [],
        endlessWave: 0,
        endlessEnemy: null,
        endlessRewards: [],
    };

    var Game;

    /* ===========================================
       初始化
       =========================================== */
    function init() {
        Game = window.Game;
        loadState();
        checkDailyRefresh();
        saveState();
    }

    /* ===========================================
       存档读写
       =========================================== */
    function loadState() {
        if (Game && Game.data) {
            state.tokens = Game.data.mysticRealmTokens;
            state.extraBought = Game.data.mysticRealmExtraBought;
            state.lastRefreshDate = Game.data.mysticRealmLastRefreshDate;
            state.clearedRealms = Game.data.mysticRealmClearedRealms;
        } else {
            try {
                var raw = localStorage.getItem('mysticRealm');
                if (raw) {
                    var saved = JSON.parse(raw);
                    state.tokens = saved.tokens != null ? saved.tokens : CONFIG.dailyTokens;
                    state.extraBought = saved.extraBought || 0;
                    state.lastRefreshDate = saved.lastRefreshDate || '';
                    state.clearedRealms = saved.clearedRealms || [];
                }
            } catch (e) {}
        }
    }

    function saveState() {
        if (Game && Game.data) {
            Game.data.mysticRealmTokens = state.tokens;
            Game.data.mysticRealmExtraBought = state.extraBought;
            Game.data.mysticRealmLastRefreshDate = state.lastRefreshDate;
            Game.data.mysticRealmClearedRealms = state.clearedRealms;
        }
        localStorage.setItem('mysticRealm', JSON.stringify({
            tokens: state.tokens,
            extraBought: state.extraBought,
            lastRefreshDate: state.lastRefreshDate,
            clearedRealms: state.clearedRealms,
        }));
    }

    function checkDailyRefresh() {
        var today = getDateStr();
        if (state.lastRefreshDate !== today) {
            state.tokens = CONFIG.dailyTokens;
            state.extraBought = 0;
            state.lastRefreshDate = today;
            state.clearedRealms = [];
        }
        if (Game && Game.data) {
            if (Game.data.mysticRealmSweepDate !== today) {
                Game.data.mysticRealmSweepDate = today;
                Game.data.mysticRealmSweptLayers = {};
            }
        }
    }

    function getDateStr() {
        var d = new Date();
        var h = d.getUTCHours() + 8;
        var date = new Date(d.getTime() + 8 * 3600000);
        if (h < CONFIG.refreshHour) {
            date = new Date(date.getTime() - 86400000);
        }
        var m = date.getMonth() + 1;
        var day = date.getDate();
        return date.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
    }

    /* ===========================================
       层数计算
       =========================================== */
    function getRealmMaxLayer(realmIndex) {
        return Math.min((realmIndex + 1) * CONFIG.layersPerRealmIndex, CONFIG.maxLayers);
    }

    function getLayerDifficulty(layer) {
        return layer % 3;
    }

    function getDifficultyName(layer) {
        var d = getLayerDifficulty(layer);
        return d === 0 ? '简单' : d === 1 ? '普通' : '困难';
    }

    function isLayerCleared(realmId, layer) {
        if (!Game || !Game.data || !Game.data.mysticRealmClearedLayers) return false;
        var layers = Game.data.mysticRealmClearedLayers[realmId];
        return layers && layers.indexOf(layer) !== -1;
    }

    function markLayerCleared(realmId, layer) {
        if (!Game || !Game.data) return;
        if (!Game.data.mysticRealmClearedLayers) Game.data.mysticRealmClearedLayers = {};
        if (!Game.data.mysticRealmClearedLayers[realmId]) Game.data.mysticRealmClearedLayers[realmId] = [];
        var arr = Game.data.mysticRealmClearedLayers[realmId];
        if (arr.indexOf(layer) === -1) arr.push(layer);
    }

    function isLayerSweptToday(realmId, layer) {
        checkDailyRefresh();
        if (!Game || !Game.data) return false;
        var swept = Game.data.mysticRealmSweptLayers;
        return swept && swept[realmId] && swept[realmId].indexOf(layer) !== -1;
    }

    function markLayerSwept(realmId, layer) {
        if (!Game || !Game.data) return;
        if (!Game.data.mysticRealmSweptLayers) Game.data.mysticRealmSweptLayers = {};
        if (!Game.data.mysticRealmSweptLayers[realmId]) Game.data.mysticRealmSweptLayers[realmId] = [];
        var arr = Game.data.mysticRealmSweptLayers[realmId];
        if (arr.indexOf(layer) === -1) arr.push(layer);
    }

    /* ===========================================
       渲染 - 秘境列表主页
       =========================================== */
    function render() {
        checkDailyRefresh();
        var container = document.getElementById('realm-content');
        if (!container) return;

        var html = '';

        var stage = Game ? Math.min(4, Math.floor(Game.data.realmIndex / 2) + 1) : 1;
        var realmIndex = Game ? Game.data.realmIndex : 0;
        var maxLayer = getRealmMaxLayer(realmIndex);

        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
        for (var i = 0; i < REALMS.length; i++) {
            var r = REALMS[i];
            var unlocked = stage >= r.unlockStage;
            var clearedLayers = Game.data.mysticRealmClearedLayers ? (Game.data.mysticRealmClearedLayers[r.id] || []) : [];
            var allCleared = unlocked && clearedLayers.length >= maxLayer && maxLayer > 0;
            var hasCleared = unlocked && clearedLayers.length > 0;

            html += '<div onclick="' + (unlocked ? 'MysticRealm.renderLayerSelect(\'' + r.id + '\')' : '') + '" style="cursor:' + (unlocked ? 'pointer' : 'default') + ';background:' + r.color + '18;border:1px solid ' + r.color + '44;border-radius:8px;padding:12px;transition:all 0.2s;';
            if (!unlocked) html += 'opacity:0.5;';
            html += '" onmouseover="if(this.style.opacity!=\'0.5\')this.style.borderColor=\'' + r.color + '\';this.style.background=\'' + r.color + '28\';" onmouseout="if(this.style.opacity!=\'0.5\')this.style.borderColor=\'' + r.color + '44\';this.style.background=\'' + r.color + '18\';">';
            html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">';
            html += '<span style="font-size:20px;">' + r.icon + '</span>';
            html += '<span style="color:' + r.color + ';font-weight:bold;">' + r.name + '</span>';
            if (!unlocked) html += '<span style="color:#666;font-size:11px;margin-left:auto;">第' + r.unlockStage + '阶解锁</span>';
            html += '</div>';
            html += '<div style="color:#aaa;font-size:11px;margin-bottom:8px;">' + r.desc + '</div>';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;">';

            if (allCleared) {
                html += '<span style="color:#4ade80;font-size:11px;">✅ 全部通关 (' + clearedLayers.length + '/' + maxLayer + '层)</span>';
            } else if (hasCleared) {
                html += '<span style="color:#fbbf24;font-size:11px;">已通关 ' + clearedLayers.length + '/' + maxLayer + ' 层</span>';
            } else if (unlocked) {
                html += '<span style="color:#a78bfa;font-size:11px;">共 ' + maxLayer + ' 层可挑战</span>';
            } else {
                html += '<span style="color:#666;font-size:11px;">' + r.enemies.length + '波战斗</span>';
            }

            if (unlocked) {
                html += '<span style="color:' + r.color + ';font-size:11px;">进入 ▶</span>';
            } else {
                html += '<span style="opacity:0.4;font-size:11px;">🔒</span>';
            }
            html += '</div></div>';
        }
        html += '</div>';

        // 无尽试炼
        html += '<div style="margin-top:10px;">';
        html += '<div onclick="MysticRealm.renderEndlessTrial()" style="cursor:pointer;background:linear-gradient(135deg,#0a0a0a,#1a1000);border:2px solid ' + ENDLESS_CONFIG.borderColor + ';border-radius:8px;padding:14px;position:relative;overflow:hidden;box-shadow:0 0 20px rgba(212,160,23,0.2);" onmouseover="this.style.boxShadow=\'0 0 30px rgba(212,160,23,0.4)\'" onmouseout="this.style.boxShadow=\'0 0 20px rgba(212,160,23,0.2)\'">';
        html += '<div style="position:absolute;top:-2px;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,' + ENDLESS_CONFIG.borderColor + ',transparent);"></div>';
        html += '<div style="position:absolute;bottom:-2px;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,' + ENDLESS_CONFIG.borderColor + ',transparent);"></div>';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;">';
        html += '<div>';
        html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">';
        html += '<span style="font-size:24px;">' + ENDLESS_CONFIG.icon + '</span>';
        html += '<span style="color:' + ENDLESS_CONFIG.color + ';font-weight:bold;font-size:16px;">' + ENDLESS_CONFIG.name + '</span>';
        html += '</div>';
        html += '<div style="color:#999;font-size:11px;">' + ENDLESS_CONFIG.desc + '</div>';
        html += '</div>';
        html += '<div style="text-align:right;">';
        html += '<div style="color:#ffd700;font-size:12px;">最高 ' + (Game.data.endlessTrialMaxLayer || 0) + ' 层</div>';
        html += '<div style="color:#f87171;font-size:14px;font-weight:bold;">挑战 ▶</div>';
        html += '</div>';
        html += '</div></div></div>';

        container.innerHTML = html;
    }

    /* ===========================================
       渲染 - 层数选择界面
       =========================================== */
    function renderLayerSelect(realmId) {
        checkDailyRefresh();
        var container = document.getElementById('realm-content');
        if (!container) return;

        var realm = null;
        for (var i = 0; i < REALMS.length; i++) {
            if (REALMS[i].id === realmId) { realm = REALMS[i]; break; }
        }
        if (!realm) { render(); return; }

        var realmIndex = Game ? Game.data.realmIndex : 0;
        var maxLayer = getRealmMaxLayer(realmIndex);

        var html = '';

        html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">';
        html += '<button class="btn btn-sm" onclick="MysticRealm.render()" style="background:#333;color:#ccc;border:none;border-radius:4px;padding:4px 10px;font-size:12px;">← 返回</button>';
        html += '<span style="color:' + realm.color + ';font-size:16px;font-weight:bold;">' + realm.icon + ' ' + realm.name + '</span>';
        html += '</div>';

        html += '<div style="background:#1a1a2e;border-radius:6px;padding:8px 12px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;font-size:12px;">';
        html += '<span style="color:#4ade80;font-weight:bold;">免费进入</span>';
        html += '<span style="color:#666;">当前境界可挑战 ' + maxLayer + ' 层</span>';
        html += '</div>';

        html += '<div style="max-height:400px;overflow-y:auto;padding-right:4px;">';

        for (var layer = 0; layer < maxLayer; layer++) {
            var cleared = isLayerCleared(realmId, layer);
            var swept = isLayerSweptToday(realmId, layer);
            var difficulty = getLayerDifficulty(layer);
            var diffName = getDifficultyName(layer);
            var diffColor = difficulty === 0 ? '#4ade80' : difficulty === 1 ? '#fbbf24' : '#f87171';
            var canEnter = cleared || (layer === 0) || (layer > 0 && isLayerCleared(realmId, layer - 1));

            var realmIndexOfLayer = Math.floor(layer / CONFIG.layersPerRealmIndex);
            var layerInRealm = (layer % CONFIG.layersPerRealmIndex) + 1;
            var borderColor = '#333';
            var bgColor = '#1a1a2e';
            if (cleared) {
                borderColor = '#4ade80';
                bgColor = '#0a2a1a';
            } else if (canEnter) {
                borderColor = realm.color;
                bgColor = realm.color + '15';
            } else {
                bgColor = '#111';
            }

            html += '<div style="display:flex;align-items:center;background:' + bgColor + ';border:1px solid ' + borderColor + ';border-radius:6px;padding:8px 10px;margin-bottom:6px;';
            if (!canEnter && !cleared) html += 'opacity:0.5;';
            html += '">';

            html += '<div style="flex:1;">';
            html += '<div style="display:flex;align-items:center;gap:8px;">';
            html += '<span style="color:#ffd700;font-size:12px;font-weight:bold;">第' + (layer + 1) + '层</span>';
            if (cleared) {
                html += '<span style="color:#4ade80;font-size:12px;">✅</span>';
            } else if (!canEnter) {
                html += '<span style="color:#666;font-size:12px;">🔒</span>';
            }
            html += '<span style="color:' + diffColor + ';font-size:11px;">' + diffName + '</span>';
            html += '<span style="color:#666;font-size:10px;">境界' + (realmIndexOfLayer + 1) + '·第' + layerInRealm + '层</span>';
            html += '</div>';
            html += '</div>';

            html += '<div style="display:flex;gap:6px;">';
            if (cleared) {
                if (swept) {
                    html += '<button class="btn btn-sm" disabled style="background:#333;color:#666;border:none;border-radius:4px;padding:3px 8px;font-size:10px;">已扫荡</button>';
                } else {
                    html += '<button class="btn btn-sm" onclick="event.stopPropagation();MysticRealm.sweepLayer(\'' + realmId + '\',' + layer + ')" style="background:#06b6d4;color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:10px;">扫荡</button>';
                }
                html += '<button class="btn btn-sm" onclick="event.stopPropagation();MysticRealm.enterLayer(\'' + realmId + '\',' + layer + ')" style="background:' + realm.color + ';color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:10px;">再战</button>';
            } else if (canEnter) {
                html += '<button class="btn btn-sm" onclick="event.stopPropagation();MysticRealm.enterLayer(\'' + realmId + '\',' + layer + ')" style="background:' + realm.color + ';color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:10px;">挑战</button>';
            } else {
                html += '<button class="btn btn-sm" disabled style="background:#222;color:#444;border:none;border-radius:4px;padding:3px 8px;font-size:10px;">锁定</button>';
            }
            html += '</div>';

            html += '</div>';
        }

        html += '</div>';

        container.innerHTML = html;
    }

    /* ===========================================
       渲染 - 无尽试炼入口
       =========================================== */
    function renderEndlessTrial() {
        checkDailyRefresh();
        var container = document.getElementById('realm-content');
        if (!container) return;

        var maxLayer = Game.data.endlessTrialMaxLayer || 0;

        var html = '';
        html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">';
        html += '<button class="btn btn-sm" onclick="MysticRealm.render()" style="background:#333;color:#ccc;border:none;border-radius:4px;padding:4px 10px;font-size:12px;">← 返回</button>';
        html += '<span style="color:' + ENDLESS_CONFIG.color + ';font-size:16px;font-weight:bold;">' + ENDLESS_CONFIG.icon + ' ' + ENDLESS_CONFIG.name + '</span>';
        html += '</div>';

        html += '<div style="background:linear-gradient(180deg,#0a0800,#1a1000,#0a0800);border:2px solid ' + ENDLESS_CONFIG.borderColor + ';border-radius:10px;padding:16px;box-shadow:0 0 30px rgba(212,160,23,0.15);">';

        html += '<div style="text-align:center;margin-bottom:14px;">';
        html += '<div style="font-size:36px;margin-bottom:6px;">🔥</div>';
        html += '<div style="color:' + ENDLESS_CONFIG.color + ';font-size:18px;font-weight:bold;text-shadow:0 0 10px rgba(255,215,0,0.3);">无 尽 试 炼</div>';
        html += '<div style="color:#999;font-size:11px;margin-top:4px;">挑战永无止境，每5层BOSS · 每10层大BOSS</div>';
        html += '</div>';

        html += '<div style="background:rgba(255,255,255,0.03);border-radius:6px;padding:10px;margin-bottom:12px;">';
        html += '<div style="display:flex;justify-content:space-around;text-align:center;">';
        html += '<div><div style="color:#ffd700;font-size:20px;font-weight:bold;">' + maxLayer + '</div><div style="color:#666;font-size:10px;">最高通关</div></div>';
        html += '<div><div style="color:#4ade80;font-size:20px;font-weight:bold;">免费</div><div style="color:#666;font-size:10px;">进入</div></div>';
        html += '</div></div>';

        html += '<div style="color:#888;font-size:11px;line-height:1.6;margin-bottom:14px;">';
        html += '<div>• 不限层数，从第1层持续挑战</div>';
        html += '<div>• 每5层BOSS战（概率掉落<span style="color:#ffd700;">试炼武器</span>）</div>';
        html += '<div>• 每10层大BOSS（概率掉落<span style="color:#c084fc;">试炼套装</span>）</div>';
        html += '<div>• 装备品质随层数提升</div>';
        html += '<div>• <span style="color:#f87171;">死亡或退出后结算奖励</span></div>';
        html += '<div>• <span style="color:#f87171;">不产出灵兽口粮</span></div>';
        html += '</div>';

        html += '<button class="btn" onclick="MysticRealm.startEndlessTrial()" style="width:100%;background:linear-gradient(135deg,#d4a017,#b8860b);color:#000;font-weight:bold;border:none;border-radius:8px;padding:12px;font-size:15px;">开始试炼（免费进入）</button>';

        html += '</div>';

        container.innerHTML = html;
    }

    /* ===========================================
       进入层（常规秘境）
       =========================================== */
    function enterLayer(realmId, layer) {
        checkDailyRefresh();
        if (state.inBattle) {
            alert('正在战斗中');
            return;
        }
        var realm = null;
        for (var i = 0; i < REALMS.length; i++) {
            if (REALMS[i].id === realmId) { realm = REALMS[i]; break; }
        }
        if (!realm) return;

        if (layer > 0 && !isLayerCleared(realmId, layer - 1)) {
            alert('请先通关第' + layer + '层');
            return;
        }

        state.currentRealm = realm;
        state.currentLayer = layer;
        state.currentWave = 0;
        state.inBattle = true;
        state.isEndless = false;
        saveState();

        startWave();
    }

    /* ===========================================
       扫荡
       =========================================== */
    function sweepLayer(realmId, layer) {
        checkDailyRefresh();
        if (!isLayerCleared(realmId, layer)) {
            alert('该层尚未通关，无法扫荡');
            return;
        }
        if (isLayerSweptToday(realmId, layer)) {
            alert('今日已扫荡过该层');
            return;
        }

        var realm = null;
        for (var i = 0; i < REALMS.length; i++) {
            if (REALMS[i].id === realmId) { realm = REALMS[i]; break; }
        }
        if (!realm) return;

        var realmIdx = Math.min(Math.floor(layer / CONFIG.layersPerRealmIndex), REALM_BASE.length - 1);
        var layerInRealm = layer % CONFIG.layersPerRealmIndex;
        var layerMult = layerInRealm === 0 ? 0.8 : layerInRealm === 1 ? 1.0 : 1.3;
        var incFactor = 1 + layer * 0.05;
        var totalMod = layerMult * incFactor * CONFIG.sweepRate;

        var totalStones = 0, totalExp = 0, totalFood = 0, gotEquip = false, gotSkill = false;

        for (var w = 0; w < realm.enemies.length; w++) {
            var dropM = realm.enemies[w].dropM || 1.0;
            var waveMod = totalMod * dropM;

            totalStones += Math.floor((5 + Math.random() * 15) * waveMod);
            totalExp += Math.floor((10 + Math.random() * 30) * waveMod);

            switch (realm.lootType) {
                case 'spiritStones':
                    var range = realm.lootRange;
                    totalStones += Math.floor((range[0] + Math.random() * (range[1] - range[0])) * waveMod);
                    break;
                case 'equipment':
                    if (Math.random() < 0.4 * dropM) gotEquip = true;
                    break;
                case 'skillBook':
                    if (Math.random() < 0.35 * dropM) gotSkill = true;
                    break;
                case 'beastFood':
                    totalFood += Math.floor((2 + layer * 0.6 + Math.random() * 6) * dropM);
                    if (layer >= 6 && Math.random() < 0.2 * dropM) {
                        Game.data.beastEvolutionStones = (Game.data.beastEvolutionStones || 0) + 1;
                    }
                    if (layer >= 12 && Math.random() < 0.1 * dropM) {
                        Game.data.beastCultivationPills = (Game.data.beastCultivationPills || 0) + 1;
                    }
                    break;
            }
        }

        if (totalStones > 0) Game.addSpirit(totalStones);
        if (totalExp > 0) Game.addExperience(totalExp);
        if (totalFood > 0) {
            Game.data.beastFood = (Game.data.beastFood || 0) + totalFood;
        }
        if (gotEquip && realm.lootTierRange) {
            var eqTier = realm.lootTierRange[0] + Math.floor(Math.random() * (realm.lootTierRange[1] - realm.lootTierRange[0] + 1));
            addRealmEquipment(eqTier);
        }
        if (gotSkill) {
            Game.addSpirit(Math.floor((30 + Math.random() * 80) * totalMod));
            Game.addExperience(Math.floor((30 + Math.random() * 80) * totalMod * 0.5));
        }

        markLayerSwept(realmId, layer);
        renderLayerSelect(realmId);

        showToast('扫荡完成！收益已折算（×80%）', 2000);
    }

    /* ===========================================
       生成层敌人（动态：基于玩家有效属性）
       =========================================== */
    function getLayerEnemies(realm, layer) {
        var layerInRealm = layer % CONFIG.layersPerRealmIndex;   // 0=简单,1=普通,2=困难
        var stats = getRealmEnemyStats(Game.data.realmIndex, layerInRealm);

        var enemies = [];
        for (var i = 0; i < realm.enemies.length; i++) {
            var eBase = realm.enemies[i];
            // 同层各波次怪物属性有小幅随机波动
            var rnd = 0.95 + Math.random() * 0.1;
            enemies.push({
                name: eBase.name + ' Lv.' + (layer + 1),
                hp:    Math.floor(stats.hp  * rnd),
                maxHp: Math.floor(stats.hp  * rnd),
                atk:   Math.floor(stats.atk * rnd),
                def:   Math.floor(stats.def * rnd),
                dropMultiplier: (eBase.dropM || 1.0),
                xpBonus: Math.floor(10 * ([0.8, 1.0, 1.3][layerInRealm])),
            });
        }
        return enemies;
    }

    /* ===========================================
       开始一波战斗
       =========================================== */
    function startWave() {
        var realm = state.currentRealm;
        var waveIdx = state.currentWave;
        var enemies = getLayerEnemies(realm, state.currentLayer);

        if (waveIdx >= enemies.length) {
            onLayerCleared();
            return;
        }

        var enemyData = enemies[waveIdx];
        showBattleUI(realm, waveIdx, enemyData, enemies.length);
    }

    /* ===========================================
       战斗UI — 重做：视觉化血条+伤害飘字
       =========================================== */
    function showBattleUI(realm, waveIdx, enemyData, totalWaves) {
        var container = document.getElementById('realm-content');
        if (!container) return;

        var diffName = getDifficultyName(state.currentLayer);

        // 计算玩家显示血量
        var effectiveStats = (typeof Cultivation !== 'undefined' && Cultivation.getEffectiveStats)
            ? Cultivation.getEffectiveStats()
            : { hp: 100 };
        var pDisplayMaxHp = effectiveStats.hp;

        state._enemyData = enemyData;
        state._autoBattle = false;

        container.innerHTML = '';

        // 标题
        var headerDiv = el('div', {
            style: 'text-align:center;margin-bottom:12px;padding:8px;' +
                'background:rgba(' + hexToRgb(realm.color) + ',0.08);border-radius:var(--radius-md);' +
                'border:1px solid ' + realm.color + '33;'
        });
        headerDiv.innerHTML = '<div style="font-size:18px;color:' + realm.color + ';font-weight:bold;font-family:var(--font-title);letter-spacing:2px;">' +
            realm.icon + ' ' + realm.name + '</div>' +
            '<div style="color:#aaa;font-size:12px;margin-top:2px;">第 ' + (state.currentLayer + 1) + ' 层（' + diffName + '） · 波次 ' + (waveIdx + 1) + '/' + totalWaves + '</div>';
        container.appendChild(headerDiv);

        // 怪物区域
        var monsterDiv = el('div', {
            style: 'margin-bottom:12px;padding:12px;border-radius:var(--radius-md);' +
                'background:rgba(10,10,25,0.5);border:1px solid rgba(231,76,60,0.3);'
        });
        monsterDiv.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
            '<span style="font-size:14px;color:#e74c3c;font-weight:bold;">👹 ' + enemyData.name + '</span>' +
            '<span style="font-size:11px;color:#999;">⚔️' + enemyData.atk + ' 🛡️' + enemyData.def + '</span>' +
            '</div>';
        var mBarWrap = el('div', { style: 'position:relative;' });
        var mBar = createProgressBar(enemyData.hp, enemyData.maxHp,
            'linear-gradient(90deg,#8b0000,#e74c3c)',
            formatNumber(enemyData.hp) + ' / ' + formatNumber(enemyData.maxHp));
        mBar.id = 'realm-enemy-hp-bar';
        mBarWrap.appendChild(mBar);
        monsterDiv.appendChild(mBarWrap);
        // 伤害飘字容器
        monsterDiv.appendChild(el('div', { id: 'realm-dmg-float', style: 'position:relative;height:0;overflow:visible;' }));
        container.appendChild(monsterDiv);

        // 玩家区域
        var playerDiv = el('div', {
            style: 'margin-bottom:12px;padding:12px;border-radius:var(--radius-md);' +
                'background:rgba(10,10,25,0.5);border:1px solid rgba(46,204,113,0.3);'
        });
        playerDiv.innerHTML = '<div style="font-size:14px;color:#2ecc71;font-weight:bold;margin-bottom:6px;">🧘 角色生命</div>';
        var pBarWrap = el('div', { style: 'position:relative;' });
        var pBar = createProgressBar(pDisplayMaxHp, pDisplayMaxHp,
            'linear-gradient(90deg,#1e8449,#2ecc71)',
            formatNumber(pDisplayMaxHp) + ' / ' + formatNumber(pDisplayMaxHp));
        pBar.id = 'realm-player-hp-bar';
        pBarWrap.appendChild(pBar);
        playerDiv.appendChild(pBarWrap);
        container.appendChild(playerDiv);

        // 战斗日志（窄条，只显示关键信息）
        var logDiv = el('div', {
            id: 'realm-battle-log',
            style: 'max-height:80px;overflow-y:auto;color:#aaa;font-size:11px;margin-bottom:10px;' +
                'padding:8px 10px;background:rgba(0,0,0,0.3);border-radius:6px;' +
                'border:1px solid rgba(255,255,255,0.05);scrollbar-width:thin;'
        });
        container.appendChild(logDiv);

        // 操作按钮行
        var btnRow = el('div', { style: 'display:flex;gap:8px;' });
        btnRow.innerHTML =
            '<button id="realm-auto-btn" style="flex:1;padding:10px;border-radius:8px;font-size:13px;' +
            'background:#555;color:#ccc;border:none;cursor:pointer;font-family:inherit;">⚡ 自动</button>' +
            '<button id="realm-attack-btn" style="flex:2;padding:10px;border-radius:8px;font-size:14px;' +
            'font-weight:bold;background:' + realm.color + ';color:#fff;border:none;cursor:pointer;font-family:inherit;">⚔️ 攻击</button>' +
            '<button id="realm-flee-btn" style="flex:1;padding:10px;border-radius:8px;font-size:13px;' +
            'background:#444;color:#aaa;border:none;cursor:pointer;font-family:inherit;">🏃 撤退</button>';
        container.appendChild(btnRow);

        // 绑定事件
        setTimeout(function () {
            var autoBtn = document.getElementById('realm-auto-btn');
            if (autoBtn) autoBtn.onclick = function () { toggleAutoBattle(); };
            var atkBtn = document.getElementById('realm-attack-btn');
            if (atkBtn) atkBtn.onclick = function () { doAttack(); };
            var fleeBtn = document.getElementById('realm-flee-btn');
            if (fleeBtn) fleeBtn.onclick = function () { fleeRealm(); };
        }, 0);
    }

    /** 简易颜色转RGB（用于背景透明度） */
    function hexToRgb(hex) {
        var r = 0, g = 0, b = 0;
        if (hex.length === 7) {
            r = parseInt(hex.substring(1, 3), 16);
            g = parseInt(hex.substring(3, 5), 16);
            b = parseInt(hex.substring(5, 7), 16);
        }
        return r + ',' + g + ',' + b;
    }

    /* ===========================================
       DOM helper
       =========================================== */
    function el(tag, attrs) {
        var e = document.createElement(tag);
        for (var k in attrs) {
            if (k === 'style') e.style.cssText = attrs[k];
            else if (k === 'innerHTML') e.innerHTML = attrs[k];
            else if (k === 'textContent') e.textContent = attrs[k];
            else if (k === 'onclick') e.setAttribute('onclick', attrs[k]);
            else if (k === 'className') e.className = attrs[k];
            else if (k === 'id') e.id = attrs[k];
            else e.setAttribute(k, attrs[k]);
        }
        return e;
    }

    /* ===========================================
       自动战斗切换
       =========================================== */
    function toggleAutoBattle() {
        state._autoBattle = !state._autoBattle;
        var btn = document.getElementById('realm-auto-btn');
        if (btn) {
            btn.textContent = state._autoBattle ? '⏸ 停止' : '⚡ 自动';
            btn.style.background = state._autoBattle ? '#d4a017' : '#555';
            btn.style.color = state._autoBattle ? '#000' : '#ccc';
        }
        if (state._autoBattle) {
            doAttack();
        } else {
            clearAutoBattleTimer();
        }
    }

    function clearAutoBattleTimer() {
        if (state._autoTimer) {
            clearTimeout(state._autoTimer);
            state._autoTimer = null;
        }
    }

    /* ===========================================
       攻击（通用 - 常规秘境 + 无尽试炼）
       =========================================== */
    function doAttack() {
        if (!state.inBattle || !Game) return;
        if (!state._enemyData) return;

        var enemyData = state._enemyData;
        var isEndless = state.isEndless;

        // 攻击/防御/生命加成计算（与挂机战斗同源）
        var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus) ? Sect.getSectBonus() : { atkPct: 0, defPct: 0, hpPct: 0 };
        var activeBuffs = (typeof Sect !== 'undefined' && Sect.getActiveBuffs) ? Sect.getActiveBuffs() : { atkPct: 0, defPct: 0, hpPct: 0 };
        var talentEff = (typeof Talents !== 'undefined') ? Talents.getEffects() : { atkPct: 0, defPct: 0, hpPct: 0, critRate: 0 };
        var skillAtkBuff = (typeof Skills !== 'undefined') ? Skills.getBuffValue('buff_atk') : 0;
        var skillAllBuff = (typeof Skills !== 'undefined') ? Skills.getBuffValue('buff_all') : 0;
        var totalAtkPct = sectBonus.atkPct + activeBuffs.atkPct + talentEff.atkPct + skillAtkBuff + skillAllBuff;
        var totalDefPct = sectBonus.defPct + activeBuffs.defPct + talentEff.defPct + skillAllBuff;
        var totalHpPct = sectBonus.hpPct + activeBuffs.hpPct + talentEff.hpPct + skillAllBuff;

        if (typeof Equipment !== 'undefined') {
            var setBonuses = Equipment.getActiveSetBonuses();
            for (var si = 0; si < setBonuses.length; si++) {
                var se = setBonuses[si].effects;
                if (se.atkPct) totalAtkPct += se.atkPct;
                if (se.defPct) totalDefPct += se.defPct;
                if (se.hpPct) totalHpPct += se.hpPct;
            }
        }

        // 复用 Cultivation 的统一属性计算（与挂机战斗同源）
        var effectiveStats = (typeof Cultivation !== 'undefined' && Cultivation.getEffectiveStats)
            ? Cultivation.getEffectiveStats()
            : { atk: 10, def: 5, hp: 100, critRate: 0.05 };

        var pAtk = effectiveStats.atk;
        var pDef = effectiveStats.def;
        var pMaxHp = effectiveStats.hp;
        var totalCritRate = effectiveStats.critRate;

        // 玩家攻击（与挂机战斗公式对齐：atk * 随机 ±20% - 怪物防御 * 0.3）
        var pRaw = pAtk * (0.8 + Math.random() * 0.4);
        var pDmg = Math.max(1, Math.floor(pRaw - enemyData.def * 0.3));
        var crit = Math.random() < totalCritRate;
        if (crit) pDmg = Math.floor(pDmg * 1.5);

        enemyData.hp -= pDmg;

        // 伤害飘字
        var floatContainer = document.getElementById('realm-dmg-float');
        if (floatContainer) {
            var floatText = el('div', {
                style: 'position:absolute;left:' + (20 + Math.random() * 40) + 'px;top:-10px;' +
                    'font-size:16px;font-weight:bold;color:' + (crit ? '#ffd700' : '#ff6666') + ';' +
                    'text-shadow:0 0 10px ' + (crit ? 'rgba(255,215,0,0.8)' : 'rgba(255,100,100,0.6)') + ';' +
                    'pointer-events:none;white-space:nowrap;z-index:10;' +
                    'animation:dmgFloat 0.8s ease-out forwards;',
                textContent: (crit ? '暴击！' : '') + '-' + pDmg
            });
            floatContainer.appendChild(floatText);
            setTimeout(function () { floatText.remove(); }, 900);
        }

        var logEl = document.getElementById('realm-battle-log');
        var log = '<div>';
        if (crit) log += '<span style="color:#fbbf24;">暴击！</span>';
        log += '你攻击 ' + enemyData.name + ' 造成 <span style="color:#f87171;">' + pDmg + '</span> 点伤害</div>';

        // 更新敌人HP条
        updateRealmEnemyBar();

        // 检查敌人死亡
        if (enemyData.hp <= 0) {
            enemyData.hp = 0;
            log += '<div style="color:#4ade80;">击败了 ' + enemyData.name + '！</div>';
            if (logEl) { logEl.innerHTML += log; logEl.scrollTop = logEl.scrollHeight; }
            clearAutoBattleTimer();

            if (isEndless) {
                giveEndlessWaveReward(state.endlessWave, enemyData.isBoss, enemyData.isSuperBoss);
                Game.data.hp = Math.min(pMaxHp, Game.data.hp + Math.floor(pMaxHp * (enemyData.isSuperBoss ? 0.5 : enemyData.isBoss ? 0.35 : 0.2)));
                if (state.endlessWave > (Game.data.endlessTrialMaxLayer || 0)) Game.data.endlessTrialMaxLayer = state.endlessWave;
                state.endlessWave++;
                setTimeout(function () { startEndlessWave(); }, 800);
            } else {
                giveWaveReward(enemyData);
                var healPct = 0.35 - Game.data.realmIndex * 0.015;   // 35%→21.5% 梯度回血
                Game.data.hp = Math.min(pMaxHp, Game.data.hp + Math.floor(pMaxHp * healPct));
                state.currentWave++;
                if (state.currentWave >= getLayerEnemies(state.currentRealm, state.currentLayer).length) {
                    onLayerCleared();
                } else {
                    setTimeout(function () { startWave(); }, 800);
                }
            }
            return;
        }

        // 敌人反击（与挂机战斗公式对齐：怪物atk * 随机 - 玩家防御 * 0.3）
        var eDmg = Math.max(1, Math.floor(enemyData.atk * (0.9 + Math.random() * 0.2) - pDef * 0.3));
        if (Game.data.skillShield && Game.data.skillShield > 0) {
            var absorbed = Math.min(Game.data.skillShield, eDmg);
            Game.data.skillShield -= absorbed;
            eDmg -= absorbed;
            if (absorbed > 0) log += '<div style="color:#38bdf8;">护盾吸收 ' + absorbed + ' 点伤害</div>';
        }

        Game.data.hp = Math.max(0, Game.data.hp - eDmg);
        log += '<div>' + enemyData.name + ' 反击造成 <span style="color:#f87171;">' + eDmg + '</span> 点伤害</div>';

        // 更新玩家HP条
        updateRealmPlayerBar();

        if (Game.data.hp <= 0) {
            log += '<div style="color:#f87171;">你被击败了！</div>';
            if (logEl) { logEl.innerHTML += log; logEl.scrollTop = logEl.scrollHeight; }
            clearAutoBattleTimer();
            if (isEndless) { onEndlessDeath(); } else { onRealmFailed(); }
            return;
        }

        if (logEl) { logEl.innerHTML += log; logEl.scrollTop = logEl.scrollHeight; }

        // Auto-battle: schedule next attack
        if (state._autoBattle) {
            state._autoTimer = setTimeout(function () { doAttack(); }, 1500);
        }
    }

    /* ===========================================
       更新敌人HP血条
       =========================================== */
    function updateRealmEnemyBar() {
        var bar = document.getElementById('realm-enemy-hp-bar');
        if (!bar || !state._enemyData) return;
        var fill = bar.querySelector('div');
        if (fill) {
            fill.style.width = Math.max(0, (state._enemyData.hp / state._enemyData.maxHp) * 100) + '%';
        }
        var label = bar.querySelectorAll('div')[1];
        if (label) {
            label.textContent = formatNumber(Math.max(0, state._enemyData.hp)) + ' / ' + formatNumber(state._enemyData.maxHp);
        }
    }

    /* ===========================================
       更新玩家HP血条
       =========================================== */
    function updateRealmPlayerBar() {
        var bar = document.getElementById('realm-player-hp-bar');
        if (!bar) return;
        var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus) ? Sect.getSectBonus() : { hpPct: 0 };
        var activeBuffs = (typeof Sect !== 'undefined' && Sect.getActiveBuffs) ? Sect.getActiveBuffs() : { hpPct: 0 };
        var talentEff = (typeof Talents !== 'undefined') ? Talents.getEffects() : { hpPct: 0 };
        var skillAllBuff = (typeof Skills !== 'undefined') ? Skills.getBuffValue('buff_all') : 0;
        var totalHpPct = sectBonus.hpPct + activeBuffs.hpPct + talentEff.hpPct + skillAllBuff;
        var pDisplayMaxHp = Math.floor((Game.data.hp || 100) * (1 + totalHpPct / 100));
        var fill = bar.querySelector('div');
        if (fill) {
            fill.style.width = Math.max(0, (Game.data.hp / pDisplayMaxHp) * 100) + '%';
        }
        var label = bar.querySelectorAll('div')[1];
        if (label) {
            label.textContent = formatNumber(Game.data.hp) + ' / ' + formatNumber(pDisplayMaxHp);
        }
    }

    /* ===========================================
       波次奖励（常规秘境）
       =========================================== */
    function giveWaveReward(enemyData) {
        var realm = state.currentRealm;
        if (!realm || !Game) return;

        var mul = enemyData.dropMultiplier || 1.0;
        var layer = state.currentLayer;

        switch (realm.lootType) {
            case 'spiritStones':
                var range = realm.lootRange;
                var realmScale = 1 + Game.data.realmIndex * 0.3;
                var stones = Math.floor((range[0] + Math.random() * (range[1] - range[0])) * mul * realmScale);
                Game.addSpirit(stones);
                break;
            case 'equipment':
                if (Math.random() < 0.4 * mul) {
                    var eqTier = realm.lootTierRange[0] + Math.floor(Math.random() * (realm.lootTierRange[1] - realm.lootTierRange[0] + 1));
                    addRealmEquipment(eqTier);
                }
                break;
            case 'skillBook':
                if (Math.random() < 0.35 * mul) {
                    var sBonus = Math.floor((30 + Math.random() * 80) * mul);
                    Game.addSpirit(sBonus);
                    Game.addExperience(Math.floor(sBonus * 0.5));
                }
                break;
            case 'beastFood':
                var food = Math.floor((2 + layer * 0.6 + Math.random() * 6) * mul);
                Game.data.beastFood = (Game.data.beastFood || 0) + food;
                if (layer >= 6 && Math.random() < 0.2 * mul) {
                    Game.data.beastEvolutionStones = (Game.data.beastEvolutionStones || 0) + 1;
                }
                if (layer >= 12 && Math.random() < 0.1 * mul) {
                    Game.data.beastCultivationPills = (Game.data.beastCultivationPills || 0) + 1;
                }
                break;
        }

        var realmScale = 1 + Game.data.realmIndex * 0.3;
        var baseStones = Math.floor((5 + Math.random() * 15) * mul * realmScale);
        var baseExp = Math.floor((10 + Math.random() * 30) * mul * (1 + Game.data.realmIndex * 0.25));
        Game.addSpirit(baseStones);
        Game.addExperience(baseExp);
    }

    /* ===========================================
       无尽试炼波次奖励
       =========================================== */
    function giveEndlessWaveReward(waveNum, isBoss, isSuperBoss) {
        if (!Game) return;

        var mul = 1 + waveNum * 0.08;

        var stones = Math.floor((30 + waveNum * 10 + Math.random() * waveNum * 15) * mul);
        Game.addSpirit(stones);
        state.endlessRewards.push({ type: '灵石', value: stones });

        var exp = Math.floor((20 + waveNum * 8 + Math.random() * waveNum * 10) * mul);
        Game.addExperience(exp);
        state.endlessRewards.push({ type: '经验', value: exp });

        var eqTier = 1;
        if (waveNum >= 20) eqTier = 3;
        else if (waveNum >= 10) eqTier = 2;

        if (isBoss) {
            if (Math.random() < 0.4) {
                addTrialWeapon(waveNum);
                state.endlessRewards.push({ type: '试炼武器', value: 1 });
            }
        }
        if (isSuperBoss) {
            if (Math.random() < 0.35) {
                addTrialSetPiece(waveNum);
                state.endlessRewards.push({ type: '试炼套装', value: 1 });
            }
        }

        if (Math.random() < 0.3 * mul) {
            addRealmEquipment(eqTier);
            state.endlessRewards.push({ type: '装备', value: 1 });
        }
    }

    /* ===========================================
       试炼武器
       =========================================== */
    function addTrialWeapon(waveNum) {
        if (!Game) return;
        var affix = TRIAL_AFFIXES[Math.floor(Math.random() * TRIAL_AFFIXES.length)];
        var names = ['深渊', '炼狱', '破晓', '暗影', '天罚', '寂灭', '混沌', '永劫'];
        var name = names[Math.floor(Math.random() * names.length)] + '之刃';
        var tier = waveNum >= 20 ? 3 : waveNum >= 10 ? 2 : 1;
        var qualityIndex = tier - 1 + (Math.random() < 0.3 ? 1 : 0);
        if (qualityIndex > 3) qualityIndex = 3;
        var multVals = [1.0, 1.5, 2.0, 3.0];
        var mult = multVals[qualityIndex] || 1.0;
        var qualityNames = ['凡品', '灵品', '仙品', '神品'];
        var baseAtk = Math.floor((waveNum * 4 + Math.random() * waveNum * 3) * mult);

        var eq = {
            id: Date.now() + '_' + Math.floor(Math.random() * 10000),
            name: qualityNames[qualityIndex] + ' · ' + name + '（深渊）',
            quality: qualityIndex,
            slot: 0,
            baseAtk: baseAtk,
            baseDef: Math.floor(baseAtk * 0.2),
            baseHp: Math.floor(baseAtk * 2),
            atk: baseAtk,
            def: Math.floor(baseAtk * 0.2),
            hp: Math.floor(baseAtk * 2),
            enhance: 0,
            tier: tier,
            mapIndex: tier - 1,
            effects: [{ name: affix.name, key: affix.key, value: affix.value }],
            setName: null,
            setSlotName: null,
            isTrial: true,
        };

        Game.data.inventory.push(eq);
    }

    /* ===========================================
       试炼套装部件
       =========================================== */
    function addTrialSetPiece(waveNum) {
        if (!Game) return;
        var slots = [1, 2, 3, 4, 5];
        var slot = slots[Math.floor(Math.random() * slots.length)];
        var slotNames = ['甲', '盔', '戒', '坠', '带'];
        var slotIdx = slot === 1 ? 0 : slot === 2 ? 1 : slot === 3 ? 2 : slot === 4 ? 3 : 4;

        var tier = waveNum >= 20 ? 3 : waveNum >= 10 ? 2 : 1;
        var qualityIndex = tier - 1 + (Math.random() < 0.3 ? 1 : 0);
        if (qualityIndex > 3) qualityIndex = 3;
        var multVals = [1.0, 1.5, 2.0, 3.0];
        var mult = multVals[qualityIndex] || 1.0;
        var qualityNames = ['凡品', '灵品', '仙品', '神品'];

        var baseAtk = Math.floor((waveNum * 2 + Math.random() * waveNum) * mult);
        var baseDef = Math.floor((waveNum * 3 + Math.random() * waveNum * 2) * mult);
        var baseHp = Math.floor((waveNum * 8 + Math.random() * waveNum * 5) * mult);

        var affix = TRIAL_AFFIXES[Math.floor(Math.random() * TRIAL_AFFIXES.length)];

        var eq = {
            id: Date.now() + '_' + Math.floor(Math.random() * 10000),
            name: qualityNames[qualityIndex] + ' · 试炼' + slotNames[slotIdx] + '（深渊）',
            quality: qualityIndex,
            slot: slot,
            baseAtk: baseAtk,
            baseDef: baseDef,
            baseHp: baseHp,
            atk: baseAtk,
            def: baseDef,
            hp: baseHp,
            enhance: 0,
            tier: tier,
            mapIndex: tier - 1,
            effects: [{ name: affix.name, key: affix.key, value: affix.value }],
            setName: '试炼套装',
            setSlotName: slotNames[slotIdx],
            isTrial: true,
        };

        Game.data.inventory.push(eq);
    }

    /* ===========================================
       添加秘境掉落装备
       =========================================== */
    function addRealmEquipment(tier) {
        var slotNames = ['weapon', 'armor', 'helmet', 'ring', 'amulet', 'belt'];
        var slotIndex = Math.floor(Math.random() * 6);
        var tierNames = { 1: '凡品', 2: '灵品', 3: '仙品' };
        var slotDisplay = { 0: '剑', 1: '甲', 2: '盔', 3: '戒', 4: '坠', 5: '带' };
        var names = ['玄铁', '流云', '破军', '星陨', '天罡', '紫霄', '龙渊', '凤鸣'];

        var qualityIndex = tier === 1 ? Math.floor(Math.random() * 2) :
                           tier === 2 ? 1 + Math.floor(Math.random() * 2) :
                           2 + Math.floor(Math.random() * 2);

        var multVals = [1.0, 1.5, 2.0, 3.0];
        var mult = multVals[qualityIndex] || 1.0;
        var baseAtk = Math.floor((tier * 3 + Math.random() * tier * 5) * mult);
        var baseDef = Math.floor((tier * 2 + Math.random() * tier * 3) * mult);
        var baseHp  = Math.floor((tier * 10 + Math.random() * tier * 10) * mult);

        var effects = [];
        if (tier >= 2 && Math.random() < 0.3) {
            effects.push({ name: '暴击率', key: 'critRate', value: Math.floor(Math.random() * tier * 3) });
        }
        if (tier >= 3 && Math.random() < 0.3) {
            effects.push({ name: '吸血', key: 'lifesteal', value: Math.floor(Math.random() * tier * 2) });
        }

        var eq = {
            id: Date.now() + '_' + Math.floor(Math.random() * 10000),
            name: tierNames[tier] + ' · ' + names[Math.floor(Math.random() * names.length)] + slotDisplay[slotIndex],
            quality: qualityIndex,
            slot: slotIndex,
            baseAtk: baseAtk,
            baseDef: baseDef,
            baseHp: baseHp,
            atk: baseAtk,
            def: baseDef,
            hp: baseHp,
            enhance: 0,
            tier: tier,
            mapIndex: tier - 1,
            effects: effects,
            setName: null,
            setSlotName: null,
        };

        Game.data.inventory.push(eq);
    }

    /* ===========================================
       层通关（常规秘境）
       =========================================== */
    function onLayerCleared() {
        var realm = state.currentRealm;
        var layer = state.currentLayer;
        state.inBattle = false;
        // 先标记通关，再保存
        var isFirstClear = !isLayerCleared(realm.id, layer);
        if (isFirstClear) {
            markLayerCleared(realm.id, layer);
            var firstBonus = 100 + layer * 50 + Math.floor(Math.random() * layer * 30);
            Game.addSpirit(firstBonus);
            if (realm.lootType !== 'beastFood') {
                Game.addExperience(Math.floor(firstBonus * 0.6));
            }
        }
        // 立即保存，确保层数选择界面能读到最新数据
        saveState();
        if (typeof Game !== 'undefined' && Game.saveGame) Game.saveGame();

        var container = document.getElementById('realm-content');
        if (container) {
            var diffName = getDifficultyName(layer);
            var html = '';
            html += '<div style="text-align:center;padding:20px;">';
            html += '<div style="font-size:40px;margin-bottom:10px;">🎉</div>';
            html += '<div style="color:' + realm.color + ';font-size:18px;font-weight:bold;margin-bottom:6px;">' + realm.name + ' 第' + (layer + 1) + '层 通关！</div>';
            html += '<div style="color:#aaa;font-size:12px;margin-bottom:4px;">难度：' + diffName + '</div>';
            if (isFirstClear) {
                html += '<div style="color:#ffd700;font-size:12px;margin-bottom:12px;">首通奖励已领取！</div>';
            }
            html += '<button class="btn" onclick="MysticRealm.renderLayerSelect(\'' + realm.id + '\')" style="background:#4ade80;color:#000;border:none;border-radius:6px;padding:8px 20px;">返回层数选择</button>';
            html += '</div>';
            container.innerHTML = html;
        }
    }

    /* ===========================================
       常规秘境失败
       =========================================== */
    function onRealmFailed() {
        state.inBattle = false;
        saveState();

        var container = document.getElementById('realm-content');
        if (container) {
            var realm = state.currentRealm;
            var html = '';
            html += '<div style="text-align:center;padding:20px;">';
            html += '<div style="font-size:40px;margin-bottom:10px;">💀</div>';
            html += '<div style="color:#f87171;font-size:16px;font-weight:bold;margin-bottom:6px;">探索失败</div>';
            html += '<div style="color:#aaa;font-size:12px;margin-bottom:16px;">你被击败了，部分奖励已获取</div>';
            html += '<button class="btn" onclick="MysticRealm.renderLayerSelect(\'' + (realm ? realm.id : '') + '\')" style="background:#f87171;color:#fff;border:none;border-radius:6px;padding:8px 20px;">返回层数选择</button>';
            html += '</div>';
            container.innerHTML = html;
        }
    }

    /* ===========================================
       撤退
       =========================================== */
    function fleeRealm() {
        clearAutoBattleTimer();
        state._enemyData = null;
        state.inBattle = false;
        state.isEndless = false;
        saveState();
        showToast('已撤退', 1500);
        if (state.currentRealm && !state.isEndless) {
            renderLayerSelect(state.currentRealm.id);
        } else {
            render();
        }
    }

    /* ===================== 无尽试炼 ===================== */

    /* ===========================================
       开始无尽试炼
       =========================================== */
    function startEndlessTrial() {
        checkDailyRefresh();
        if (state.inBattle) {
            alert('正在战斗中');
            return;
        }

        state.inBattle = true;
        state.isEndless = true;
        state.endlessWave = 1;
        state.endlessRewards = [];
        saveState();

        startEndlessWave();
    }

    /* ===========================================
       无尽试炼：开始一波（固定数值，传奇风格递增）
       =========================================== */
    function startEndlessWave() {
        var waveNum = state.endlessWave;
        var isBoss = (waveNum % 5 === 0);
        var isSuperBoss = (waveNum % 10 === 0);

        // 固定基础值 + 每波递增8%
        var baseHp = 1000;
        var baseAtk = 100;
        var baseDef = 40;
        var baseScale = Math.pow(1.08, waveNum - 1);
        var waveHp = Math.floor(baseHp * baseScale);
        var waveAtk = Math.floor(baseAtk * baseScale);
        var waveDef = Math.floor(baseDef * baseScale);

        var enemyData = {
            name: '',
            hp: 0,
            maxHp: 0,
            atk: 0,
            def: 0,
            isBoss: isBoss,
            isSuperBoss: isSuperBoss,
            waveNum: waveNum,
        };

        if (isSuperBoss) {
            enemyData.name = '深渊之主 · 第' + waveNum + '层';
            enemyData.hp    = Math.floor(waveHp * 3.5);
            enemyData.maxHp = enemyData.hp;
            enemyData.atk   = Math.floor(waveAtk * 3.5);
            enemyData.def   = Math.floor(waveDef * 3.5);
        } else if (isBoss) {
            enemyData.name = '深渊守卫 · 第' + waveNum + '层';
            enemyData.hp    = Math.floor(waveHp * 2.0);
            enemyData.maxHp = enemyData.hp;
            enemyData.atk   = Math.floor(waveAtk * 2.0);
            enemyData.def   = Math.floor(waveDef * 2.0);
        } else {
            var names = ['深渊游魂', '暗影魔兵', '虚空行者', '炼狱之牙', '混沌仆从', '深渊爪牙', '裂隙鬼卒'];
            enemyData.name = names[waveNum % names.length] + ' · 第' + waveNum + '层';
            enemyData.hp    = waveHp;
            enemyData.maxHp = enemyData.hp;
            enemyData.atk   = waveAtk;
            enemyData.def   = waveDef;
        }

        state.endlessEnemy = enemyData;
        showEndlessBattleUI(enemyData);
    }

    /* ===========================================
       无尽试炼战斗UI — 挂机战斗风格
       =========================================== */
    function showEndlessBattleUI(enemyData) {
        var container = document.getElementById('realm-content');
        if (!container) return;

        var waveNum = enemyData.waveNum;
        var borderColor = enemyData.isSuperBoss ? '#c084fc' : enemyData.isBoss ? '#ffd700' : ENDLESS_CONFIG.borderColor;
        var titleColor = enemyData.isSuperBoss ? '#c084fc' : enemyData.isBoss ? '#ffd700' : '#f87171';
        var barColor = enemyData.isSuperBoss ? 'linear-gradient(90deg,#6b21a8,#c084fc)' :
                       enemyData.isBoss ? 'linear-gradient(90deg,#b8860b,#ffd700)' :
                       'linear-gradient(90deg,#c0392b,#e74c3c)';

        // Store enemy data
        state._enemyData = enemyData;
        state._autoBattle = false;

        var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus) ? Sect.getSectBonus() : { hpPct: 0 };
        var activeBuffs = (typeof Sect !== 'undefined' && Sect.getActiveBuffs) ? Sect.getActiveBuffs() : { hpPct: 0 };
        var talentEff = (typeof Talents !== 'undefined') ? Talents.getEffects() : { hpPct: 0 };
        var skillAllBuff = (typeof Skills !== 'undefined') ? Skills.getBuffValue('buff_all') : 0;
        var totalHpPct = sectBonus.hpPct + activeBuffs.hpPct + talentEff.hpPct + skillAllBuff;
        var pDisplayMaxHp = Math.floor((Game.data.hp || 100) * (1 + totalHpPct / 100));

        container.innerHTML = '';

        // Wrapper with dark theme
        var wrapper = el('div', { style: 'background:linear-gradient(180deg,#0a0800,#1a1000,#0a0800);border:2px solid ' + borderColor + ';border-radius:10px;padding:16px;box-shadow:0 0 20px rgba(212,160,23,0.15);' });

        // Header
        var header = el('div', { style: 'text-align:center;margin-bottom:10px;' });
        header.innerHTML = '<div style="color:#ffd700;font-size:16px;font-weight:bold;">' + ENDLESS_CONFIG.icon + ' 无尽试炼 · 第' + waveNum + '层</div>';
        if (enemyData.isSuperBoss) {
            header.innerHTML += '<div style="color:#c084fc;font-size:12px;margin-top:2px;">⚡ 大BOSS · 属性大幅跃升 ⚡</div>';
        } else if (enemyData.isBoss) {
            header.innerHTML += '<div style="color:#ffd700;font-size:12px;margin-top:2px;">👑 BOSS 战</div>';
        }
        wrapper.appendChild(header);

        // Monster info
        var monsterDiv = el('div', { id: 'realm-monster-info', style: 'margin-bottom:8px;' });
        monsterDiv.appendChild(el('div', { style: 'font-size:13px;color:' + titleColor + ';font-weight:bold;margin-bottom:4px;', textContent: enemyData.name }));
        var mBar = createProgressBar(enemyData.hp, enemyData.maxHp, barColor,
            formatNumber(enemyData.hp) + ' / ' + formatNumber(enemyData.maxHp));
        mBar.id = 'realm-enemy-hp-bar';
        monsterDiv.appendChild(mBar);
        monsterDiv.appendChild(el('div', {
            style: 'display:flex;gap:16px;color:#999;font-size:11px;margin-top:2px;',
            innerHTML: '<span>攻击 ' + enemyData.atk + '</span><span>防御 ' + enemyData.def + '</span>'
        }));
        wrapper.appendChild(monsterDiv);

        // Player bar
        var playerDiv = el('div', { id: 'realm-player-bar', style: 'margin-bottom:8px;' });
        playerDiv.appendChild(el('div', { style: 'font-size:12px;color:#2ecc71;margin-bottom:3px;', textContent: '角色生命' }));
        var pBar = createProgressBar(Game.data.hp, pDisplayMaxHp,
            'linear-gradient(90deg,#1e8449,#2ecc71)',
            formatNumber(Game.data.hp) + ' / ' + formatNumber(pDisplayMaxHp));
        pBar.id = 'realm-player-hp-bar';
        playerDiv.appendChild(pBar);
        wrapper.appendChild(playerDiv);

        // Battle log
        wrapper.appendChild(el('div', {
            id: 'realm-battle-log',
            style: 'max-height:100px;overflow-y:auto;color:#aaa;font-size:11px;margin-bottom:8px;padding:6px;background:rgba(0,0,0,0.2);border-radius:4px;'
        }));

        // Buttons
        var btnRow = el('div', { style: 'display:flex;gap:8px;' });
        btnRow.appendChild(el('button', {
            id: 'realm-auto-btn', className: 'btn', textContent: '⚡ 自动', onclick: 'MysticRealm.toggleAutoBattle()',
            style: 'background:#555;color:#ccc;border:none;border-radius:6px;padding:8px 14px;font-size:12px;'
        }));
        btnRow.appendChild(el('button', {
            className: 'btn', textContent: '攻击', onclick: 'MysticRealm.doAttack()',
            style: 'background:linear-gradient(135deg,#d4a017,#b8860b);color:#000;font-weight:bold;border:none;border-radius:6px;padding:8px 20px;'
        }));
        btnRow.appendChild(el('button', {
            className: 'btn', textContent: '退出并结算', onclick: 'MysticRealm.exitEndlessTrial()',
            style: 'background:#555;color:#fff;border:none;border-radius:6px;padding:8px 20px;'
        }));
        wrapper.appendChild(btnRow);
        container.appendChild(wrapper);
    }

    /* ===========================================
       无尽试炼死亡
       =========================================== */
    function onEndlessDeath() {
        state.inBattle = false;
        state.isEndless = false;
        var finalWave = state.endlessWave;
        var maxLayer = Game.data.endlessTrialMaxLayer || 0;
        saveState();

        var container = document.getElementById('realm-content');
        if (container) {
            var rewards = state.endlessRewards;
            var totalStones = 0, totalExp = 0, trialWeapons = 0, trialSets = 0, equipments = 0;
            for (var i = 0; i < rewards.length; i++) {
                var r = rewards[i];
                if (r.type === '灵石') totalStones += r.value;
                else if (r.type === '经验') totalExp += r.value;
                else if (r.type === '试炼武器') trialWeapons++;
                else if (r.type === '试炼套装') trialSets++;
                else if (r.type === '装备') equipments++;
            }

            var html = '';
            html += '<div style="background:linear-gradient(180deg,#0a0800,#1a1000,#0a0800);border:2px solid ' + ENDLESS_CONFIG.borderColor + ';border-radius:10px;padding:16px;text-align:center;">';
            html += '<div style="font-size:40px;margin-bottom:10px;">💀</div>';
            html += '<div style="color:#f87171;font-size:18px;font-weight:bold;margin-bottom:6px;">试炼终结</div>';
            html += '<div style="color:#ffd700;font-size:14px;margin-bottom:4px;">达到第 <b>' + finalWave + '</b> 层</div>';
            html += '<div style="color:#999;font-size:11px;margin-bottom:4px;">历史最高：' + maxLayer + ' 层</div>';

            html += '<div style="margin-top:12px;background:rgba(255,255,255,0.03);border-radius:6px;padding:10px;text-align:left;font-size:11px;">';
            html += '<div style="color:#ccc;font-weight:bold;margin-bottom:6px;">结算奖励：</div>';
            html += '<div style="color:#a78bfa;">灵石 +' + totalStones + '</div>';
            html += '<div style="color:#4ade80;">经验 +' + totalExp + '</div>';
            if (trialWeapons > 0) html += '<div style="color:#ffd700;">试炼武器 ×' + trialWeapons + '</div>';
            if (trialSets > 0) html += '<div style="color:#c084fc;">试炼套装部件 ×' + trialSets + '</div>';
            if (equipments > 0) html += '<div style="color:#fff;">普通装备 ×' + equipments + '</div>';
            html += '</div>';

            html += '<button class="btn" onclick="MysticRealm.render()" style="margin-top:12px;background:#d4a017;color:#000;font-weight:bold;border:none;border-radius:6px;padding:8px 20px;">返回秘境列表</button>';
            html += '</div>';

            container.innerHTML = html;
        }
    }

    /* ===========================================
       无尽试炼退出
       =========================================== */
    function exitEndlessTrial() {
        clearAutoBattleTimer();
        state._enemyData = null;
        state.inBattle = false;
        state.isEndless = false;
        var finalWave = state.endlessWave - 1;
        if (finalWave < 1) finalWave = 0;
        if (finalWave > (Game.data.endlessTrialMaxLayer || 0)) {
            Game.data.endlessTrialMaxLayer = finalWave;
        }
        saveState();

        var container = document.getElementById('realm-content');
        if (container) {
            var rewards = state.endlessRewards;
            var totalStones = 0, totalExp = 0, trialWeapons = 0, trialSets = 0, equipments = 0;
            for (var i = 0; i < rewards.length; i++) {
                var r = rewards[i];
                if (r.type === '灵石') totalStones += r.value;
                else if (r.type === '经验') totalExp += r.value;
                else if (r.type === '试炼武器') trialWeapons++;
                else if (r.type === '试炼套装') trialSets++;
                else if (r.type === '装备') equipments++;
            }

            var html = '';
            html += '<div style="background:linear-gradient(180deg,#0a0800,#1a1000,#0a0800);border:2px solid ' + ENDLESS_CONFIG.borderColor + ';border-radius:10px;padding:16px;text-align:center;">';
            html += '<div style="font-size:40px;margin-bottom:10px;">🏁</div>';
            html += '<div style="color:#ffd700;font-size:18px;font-weight:bold;margin-bottom:6px;">已退出试炼</div>';
            html += '<div style="color:#ffd700;font-size:14px;margin-bottom:4px;">达到第 <b>' + finalWave + '</b> 层</div>';

            html += '<div style="margin-top:12px;background:rgba(255,255,255,0.03);border-radius:6px;padding:10px;text-align:left;font-size:11px;">';
            html += '<div style="color:#ccc;font-weight:bold;margin-bottom:6px;">结算奖励：</div>';
            html += '<div style="color:#a78bfa;">灵石 +' + totalStones + '</div>';
            html += '<div style="color:#4ade80;">经验 +' + totalExp + '</div>';
            if (trialWeapons > 0) html += '<div style="color:#ffd700;">试炼武器 ×' + trialWeapons + '</div>';
            if (trialSets > 0) html += '<div style="color:#c084fc;">试炼套装部件 ×' + trialSets + '</div>';
            if (equipments > 0) html += '<div style="color:#fff;">普通装备 ×' + equipments + '</div>';
            html += '</div>';

            html += '<button class="btn" onclick="MysticRealm.render()" style="margin-top:12px;background:#d4a017;color:#000;font-weight:bold;border:none;border-radius:6px;padding:8px 20px;">返回秘境列表</button>';
            html += '</div>';

            container.innerHTML = html;
        }
    }

    /* ===========================================
       公开API
       =========================================== */
    return {
        init: init,
        render: render,
        renderLayerSelect: renderLayerSelect,
        renderEndlessTrial: renderEndlessTrial,
        enterLayer: enterLayer,
        sweepLayer: sweepLayer,
        doAttack: doAttack,
        fleeRealm: fleeRealm,
        startEndlessTrial: startEndlessTrial,
        exitEndlessTrial: exitEndlessTrial,
    };

})();
