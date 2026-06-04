/* ================================================================
   MysticRealm - 秘境系统
   4种秘境类型、多层波次战斗、每日秘境令
   ================================================================ */

var MysticRealm = (function () {
    'use strict';

    /* ===========================================
       配置
       =========================================== */
    var CONFIG = {
        dailyTokens: 5,
        tokenCost: 100,          // 额外购买秘境令的灵石价格
        maxExtraTokens: 10,      // 每日最多额外购买
        refreshHour: 5,          // 每日刷新时间（UTC+8 凌晨5点）
    };

    /* 秘境类型定义 */
    var REALMS = [
        {
            id: 'spirit_stone',
            name: '灵石秘窟',
            desc: '灵气浓郁的矿脉深处，击败守卫可获取大量灵石',
            icon: '💰',
            color: '#4ade80',
            lootType: 'spiritStones',
            lootRange: [50, 200],
            waves: 3,
            enemies: [
                { name: '矿脉守卫·石甲', hp: 80, atk: 12, def: 8, dropMultiplier: 1.0 },
                { name: '矿脉统领·晶岩', hp: 150, atk: 18, def: 12, dropMultiplier: 1.5 },
                { name: '矿脉之主·灵髓', hp: 260, atk: 25, def: 16, dropMultiplier: 2.0 },
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
            waves: 4,
            enemies: [
                { name: '熔岩卫士·赤火', hp: 100, atk: 15, def: 6, dropMultiplier: 1.0 },
                { name: '锻造大师·铁砧', hp: 180, atk: 22, def: 14, dropMultiplier: 1.5 },
                { name: '烈焰统领·锻魂', hp: 300, atk: 28, def: 10, dropMultiplier: 1.8 },
                { name: '熔炉之主·天工', hp: 420, atk: 35, def: 18, dropMultiplier: 2.5 },
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
            waves: 3,
            enemies: [
                { name: '守殿弟子·剑影', hp: 120, atk: 14, def: 8, dropMultiplier: 1.0 },
                { name: '内门长老·传功', hp: 220, atk: 20, def: 15, dropMultiplier: 1.6 },
                { name: '殿主残魂·大能', hp: 350, atk: 30, def: 20, dropMultiplier: 2.2 },
            ],
            unlockStage: 3,
        },
        {
            id: 'beast_wilds',
            name: '万兽荒原',
            desc: '蛮荒妖兽盘踞之地，击败兽群可获得大量经验',
            icon: '🐉',
            color: '#fb923c',
            lootType: 'exp',
            lootRange: [80, 400],
            waves: 5,
            enemies: [
                { name: '荒原妖兽·铁牙', hp: 60, atk: 10, def: 4, dropMultiplier: 0.8 },
                { name: '荒原妖兽·钢爪', hp: 80, atk: 13, def: 5, dropMultiplier: 1.0 },
                { name: '兽群统领·金角', hp: 160, atk: 20, def: 10, dropMultiplier: 1.5 },
                { name: '远古凶兽·裂地', hp: 280, atk: 26, def: 14, dropMultiplier: 2.0 },
                { name: '荒原之主·万兽王', hp: 450, atk: 38, def: 22, dropMultiplier: 3.0 },
            ],
            unlockStage: 4,
        },
    ];

    /* ===========================================
       状态
       =========================================== */
    var state = {
        tokens: 5,
        extraBought: 0,
        lastRefreshDate: '',
        currentRealm: null,
        currentWave: 0,
        inBattle: false,
        clearedRealms: [],  // 今日已通关的秘境ID
    };

    /* 引用外部模块 */
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
       存档读写（从 Game.data 读写，迁移前兼容旧 localStorage）
       =========================================== */
    function loadState() {
        if (Game && Game.data) {
            state.tokens = Game.data.mysticRealmTokens;
            state.extraBought = Game.data.mysticRealmExtraBought;
            state.lastRefreshDate = Game.data.mysticRealmLastRefreshDate;
            state.clearedRealms = Game.data.mysticRealmClearedRealms;
        } else {
            // 回退：Game 未初始化时从 localStorage 读取
            try {
                var raw = localStorage.getItem('mysticRealm');
                if (raw) {
                    var saved = JSON.parse(raw);
                    state.tokens = saved.tokens != null ? saved.tokens : CONFIG.dailyTokens;
                    state.extraBought = saved.extraBought || 0;
                    state.lastRefreshDate = saved.lastRefreshDate || '';
                    state.clearedRealms = saved.clearedRealms || [];
                }
            } catch(e) {}
        }
    }

    function saveState() {
        if (Game && Game.data) {
            Game.data.mysticRealmTokens = state.tokens;
            Game.data.mysticRealmExtraBought = state.extraBought;
            Game.data.mysticRealmLastRefreshDate = state.lastRefreshDate;
            Game.data.mysticRealmClearedRealms = state.clearedRealms;
        }
        // 保留旧 localStorage 作为备份（loadGame 会在迁移后清除）
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
    }

    function getDateStr() {
        var d = new Date();
        // UTC+8 daily refresh at 5am
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
       渲染
       =========================================== */
    function render() {
        checkDailyRefresh();
        var container = document.getElementById('realm-content');
        if (!container) return;

        var html = '';

        // 秘境令
        html += '<div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">';
        html += '<div><span style="color:#a78bfa;font-weight:bold;">秘境令</span><span style="color:#ccc;font-size:12px;margin-left:6px;">（每日' + CONFIG.dailyTokens + '次）</span></div>';
        html += '<div style="display:flex;align-items:center;gap:8px;">';
        html += '<span style="color:#a78bfa;font-size:18px;font-weight:bold;">' + state.tokens + '</span>';
        if (state.extraBought < CONFIG.maxExtraTokens) {
            html += '<button class="btn btn-sm" onclick="MysticRealm.buyToken()" style="background:#4ade80;color:#000;border:none;border-radius:4px;padding:3px 8px;font-size:11px;">灵石购买</button>';
        }
        html += '</div></div>';

        // 秘境列表
        var stage = Game ? Math.min(4, Math.floor(Game.data.realmIndex / 2) + 1) : 1;
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
        for (var i = 0; i < REALMS.length; i++) {
            var r = REALMS[i];
            var unlocked = stage >= r.unlockStage;
            var cleared = state.clearedRealms.indexOf(r.id) !== -1;

            html += '<div style="background:' + r.color + '18;border:1px solid ' + r.color + '44;border-radius:8px;padding:12px;';
            if (!unlocked) html += 'opacity:0.5;';
            html += '">';
            html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">';
            html += '<span style="font-size:20px;">' + r.icon + '</span>';
            html += '<span style="color:' + r.color + ';font-weight:bold;">' + r.name + '</span>';
            if (!unlocked) html += '<span style="color:#666;font-size:11px;margin-left:auto;">第' + r.unlockStage + '阶解锁</span>';
            html += '</div>';
            html += '<div style="color:#aaa;font-size:11px;margin-bottom:8px;">' + r.desc + '</div>';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
            html += '<span style="color:#999;font-size:11px;">' + r.waves + '波战斗</span>';
            if (!unlocked) {
                html += '<button class="btn btn-sm" disabled style="opacity:0.4;">未解锁</button>';
            } else if (cleared) {
                html += '<span style="color:#4ade80;font-size:12px;">已通关</span>';
            } else {
                html += '<button class="btn btn-sm" onclick="MysticRealm.enterRealm(\'' + r.id + '\')" style="background:' + r.color + ';color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:11px;">挑战</button>';
            }
            html += '</div></div>';
        }
        html += '</div>';

        container.innerHTML = html;
    }

    /* ===========================================
       购买秘境令
       =========================================== */
    function buyToken() {
        checkDailyRefresh();
        if (state.extraBought >= CONFIG.maxExtraTokens) {
            alert('今日已购买达上限（' + CONFIG.maxExtraTokens + '次）');
            return;
        }
        if (!Game || Game.data.spiritStones < CONFIG.tokenCost) {
            alert('灵石不足，需要 ' + CONFIG.tokenCost + ' 灵石');
            return;
        }
        Game.data.spiritStones -= CONFIG.tokenCost;
        if (Game.dom.spiritStonesDisplay) {
            Game.dom.spiritStonesDisplay.textContent = formatNumber(Game.data.spiritStones);
        }
        state.tokens++;
        state.extraBought++;
        saveState();
        render();
    }

    /* ===========================================
       进入秘境
       =========================================== */
    function enterRealm(realmId) {
        checkDailyRefresh();
        if (state.tokens <= 0) {
            alert('秘境令不足');
            return;
        }
        if (state.inBattle) {
            alert('正在战斗中');
            return;
        }
        var realm = null;
        for (var i = 0; i < REALMS.length; i++) {
            if (REALMS[i].id === realmId) { realm = REALMS[i]; break; }
        }
        if (!realm) return;

        state.tokens--;
        state.currentRealm = realm;
        state.currentWave = 0;
        state.inBattle = true;
        saveState();

        startWave();
    }

    /* ===========================================
       开始一波战斗
       =========================================== */
    function startWave() {
        var realm = state.currentRealm;
        var waveIdx = state.currentWave;
        if (waveIdx >= realm.enemies.length) {
            // 所有波次完成
            onRealmCleared();
            return;
        }

        var enemy = realm.enemies[waveIdx];
        var playerLevel = Game ? (Game.data.level || 1) : 1;
        var scaling = 1 + playerLevel * 0.08;

        // 构建敌人数据
        var enemyData = {
            name: enemy.name,
            hp: Math.floor(enemy.hp * scaling),
            maxHp: Math.floor(enemy.hp * scaling),
            atk: Math.floor(enemy.atk * scaling),
            def: Math.floor(enemy.def * scaling),
            dropMultiplier: enemy.dropMultiplier,
            xpBonus: Math.floor(10 * scaling),
        };

        showBattleUI(realm, waveIdx, enemyData);
    }

    /* ===========================================
       战斗UI显示
       =========================================== */
    function showBattleUI(realm, waveIdx, enemyData) {
        var container = document.getElementById('realm-content');
        if (!container) return;

        var html = '';
        html += '<div style="text-align:center;margin-bottom:10px;">';
        html += '<div style="font-size:16px;color:' + realm.color + ';font-weight:bold;">' + realm.icon + ' ' + realm.name + '</div>';
        html += '<div style="color:#ccc;font-size:12px;">第 ' + (waveIdx + 1) + '/' + realm.enemies.length + ' 波</div>';
        html += '</div>';

        // 敌人信息
        html += '<div style="background:#1a1a2e;border:1px solid ' + realm.color + '55;border-radius:8px;padding:12px;text-align:center;margin-bottom:12px;">';
        html += '<div style="color:' + realm.color + ';font-size:14px;font-weight:bold;margin-bottom:6px;">' + enemyData.name + '</div>';
        html += '<div style="margin-bottom:6px;">';
        html += '<div style="background:#333;border-radius:4px;height:8px;overflow:hidden;">';
        html += '<div id="realm-enemy-hp-bar" style="background:' + realm.color + ';height:100%;width:100%;transition:width 0.3s;"></div>';
        html += '</div>';
        html += '<div style="color:#aaa;font-size:11px;margin-top:2px;">HP ' + enemyData.hp + '/' + enemyData.maxHp + '</div>';
        html += '</div>';
        html += '<div style="display:flex;justify-content:center;gap:20px;color:#999;font-size:11px;">';
        html += '<span>攻击 ' + enemyData.atk + '</span><span>防御 ' + enemyData.def + '</span>';
        html += '</div></div>';

        // 战斗按钮
        html += '<div style="display:flex;gap:8px;justify-content:center;">';
        html += '<button class="btn" onclick="MysticRealm.doAttack()" style="background:' + realm.color + ';color:#fff;border:none;border-radius:6px;padding:8px 20px;">攻击</button>';
        html += '<button class="btn" onclick="MysticRealm.fleeRealm()" style="background:#555;color:#fff;border:none;border-radius:6px;padding:8px 20px;">撤退</button>';
        html += '</div>';

        // 战斗日志
        html += '<div id="realm-battle-log" style="margin-top:10px;max-height:120px;overflow-y:auto;color:#aaa;font-size:11px;"></div>';

        container.innerHTML = html;

        // 存储当前敌人数据
        container.setAttribute('data-enemy', JSON.stringify(enemyData));
    }

    /* ===========================================
       攻击
       =========================================== */
    function doAttack() {
        if (!state.inBattle || !Game) return;

        var container = document.getElementById('realm-content');
        if (!container) return;

        var enemyStr = container.getAttribute('data-enemy');
        if (!enemyStr) return;
        var enemyData = JSON.parse(enemyStr);

        // 计算总攻击/防御/暴击率加成（宗门+天赋+套装）
        var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus) ? Sect.getSectBonus() : { atkPct: 0, defPct: 0 };
        var activeBuffs = (typeof Sect !== 'undefined' && Sect.getActiveBuffs) ? Sect.getActiveBuffs() : { atkPct: 0, defPct: 0 };
        var talentEff = (typeof Talents !== 'undefined') ? Talents.getEffects() : { atkPct: 0, defPct: 0, critRate: 0 };
        var totalAtkPct = sectBonus.atkPct + activeBuffs.atkPct + talentEff.atkPct;
        var totalDefPct = sectBonus.defPct + activeBuffs.defPct + talentEff.defPct;

        // 套装加成
        if (typeof Equipment !== 'undefined') {
            var setBonuses = Equipment.getActiveSetBonuses();
            for (var si = 0; si < setBonuses.length; si++) {
                var se = setBonuses[si].effects;
                if (se.atkPct) totalAtkPct += se.atkPct;
                if (se.defPct) totalDefPct += se.defPct;
            }
        }

        var pAtk = Math.floor((Game.data.attack || 10) * (1 + totalAtkPct / 100));
        var pDef = Math.floor((Game.data.defense || 5) * (1 + totalDefPct / 100));
        var pHp = Game.data.hp || 100;
        var pMaxHp = Game.data.maxHp || 100;

        // 动态暴击率：基础 + 装备效果 + 套装 + 天赋
        var totalCritRate = (Game.data.critRate || 0);
        var equipped = Game.data.equipped || [];
        for (var ei = 0; ei < equipped.length; ei++) {
            var eq = equipped[ei];
            if (eq && eq.effects) {
                for (var ej = 0; ej < eq.effects.length; ej++) {
                    if (eq.effects[ej].key === 'critRate') totalCritRate += eq.effects[ej].value / 100;
                }
            }
        }
        if (typeof Equipment !== 'undefined') {
            var setBonuses2 = Equipment.getActiveSetBonuses();
            for (var sk = 0; sk < setBonuses2.length; sk++) {
                if (setBonuses2[sk].effects.critRate) totalCritRate += setBonuses2[sk].effects.critRate / 100;
            }
        }
        if (typeof Talents !== 'undefined') totalCritRate += Talents.getEffects().critRate / 100;

        // 玩家攻击
        var pDmg = Math.max(1, pAtk - enemyData.def * 0.5 + Math.floor(Math.random() * 6));
        var crit = Math.random() < totalCritRate;
        if (crit) pDmg = Math.floor(pDmg * 1.8);

        enemyData.hp -= pDmg;

        var logEl = document.getElementById('realm-battle-log');
        var log = '<div>';
        if (crit) log += '<span style="color:#fbbf24;">暴击！</span>';
        log += '你攻击 ' + enemyData.name + ' 造成 <span style="color:#f87171;">' + pDmg + '</span> 点伤害</div>';

        // 更新血条
        var hpBar = document.getElementById('realm-enemy-hp-bar');
        if (hpBar) {
            var pct = Math.max(0, enemyData.hp / enemyData.maxHp * 100);
            hpBar.style.width = pct + '%';
            hpBar.parentElement.nextElementSibling.textContent = 'HP ' + Math.max(0, enemyData.hp) + '/' + enemyData.maxHp;
        }

        // 检查敌人死亡
        if (enemyData.hp <= 0) {
            enemyData.hp = 0;
            log += '<div style="color:#4ade80;">击败了 ' + enemyData.name + '！</div>';
            if (logEl) {
                logEl.innerHTML += log;
                logEl.scrollTop = logEl.scrollHeight;
            }

            // 给予奖励
            giveWaveReward(enemyData);

            // 恢复部分生命
            Game.data.hp = Math.min(Game.data.hp + Math.floor(pMaxHp * 0.2), pMaxHp);

            // 下一波
            state.currentWave++;
            var realm = state.currentRealm;
            if (state.currentWave >= realm.enemies.length) {
                onRealmCleared();
            } else {
                setTimeout(function () {
                    startWave();
                }, 800);
            }
            return;
        }

        // 敌人反击
        var eDmg = Math.max(1, enemyData.atk - pDef * 0.4 + Math.floor(Math.random() * 4));
        Game.data.hp = Math.max(0, Game.data.hp - eDmg);

        log += '<div>' + enemyData.name + ' 反击造成 <span style="color:#f87171;">' + eDmg + '</span> 点伤害</div>';

        // 检查玩家死亡
        if (Game.data.hp <= 0) {
            log += '<div style="color:#f87171;">你被击败了！秘境探索失败。</div>';
            if (logEl) {
                logEl.innerHTML += log;
                logEl.scrollTop = logEl.scrollHeight;
            }
            onRealmFailed();
            return;
        }

        if (logEl) {
            logEl.innerHTML += log;
            logEl.scrollTop = logEl.scrollHeight;
        }

        // 更新存储
        container.setAttribute('data-enemy', JSON.stringify(enemyData));
    }

    /* ===========================================
       波次奖励
       =========================================== */
    function giveWaveReward(enemyData) {
        var realm = state.currentRealm;
        if (!realm || !Game) return;

        var mul = enemyData.dropMultiplier || 1.0;

        switch (realm.lootType) {
            case 'spiritStones':
                var range = realm.lootRange;
                var stones = Math.floor((range[0] + Math.random() * (range[1] - range[0])) * mul);
                Game.addSpirit(stones);
                break;
            case 'exp':
                var expRange = realm.lootRange;
                var exp = Math.floor((expRange[0] + Math.random() * (expRange[1] - expRange[0])) * mul);
                Game.addExperience(exp);
                break;
            case 'equipment':
                // 掉落装备 - 概率触发
                if (Math.random() < 0.4 * mul) {
                    var eqTier = realm.lootTierRange[0] + Math.floor(Math.random() * (realm.lootTierRange[1] - realm.lootTierRange[0] + 1));
                    addRealmEquipment(eqTier);
                }
                break;
            case 'skillBook':
                // 掉落技能书（以灵石+经验折算）
                if (Math.random() < 0.35 * mul) {
                    var sBonus = Math.floor((30 + Math.random() * 80) * mul);
                    Game.addSpirit(sBonus);
                    Game.addExperience(Math.floor(sBonus * 0.5));
                }
                break;
        }

        // 基础灵石和经验
        var baseStones = Math.floor((5 + Math.random() * 15) * mul);
        var baseExp = Math.floor((10 + Math.random() * 30) * mul);
        Game.addSpirit(baseStones);
        Game.addExperience(baseExp);
    }

    /* 添加秘境掉落装备 */
    function addRealmEquipment(tier) {
        // 兼容 Equipment.js 标准装备结构
        // tier: 1=凡品(quality 0-1), 2=灵品(quality 1-2), 3=仙品(quality 2-3)
        var slotNames = ['weapon', 'armor', 'helmet', 'ring', 'amulet', 'belt'];
        var slotIndex = Math.floor(Math.random() * 6);
        var tierNames = { 1: '凡品', 2: '灵品', 3: '仙品' };
        var slotDisplay = { 0: '剑', 1: '甲', 2: '盔', 3: '戒', 4: '坠', 5: '带' };
        var names = ['玄铁', '流云', '破军', '星陨', '天罡', '紫霄', '龙渊', '凤鸣'];

        var qualityIndex = tier === 1 ? Math.floor(Math.random() * 2) :
                           tier === 2 ? 1 + Math.floor(Math.random() * 2) :
                           2 + Math.floor(Math.random() * 2);

        var mult = [1.0, 1.5, 2.0, 3.0][qualityIndex] || 1.0;
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
       秘境通关
       =========================================== */
    function onRealmCleared() {
        var realm = state.currentRealm;
        state.inBattle = false;
        state.clearedRealms.push(realm.id);
        saveState();

        // 通关额外奖励
        if (Game) {
            var bonusStones = 100 + Math.floor(Math.random() * 200);
            var bonusExp = 50 + Math.floor(Math.random() * 150);
            Game.addSpirit(bonusStones);
            Game.addExperience(bonusExp);
        }

        var container = document.getElementById('realm-content');
        if (container) {
            var html = '';
            html += '<div style="text-align:center;padding:20px;">';
            html += '<div style="font-size:40px;margin-bottom:10px;">🎉</div>';
            html += '<div style="color:' + realm.color + ';font-size:18px;font-weight:bold;margin-bottom:6px;">' + realm.name + ' 通关！</div>';
            html += '<div style="color:#aaa;font-size:12px;margin-bottom:16px;">所有波次已击破，获得额外奖励</div>';
            html += '<button class="btn" onclick="MysticRealm.render()" style="background:#4ade80;color:#000;border:none;border-radius:6px;padding:8px 20px;">返回秘境列表</button>';
            html += '</div>';
            container.innerHTML = html;
        }
    }

    /* ===========================================
       秘境失败
       =========================================== */
    function onRealmFailed() {
        state.inBattle = false;
        saveState();

        var container = document.getElementById('realm-content');
        if (container) {
            var html = '';
            html += '<div style="text-align:center;padding:20px;">';
            html += '<div style="font-size:40px;margin-bottom:10px;">💀</div>';
            html += '<div style="color:#f87171;font-size:16px;font-weight:bold;margin-bottom:6px;">探索失败</div>';
            html += '<div style="color:#aaa;font-size:12px;margin-bottom:16px;">你被击败了，部分奖励已获取</div>';
            html += '<button class="btn" onclick="MysticRealm.render()" style="background:#f87171;color:#fff;border:none;border-radius:6px;padding:8px 20px;">返回秘境列表</button>';
            html += '</div>';
            container.innerHTML = html;
        }
    }

    /* ===========================================
       撤退
       =========================================== */
    function fleeRealm() {
        state.inBattle = false;
        state.tokens++;
        saveState();
        showToast('已撤退，返还1枚秘境令', 2000);
        render();
    }

    /* ===========================================
       获取秘境令数量（供外部查询）
       =========================================== */
    function getTokens() {
        checkDailyRefresh();
        return state.tokens;
    }

    // 公开API
    return {
        init: init,
        render: render,
        enterRealm: enterRealm,
        doAttack: doAttack,
        fleeRealm: fleeRealm,
        buyToken: buyToken,
        getTokens: getTokens,
    };

})();
