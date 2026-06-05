/* ============================================================
   js/battle.js — 挂机战斗系统
   依赖 Game.data / utils.js / components.js
   进入即战斗，随机小怪/BOSS，不离开就一直挂机
   ============================================================ */

/**
 * 汇总所有已装备装备的特殊效果和套装加成（委托到 Equipment 统一入口）
 * @returns {object} 汇总后的效果对象
 */
function getEquipAndSetEffects() {
    if (typeof Equipment !== 'undefined' && Equipment.getTotalEquipEffects) {
        return Equipment.getTotalEquipEffects();
    }
    return { critRate:0, dodgeRate:0, lifesteal:0, bossDmg:0, counterRate:0,
             extraDmgPct:0, extraDmgChance:0, dmgReducePct:0, dmgReduceChance:0,
             killHealPct:0, expBonus:0, spiritBonus:0, cultSpeed:0 };
}

var Battle = {

    /* ----------------------------------------------------------
       地图数据（按境界解锁）
       ---------------------------------------------------------- */
    ZONES: [
        { name: '妖兽森林', unlockRealm: 0, unlockIndex: 0, monster: '妖兽', exp: 50, spirit: 30 },
        { name: '幽冥鬼窟', unlockRealm: 1, unlockIndex: 1, monster: '厉鬼', exp: 150, spirit: 80 },
        { name: '血炼深渊', unlockRealm: 2, unlockIndex: 2, monster: '魔物', exp: 400, spirit: 200 },
        { name: '上古遗迹', unlockRealm: 3, unlockIndex: 3, monster: '石魔', exp: 1000, spirit: 500 },
        { name: '龙脉秘境', unlockRealm: 4, unlockIndex: 4, monster: '蛟龙', exp: 2500, spirit: 1200 },
        { name: '破灭荒原', unlockRealm: 5, unlockIndex: 5, monster: '荒兽', exp: 6000, spirit: 3000 },
        { name: '星空古路', unlockRealm: 6, unlockIndex: 6, monster: '星兽', exp: 15000, spirit: 7000 },
        { name: '轮回之地', unlockRealm: 7, unlockIndex: 7, monster: '亡灵', exp: 40000, spirit: 18000 },
        { name: '混沌裂隙', unlockRealm: 8, unlockIndex: 8, monster: '天魔', exp: 100000, spirit: 50000 },
        { name: '天道战场', unlockRealm: 9, unlockIndex: 9, monster: '道兵', exp: 250000, spirit: 120000 }
    ],

    /** BOSS名称词库 */
    BOSS_NAMES: ['远古', '深渊', '灭世', '噬魂', '血煞', '九幽', '混沌', '天罚', '裂空', '焚天'],

    /** 速度倍率 */
    SPEEDS: { '1x': 1000, '2x': 500, '3x': 333 },

    /** 怪物独立基础属性（每个境界的固定值，不绑定玩家） */
    BASE_MONSTER_STATS: [
        { hp: 80,   atk: 12,  def: 5,   exp: 50,   spirit: 30 },   // 凡人
        { hp: 300,  atk: 40,  def: 20,  exp: 150,  spirit: 80 },   // 炼气
        { hp: 800,  atk: 100, def: 50,  exp: 400,  spirit: 200 },  // 筑基
        { hp: 2500, atk: 280, def: 140, exp: 1000, spirit: 500 },  // 金丹
        { hp: 7000, atk: 700, def: 350, exp: 2500, spirit: 1200 }, // 元婴
        { hp: 18000, atk: 1800, def: 900, exp: 6000, spirit: 3000 }, // 化神
        { hp: 45000, atk: 4500, def: 2200, exp: 15000, spirit: 7000 }, // 合体
        { hp: 110000, atk: 11000, def: 5500, exp: 40000, spirit: 18000 }, // 大乘
        { hp: 280000, atk: 28000, def: 14000, exp: 100000, spirit: 50000 }, // 渡劫
        { hp: 700000, atk: 70000, def: 35000, exp: 250000, spirit: 120000 }, // 真仙
    ],

    /* ----------------------------------------------------------
       动态怪物属性（混合模型：独立基础 + 玩家百分比补偿）
       ---------------------------------------------------------- */
    getZoneMonsterStats: function (zoneIndex) {
        var playerEff = Cultivation.getEffectiveStats();
        var diffCoeff = Math.pow(1.5, zoneIndex - Game.data.realmIndex);
        diffCoeff = Math.max(0.5, Math.min(2.5, diffCoeff));

        // 取该区域的独立基础值
        var base = this.BASE_MONSTER_STATS[Math.min(zoneIndex, this.BASE_MONSTER_STATS.length - 1)];

        // 玩家补偿系数：如果玩家属性远超基础值，按比例加点，防止后期太弱
        var playerScale = 1.0;
        var basePower = base.hp * 0.5 + base.atk * 2.5 + base.def * 1.8;
        var playerPower = playerEff.hp * 0.5 + playerEff.atk * 2.5 + playerEff.def * 1.8;
        if (playerPower > basePower * 2) {
            // 玩家战力超过基础2倍时，开始补偿
            playerScale = 1.0 + (playerPower / basePower - 2) * 0.25;
            playerScale = Math.min(playerScale, 4.0);
        }

        var mult = playerScale * diffCoeff;

        var stats = {
            hp: Math.floor(base.hp * mult),
            atk: Math.floor(base.atk * mult),
            def: Math.floor(base.def * mult)
        };

        // BOSS属性在普通怪基础上翻倍
        stats.bossHp = Math.floor(stats.hp * 3);
        stats.bossAtk = Math.floor(stats.atk * 2);
        stats.bossDef = Math.floor(stats.def * 2);
        return stats;
    },

    /* ----------------------------------------------------------
       突破后刷新怪物（cultivation.js调用）
       ---------------------------------------------------------- */
    respawnAfterBreakthrough: function () {
        if (!this.active) return;
        // 停止当前战斗
        if (this.fightTimer) { clearInterval(this.fightTimer); this.fightTimer = null; }
        if (this.spawnTimer) { clearTimeout(this.spawnTimer); this.spawnTimer = null; }
        // 重新计算玩家HP（突破后属性变了）
        var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus)
            ? Sect.getSectBonus() : { hpPct: 0 };
        var buffBonus = (typeof Sect !== 'undefined' && Sect.getActiveBuffs)
            ? Sect.getActiveBuffs() : { hpPct: 0 };
        this.playerHP = Math.floor(Game.data.hp * (1 + sectBonus.hpPct / 100 + buffBonus.hpPct / 100));
        // 立即刷新怪
        this.spawnMonster();
    },

    /* ----------------------------------------------------------
       战斗状态
       ---------------------------------------------------------- */
    active: false,             // 是否在挂机中
    zoneIndex: -1,             // 当前区域索引
    isBoss: false,             // 当前是否BOSS
    monsterHP: 0,
    monsterMaxHP: 0,
    playerHP: 0,
    fightTimer: null,
    spawnTimer: null,          // 刷怪延迟定时器
    fightSpeed: 1000,
    logCount: 0,
    killCount: 0,              // 本轮击杀数
    bossKillCount: 0,          // BOSS击杀数

    /* ----------------------------------------------------------
       进入挂机（Tab切换到战斗时调用）
       ---------------------------------------------------------- */
    startAFK: function () {
        if (this.active) return;

        // 根据境界确定区域
        this.zoneIndex = Math.min(Game.data.realmIndex, this.ZONES.length - 1);
        this.active = true;
        this.killCount = 0;
        this.bossKillCount = 0;
        this._monsterStunned = 0;

        // 计算宗门加成后的最大HP
        var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus)
            ? Sect.getSectBonus() : { hpPct: 0 };
        var buffBonus = (typeof Sect !== 'undefined' && Sect.getActiveBuffs)
            ? Sect.getActiveBuffs() : { hpPct: 0 };
        this.playerHP = Math.floor(Game.data.hp * (1 + sectBonus.hpPct / 100 + buffBonus.hpPct / 100));
        this.logCount = 0;

        // 清空日志
        var log = document.getElementById('battle-log');
        if (log) log.innerHTML = '';

        // 渲染区域信息
        this.renderZoneInfo();

        // 渲染速度按钮
        this.renderSpeedButtons();

        // 绑定离开按钮
        var leaveBtn = document.getElementById('battle-leave-btn');
        if (leaveBtn) {
            var self = this;
            leaveBtn.onclick = function () { self.stopAFK(); };
        }

        // 立即刷第一只怪
        this.spawnMonster();
    },

    /* ----------------------------------------------------------
       停止挂机（离开Tab时调用）
       ---------------------------------------------------------- */
    stopAFK: function () {
        this.active = false;
        if (this.fightTimer) { clearInterval(this.fightTimer); this.fightTimer = null; }
        if (this.spawnTimer) { clearTimeout(this.spawnTimer); this.spawnTimer = null; }
    },

    /* ----------------------------------------------------------
       渲染区域信息（含区域切换按钮）
       ---------------------------------------------------------- */
    renderZoneInfo: function () {
        var container = document.getElementById('battle-zone-info');
        if (!container) return;

        container.innerHTML = '';
        container.style.cssText = 'padding:8px 0;margin-bottom:8px;border-bottom:1px solid rgba(184,134,11,0.3);';

        // 区域切换按钮行
        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:8px;';

        var self = this;
        var realmIndex = Game.data.realmIndex;

        for (var i = 0; i < this.ZONES.length; i++) {
            (function (idx) {
                var zone = self.ZONES[idx];
                var unlocked = realmIndex >= zone.unlockRealm;
                var isActive = self.zoneIndex === idx;

                var btn = document.createElement('button');
                btn.textContent = zone.name.substring(0, 4);
                btn.title = zone.name + '（需' + REALMS[zone.unlockRealm] + '）';
                btn.style.cssText = 'padding:4px 10px;border-radius:6px;font-size:12px;' +
                    'font-family:inherit;cursor:' + (unlocked ? 'pointer' : 'not-allowed') + ';' +
                    'border:1px solid ' + (isActive ? '#d4a574' : '#3a3a4a') + ';' +
                    'background:' + (isActive ? 'rgba(212,165,116,0.2)' : 'rgba(15,52,96,0.3)') + ';' +
                    'color:' + (unlocked ? (isActive ? '#d4a574' : '#a09080') : '#444') + ';' +
                    'transition:all 0.2s;';

                if (unlocked) {
                    btn.addEventListener('click', function () {
                        if (self.zoneIndex !== idx) self.switchZone(idx);
                    });
                }

                btnRow.appendChild(btn);
            })(i);
        }
        container.appendChild(btnRow);

        // 当前区域标题
        var zone = this.ZONES[this.zoneIndex];
        var title = document.createElement('div');
        title.style.cssText = 'text-align:center;font-size:14px;color:#d4a574;font-weight:bold;';
        title.textContent = zone.name + ' · 挂机中';
        container.appendChild(title);

        // 击杀统计
        var stats = document.createElement('div');
        stats.style.cssText = 'text-align:center;font-size:11px;color:#6a5f50;margin-top:4px;';
        stats.id = 'battle-kill-stats';
        stats.textContent = '击杀: ' + this.killCount + ' | BOSS: ' + this.bossKillCount;
        container.appendChild(stats);
    },

    /* ----------------------------------------------------------
       切换区域
       ---------------------------------------------------------- */
    switchZone: function (newIndex) {
        if (this.zoneIndex === newIndex) return;

        this.zoneIndex = newIndex;

        // 停止当前战斗
        if (this.fightTimer) { clearInterval(this.fightTimer); this.fightTimer = null; }
        if (this.spawnTimer) { clearTimeout(this.spawnTimer); this.spawnTimer = null; }

        // 重置本区域击杀统计
        this.killCount = 0;
        this.bossKillCount = 0;

        // 重新渲染区域信息
        this.renderZoneInfo();

        // 立即刷怪
        this.spawnMonster();
    },

    /* ----------------------------------------------------------
       更新击杀统计
       ---------------------------------------------------------- */
    updateKillStats: function () {
        var el = document.getElementById('battle-kill-stats');
        if (el) el.textContent = '击杀: ' + this.killCount + ' | BOSS: ' + this.bossKillCount;
    },

    /* ----------------------------------------------------------
       刷怪
       ---------------------------------------------------------- */
    spawnMonster: function () {
        if (!this.active) return;

        var zone = this.ZONES[this.zoneIndex];

        // 动态计算怪物属性
        var stats = this.getZoneMonsterStats(this.zoneIndex);
        this._zoneStats = stats;

        // 12%概率刷BOSS（原20%，降低频率让BOSS更有稀有感）
        this.isBoss = Math.random() < 0.12;

        // 重置技能状态
        this._monsterStunned = 0;

        var bossName = '';
        if (this.isBoss) {
            bossName = this.BOSS_NAMES[randInt(0, this.BOSS_NAMES.length - 1)] + zone.monster + '王';
            this.monsterHP = stats.bossHp;
            this.monsterMaxHP = stats.bossHp;
        } else {
            this.monsterHP = stats.hp;
            this.monsterMaxHP = stats.hp;
        }

        // 渲染怪物信息
        this.renderMonsterInfo(zone, bossName);

        // 渲染玩家血条
        this.renderPlayerBar();

        // 开场日志
        if (this.isBoss) {
            this.addLog('⚠ BOSS「' + bossName + '」出现了！', '#ff4444');
        } else {
            this.addLog('遭遇 ' + zone.monster + '，准备战斗！', '#ffd700');
        }

        // 启动战斗定时器
        this.startFightTimer();
    },

    /* ----------------------------------------------------------
       获取怪物防御减伤后的玩家伤害（修复怪物防御被无视的bug）
       传入原始伤害和怪物当前防御值，返回减免后的最终伤害
       ---------------------------------------------------------- */
    getDefReducedDmg: function (rawDmg, monsterDef) {
        var reduction = Math.floor(monsterDef * 0.3);
        return Math.max(1, rawDmg - reduction);
    },

    /* ----------------------------------------------------------
       渲染怪物信息
       ---------------------------------------------------------- */
    renderMonsterInfo: function (zone, bossName) {
        var container = document.getElementById('battle-monster-info');
        if (!container) return;

        container.innerHTML = '';

        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:16px;font-weight:bold;margin-bottom:6px;';
        if (this.isBoss) {
            nameEl.style.color = '#ff4444';
            nameEl.textContent = 'BOSS · ' + bossName;
        } else {
            nameEl.style.color = '#e74c3c';
            nameEl.textContent = zone.monster;
        }
        container.appendChild(nameEl);

        var bar = createProgressBar(this.monsterHP, this.monsterMaxHP,
            this.isBoss ? 'linear-gradient(90deg,#8b0000,#ff4444)' : 'linear-gradient(90deg,#c0392b,#e74c3c)',
            formatNumber(this.monsterHP) + ' / ' + formatNumber(this.monsterMaxHP));
        bar.id = 'battle-monster-hp-bar';
        container.appendChild(bar);
    },

    /* ----------------------------------------------------------
       渲染玩家血条
       ---------------------------------------------------------- */
    renderPlayerBar: function () {
        var container = document.getElementById('battle-player-bar');
        if (!container) return;

        container.innerHTML = '';

        // 计算宗门加成后的最大HP
        var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus)
            ? Sect.getSectBonus() : { hpPct: 0 };
        var buffBonus = (typeof Sect !== 'undefined' && Sect.getActiveBuffs)
            ? Sect.getActiveBuffs() : { hpPct: 0 };
        var maxHp = Math.floor(Game.data.hp * (1 + sectBonus.hpPct / 100 + buffBonus.hpPct / 100));

        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:13px;color:#2ecc71;margin-bottom:4px;';
        nameEl.textContent = '角色生命';
        container.appendChild(nameEl);

        var bar = createProgressBar(this.playerHP, maxHp,
            'linear-gradient(90deg,#1e8449,#2ecc71)',
            formatNumber(this.playerHP) + ' / ' + formatNumber(maxHp));
        bar.id = 'battle-player-hp-bar';
        container.appendChild(bar);
    },

    /* ----------------------------------------------------------
       更新怪物血条
       ---------------------------------------------------------- */
    updateMonsterBar: function () {
        var bar = document.getElementById('battle-monster-hp-bar');
        if (!bar) return;
        var fill = bar.querySelector('div');
        if (fill) {
            var pct = Math.max(0, (this.monsterHP / this.monsterMaxHP) * 100);
            fill.style.width = pct + '%';
        }
        var label = bar.querySelectorAll('div')[1];
        if (label) {
            label.textContent = Math.max(0, this.monsterHP).toLocaleString() + ' / ' + this.monsterMaxHP.toLocaleString();
        }
    },

    /* ----------------------------------------------------------
       更新玩家血条
       ---------------------------------------------------------- */
    updatePlayerBar: function () {
        var bar = document.getElementById('battle-player-hp-bar');
        if (!bar) return;

        var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus)
            ? Sect.getSectBonus() : { hpPct: 0 };
        var buffBonus = (typeof Sect !== 'undefined' && Sect.getActiveBuffs)
            ? Sect.getActiveBuffs() : { hpPct: 0 };
        var maxHp = Math.floor(Game.data.hp * (1 + sectBonus.hpPct / 100 + buffBonus.hpPct / 100));

        var fill = bar.querySelector('div');
        if (fill) {
            var pct = Math.max(0, (this.playerHP / maxHp) * 100);
            fill.style.width = pct + '%';
        }
        var label = bar.querySelectorAll('div')[1];
        if (label) {
            label.textContent = Math.max(0, this.playerHP).toLocaleString() + ' / ' + maxHp.toLocaleString();
        }
    },

    /* ----------------------------------------------------------
       渲染速度按钮
       ---------------------------------------------------------- */
    renderSpeedButtons: function () {
        var container = document.getElementById('battle-speed');
        if (!container) return;

        container.innerHTML = '';
        container.style.cssText = 'display:flex;gap:8px;justify-content:center;margin:12px 0;';

        var self = this;
        var activeSpeed = this.getSpeedLabel();

        ['1x', '2x', '3x'].forEach(function (speed) {
            var btn = createButton(speed, 'battle-speed-btn' + (speed === activeSpeed ? ' active' : ''),
                function () { self.setSpeed(speed); });
            container.appendChild(btn);
        });
    },

    getSpeedLabel: function () {
        for (var key in this.SPEEDS) {
            if (this.SPEEDS[key] === this.fightSpeed) return key;
        }
        return '1x';
    },

    setSpeed: function (speedKey) {
        this.fightSpeed = this.SPEEDS[speedKey] || 1000;
        if (this.fightTimer) { clearInterval(this.fightTimer); this.startFightTimer(); }
        this.renderSpeedButtons();
    },

    /* ----------------------------------------------------------
       启动战斗定时器
       ---------------------------------------------------------- */
    startFightTimer: function () {
        var self = this;
        if (this.fightTimer) clearInterval(this.fightTimer);
        this.fightTimer = setInterval(function () { self.fightTick(); }, this.fightSpeed);
    },

    /* ----------------------------------------------------------
       战斗回合
       ---------------------------------------------------------- */
    fightTick: function () {
        if (!this.active) return;

        var zone = this.ZONES[this.zoneIndex];
        var monsterName = this.isBoss ?
            (this.BOSS_NAMES[randInt(0, this.BOSS_NAMES.length - 1)] + zone.monster + '王') :
            zone.monster;

        // 读取宗门功法加成
        var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus)
            ? Sect.getSectBonus() : { atkPct: 0, defPct: 0, hpPct: 0, lifestealPct: 0 };

        // 读取宗门 Buff 加成（丹药等）
        var buffBonus = (typeof Sect !== 'undefined' && Sect.getActiveBuffs)
            ? Sect.getActiveBuffs() : { atkPct: 0, defPct: 0, hpPct: 0, enhanceRate: 0 };

        // 读取装备和套装效果
        var effects = getEquipAndSetEffects();

        // 读取天赋效果
        var talentEff = (typeof Talents !== 'undefined' && Talents.getEffects)
            ? Talents.getEffects() : { atkPct: 0, hpPct: 0, defPct: 0, critRate: 0, critDmg: 0, dmgReduce: 0, lifestealOnCrit: 0, regenPerTick: 0 };

        // 角色攻击（含宗门+天赋+技能Buff加成）
        var skillAtkBuff = (typeof Skills !== 'undefined') ? Skills.getBuffValue('buff_atk') : 0;
        var skillAllBuff = (typeof Skills !== 'undefined') ? Skills.getBuffValue('buff_all') : 0;
        var totalAtkPct = sectBonus.atkPct + buffBonus.atkPct + talentEff.atkPct + skillAtkBuff + skillAllBuff;
        var totalDefPct = sectBonus.defPct + buffBonus.defPct + talentEff.defPct + skillAllBuff;
        var totalHpPct = sectBonus.hpPct + buffBonus.hpPct + talentEff.hpPct + skillAllBuff;

        // 套装加成（atkPct/defPct/hpPct — 青龙/玄武/朱雀/白虎各套）
        if (typeof Equipment !== 'undefined') {
            var setBonuses = Equipment.getActiveSetBonuses();
            for (var _si = 0; _si < setBonuses.length; _si++) {
                var _se = setBonuses[_si].effects;
                if (_se.atkPct) totalAtkPct += _se.atkPct;
                if (_se.defPct) totalDefPct += _se.defPct;
                if (_se.hpPct) totalHpPct += _se.hpPct;
            }
        }

        var effectiveAtk = Math.floor(Game.data.attack * (1 + totalAtkPct / 100));
        var effectiveDef = Math.floor(Game.data.defense * (1 + totalDefPct / 100));
        var effectiveHp = Math.floor(Game.data.hp * (1 + totalHpPct / 100));

        // 灵兽出战加成（11-4批）
        if (typeof Beast !== 'undefined' && Beast.getActiveBeastBonus) {
            var beastBonus = Beast.getActiveBeastBonus();
            effectiveAtk += beastBonus.atk;
            effectiveDef += beastBonus.def;
        }

        // 技能冷却和Buff维护
        if (typeof Skills !== 'undefined') {
            Skills.tickCooldowns();
            Skills.tickBuffs();
        }

        // ========== 技能释放（普攻前） ==========
        var skillUsed = false;
        if (typeof Skills !== 'undefined') {
            var readySkills = Skills.getReadySkills();
            if (readySkills.length > 0) {
                var skill = readySkills[0]; // 取第一个就绪技能
                skillUsed = true;
                Skills.setCooldown(skill.id, skill.cd);

                var skillDmg = 0;
                switch (skill.type) {
                    case 'damage':
                        skillDmg = Math.floor(effectiveAtk * skill.value / 100);
                        this.addLog('【' + skill.name + '】造成 ' + skillDmg + ' 点伤害', '#ffd700');
                        break;

                    case 'aoe':
                        skillDmg = Math.floor(effectiveAtk * skill.value / 100);
                        var splashDmg = Math.floor(skillDmg * (skill.splash || 50) / 100);
                        this.addLog('【' + skill.name + '】AoE ' + skillDmg + ' + 溅射' + splashDmg, '#ffd700');
                        skillDmg += splashDmg;
                        break;

                    case 'multi_hit':
                        var hits = skill.hits || 3;
                        for (var hi = 0; hi < hits; hi++) {
                            skillDmg += Math.floor(effectiveAtk * skill.value / 100);
                        }
                        this.addLog('【' + skill.name + '】' + hits + '段攻击，共 ' + skillDmg + ' 点伤害', '#ffd700');
                        break;

                    case 'execute':
                        var hpPct = this.monsterHP / this.monsterMaxHP * 100;
                        if (hpPct <= (skill.threshold || 25)) {
                            skillDmg = Math.floor(effectiveAtk * skill.value / 100);
                            this.addLog('【' + skill.name + '】斩杀！造成 ' + skillDmg + ' 点伤害', '#ff4444');
                        } else {
                            skillDmg = Math.floor(effectiveAtk * skill.value / 100 * 0.5);
                            this.addLog('【' + skill.name + '】HP未达斩杀线，造成 ' + skillDmg + ' 点伤害', '#ffd700');
                        }
                        break;

                    case 'dot':
                        skillDmg = Math.floor(effectiveAtk * skill.value / 100);
                        Skills.addBuff('dot', Math.floor(effectiveAtk * (skill.dotValue || 10) / 100), skill.dotDuration || 3);
                        this.addLog('【' + skill.name + '】' + skillDmg + ' + 灼烧' + (skill.dotDuration || 3) + 'tick', '#ff8800');
                        break;

                    case 'stun':
                        skillDmg = Math.floor(effectiveAtk * skill.value / 100);
                        this.addLog('【' + skill.name + '】' + skillDmg + ' + 麻痹' + (skill.stunDuration || 1) + 'tick', '#ffd700');
                        // stun效果：怪物跳过下次攻击
                        this._monsterStunned = (skill.stunDuration || 1);
                        break;

                    case 'lifesteal':
                        skillDmg = Math.floor(effectiveAtk * skill.value / 100);
                        var stealHeal = Math.floor(skillDmg * (skill.lifestealPct || 30) / 100);
                        this.playerHP = Math.min(this.playerHP + stealHeal, effectiveHp);
                        this.addLog('【' + skill.name + '】' + skillDmg + ' + 吸血' + stealHeal, '#ff8800');
                        break;

                    case 'sacrifice':
                        var hpCost = Math.floor(effectiveHp * (skill.hpCost || 15) / 100);
                        this.playerHP = Math.max(1, this.playerHP - hpCost);
                        skillDmg = Math.floor(effectiveAtk * skill.value / 100);
                        this.addLog('【' + skill.name + '】消耗' + hpCost + 'HP，造成 ' + skillDmg + ' 点伤害', '#ff4444');
                        break;

                    case 'heal':
                        var healAmt = Math.floor(effectiveHp * skill.value / 100);
                        this.playerHP = Math.min(this.playerHP + healAmt, effectiveHp);
                        this.addLog('【' + skill.name + '】恢复 ' + healAmt + ' 点生命', '#2ecc71');
                        break;

                    case 'shield':
                        var shieldVal = Math.floor(effectiveAtk * skill.value / 100);
                        Skills.setShield(shieldVal);
                        this.addLog('【' + skill.name + '】护盾 ' + shieldVal + ' 点', '#3399ff');
                        break;

                    case 'buff_atk':
                        Skills.addBuff('buff_atk', skill.value, skill.duration || 3);
                        this.addLog('【' + skill.name + '】攻击+' + skill.value + '% ' + (skill.duration || 3) + 'tick', '#ffd700');
                        break;

                    case 'buff_all':
                        Skills.addBuff('buff_all', skill.value, skill.duration || 5);
                        this.addLog('【' + skill.name + '】全属性+' + skill.value + '% ' + (skill.duration || 5) + 'tick', '#ffd700');
                        break;

                    case 'dodge':
                        Skills.addBuff('dodge', skill.value, skill.duration || 2);
                        this.addLog('【' + skill.name + '】闪避+' + skill.value + '% ' + (skill.duration || 2) + 'tick', '#3399ff');
                        break;

                    case 'crit_dmg_buff':
                        Skills.addBuff('crit_dmg_buff', skill.value, skill.duration || 3);
                        this.addLog('【' + skill.name + '】暴伤+' + skill.value + '% ' + (skill.duration || 3) + 'tick', '#ffd700');
                        break;

                    case 'extra_attack':
                        Skills.addBuff('extra_attack', skill.value, skill.duration || 5);
                        this.addLog('【' + skill.name + '】攻击次数+' + skill.value + ' ' + (skill.duration || 5) + 'tick', '#ffd700');
                        break;

                    case 'damage_reduce':
                        Skills.addBuff('damage_reduce', skill.value, skill.duration || 3);
                        this.addLog('【' + skill.name + '】减伤+' + skill.value + '% ' + (skill.duration || 3) + 'tick', '#3399ff');
                        break;

                    case 'counter':
                        Skills.addBuff('counter', skill.value, skill.duration || 2);
                        this.addLog('【' + skill.name + '】反伤+' + skill.value + '% ' + (skill.duration || 2) + 'tick', '#ff8800');
                        break;

                    case 'block':
                        Skills.addBuff('block', skill.value, skill.duration || 3);
                        this.addLog('【' + skill.name + '】格挡+' + skill.value + '% ' + (skill.duration || 3) + 'tick', '#3399ff');
                        break;

                    default:
                        skillDmg = Math.floor(effectiveAtk * skill.value / 100);
                        this.addLog('【' + skill.name + '】造成 ' + skillDmg + ' 点伤害', '#ffd700');
                }

                // 技能伤害结算（应用怪物防御减免）
                if (skillDmg > 0) {
                    var stats = this._zoneStats;
                    var monDef = this.isBoss ? stats.bossDef : stats.def;
                    skillDmg = Math.max(1, skillDmg - Math.floor(monDef * 0.3));
                    this.monsterHP -= skillDmg;
                    this.updateMonsterBar();
                    if (this.monsterHP <= 0) {
                        this.monsterHP = 0;
                        this.updateMonsterBar();
                        this.onMonsterKilled(zone, monsterName);
                        return;
                    }
                }
            }
        }

        // ========== 普攻 ==========
        // 获取怪物防御值（用于伤害减免 — 修复怪物防御被无视的bug）
        var stats = this._zoneStats;
        var monsterDef = this.isBoss ? stats.bossDef : stats.def;

        var baseDmg = effectiveAtk * random(0.8, 1.2);
        var totalCritRate = (Game.data.critRate || 0.05) + effects.critRate / 100 + talentEff.critRate / 100;
        // 灵兽暴击率加成
        if (typeof Beast !== 'undefined' && Beast.getActiveBeastBonus) {
            var beastCritRate = Beast.getActiveBeastBonus().critRate || 0;
            if (beastCritRate > 0) totalCritRate += beastCritRate / 100;
        }
        var skillCritDmgBuff = (typeof Skills !== 'undefined') ? Skills.getBuffValue('crit_dmg_buff') : 0;
        var critMultiplier = 1.5 + talentEff.critDmg / 100 + skillCritDmgBuff / 100;
        var isCrit = Math.random() < totalCritRate;
        var playerDmgRaw = Math.floor(isCrit ? baseDmg * critMultiplier : baseDmg);
        // 应用怪物防御减免
        var playerDmg = this.getDefReducedDmg(playerDmgRaw, monsterDef);

        // 额外攻击次数（御剑术等）
        var extraAttacks = (typeof Skills !== 'undefined') ? Skills.getBuffValue('extra_attack') : 0;
        var totalAttacks = 1 + extraAttacks;
        if (totalAttacks > 1) {
            var totalPlayerDmg = 0;
            for (var atkIdx = 0; atkIdx < totalAttacks; atkIdx++) {
                var atkDmgRaw = Math.floor(isCrit ? (effectiveAtk * random(0.8, 1.2) * critMultiplier) : (effectiveAtk * random(0.8, 1.2)));
                totalPlayerDmg += this.getDefReducedDmg(atkDmgRaw, monsterDef);
            }
            playerDmg = totalPlayerDmg;
            this.addLog('额外攻击×' + totalAttacks + '！', '#ffd700');
        }

        // 套装额外伤害：青龙6件，20%概率附带50%额外伤害
        if (effects.extraDmgChance > 0 && Math.random() < effects.extraDmgChance / 100) {
            var extraDmg = Math.floor(playerDmg * effects.extraDmgPct / 100);
            playerDmg += extraDmg;
            this.addLog('套装·青龙！额外造成 ' + extraDmg + ' 点伤害', '#00ff88');
        }

        // BOSS增伤
        if (this.isBoss && effects.bossDmg > 0) {
            playerDmg = Math.floor(playerDmg * (1 + effects.bossDmg / 100));
        }

        if (isCrit) {
            this.addLog('暴击！对' + monsterName + '造成 ' + playerDmg + ' 点伤害', '#ff2222');
        } else {
            this.addLog('攻击' + monsterName + '，造成 ' + playerDmg + ' 点伤害', '#aaa');
        }

        this.monsterHP -= playerDmg;
        this.updateMonsterBar();

        // 怪物死亡
        if (this.monsterHP <= 0) {
            this.monsterHP = 0;
            this.updateMonsterBar();
            this.onMonsterKilled(zone, monsterName);
            return;
        }

        // 吸血效果（宗门 + 装备 + 套装）
        var totalLifesteal = sectBonus.lifestealPct + effects.lifesteal;
        if (totalLifesteal > 0) {
            var lifestealHeal = Math.floor(playerDmg * totalLifesteal / 100);
            if (lifestealHeal > 0) {
                this.playerHP = Math.min(this.playerHP + lifestealHeal, effectiveHp);
                this.addLog('吸血恢复 ' + lifestealHeal + ' 点生命', '#2ecc71');
            }
        }

        // 天赋暴击吸血（剑道10层）
        if (isCrit && talentEff.lifestealOnCrit > 0) {
            var critHeal = Math.floor(effectiveHp * talentEff.lifestealOnCrit / 100);
            if (critHeal > 0) {
                this.playerHP = Math.min(this.playerHP + critHeal, effectiveHp);
                this.addLog('剑域·暴击回血 +' + critHeal, '#ff8888');
            }
        }

        // 怪物攻击
        var stats = this._zoneStats;
        var monsterAtk = this.isBoss ? stats.bossAtk : stats.atk;
        var monsterRaw = monsterAtk * random(0.9, 1.1);
        var monsterDmg = Math.max(1, Math.floor(monsterRaw - effectiveDef * 0.3));

        // 技能减伤
        var skillDmgReduce = (typeof Skills !== 'undefined') ? Skills.getBuffValue('damage_reduce') : 0;
        if (skillDmgReduce > 0) {
            monsterDmg = Math.max(1, Math.floor(monsterDmg * (1 - skillDmgReduce / 100)));
        }

        // 天赋伤害减免
        if (talentEff.dmgReduce > 0) {
            monsterDmg = Math.max(1, Math.floor(monsterDmg * (1 - talentEff.dmgReduce / 100)));
        }

        // 技能格挡
        var skillBlock = (typeof Skills !== 'undefined') ? Skills.getBuffValue('block') : 0;
        if (skillBlock > 0 && Math.random() < skillBlock / 100) {
            monsterDmg = Math.floor(monsterDmg * 0.2);
            this.addLog('格挡！减免至 ' + monsterDmg + ' 点伤害', '#3399ff');
        }

        // 眩晕检查：怪物被stun时跳过攻击
        if (this._monsterStunned && this._monsterStunned > 0) {
            monsterDmg = 0;
            this._monsterStunned--;
            this.addLog(monsterName + '被麻痹，跳过攻击', '#ffd700');
        }

        // 技能闪避
        var skillDodge = (typeof Skills !== 'undefined') ? Skills.getBuffValue('dodge') : 0;
        var totalDodge = effects.dodgeRate + skillDodge;
        if (monsterDmg > 0 && totalDodge > 0 && Math.random() < totalDodge / 100) {
            monsterDmg = 0;
            this.addLog(monsterName + '攻击被闪避！', '#3399ff');
        }

        // 套装伤害减免：玄武6件，概率触发减免
        if (monsterDmg > 0 && effects.dmgReduceChance > 0 && Math.random() < effects.dmgReduceChance / 100) {
            monsterDmg = Math.floor(monsterDmg * (1 - effects.dmgReducePct / 100));
            this.addLog('套装·玄武！减免伤害至 ' + monsterDmg + ' 点', '#3399ff');
        }

        // 护盾吸收
        if (monsterDmg > 0 && typeof Skills !== 'undefined') {
            var beforeShield = monsterDmg;
            monsterDmg = Skills.absorbDamage(monsterDmg);
            if (monsterDmg < beforeShield) {
                this.addLog('护盾吸收 ' + (beforeShield - monsterDmg) + ' 点伤害', '#3399ff');
            }
        }

        this.addLog(monsterName + '攻击，受到 ' + monsterDmg + ' 点伤害', '#cc6666');

        this.playerHP -= monsterDmg;
        this.updatePlayerBar();

        // 反击判定
        var skillCounter = (typeof Skills !== 'undefined') ? Skills.getBuffValue('counter') : 0;
        var totalCounter = effects.counterRate + skillCounter;
        if (monsterDmg > 0 && totalCounter > 0 && Math.random() < totalCounter / 100) {
            var counterDmg = Math.floor(playerDmg * 0.5);
            this.monsterHP -= counterDmg;
            this.updateMonsterBar();
            this.addLog('反击！对' + monsterName + '造成 ' + counterDmg + ' 点伤害', '#ff8800');

            // 反击击杀
            if (this.monsterHP <= 0) {
                this.monsterHP = 0;
                this.updateMonsterBar();
                this.onMonsterKilled(zone, monsterName);
                return;
            }
        }

        // 天赋回合回血（体道10层）
        if (talentEff.regenPerTick > 0 && this.playerHP > 0) {
            var regenAmount = Math.floor(effectiveHp * talentEff.regenPerTick / 100);
            if (regenAmount > 0) {
                this.playerHP = Math.min(this.playerHP + regenAmount, effectiveHp);
                this.addLog('真身·回合回血 +' + regenAmount, '#2ecc71');
            }
        }

        // 角色死亡
        if (this.playerHP <= 0) {
            this.playerHP = 0;
            this.updatePlayerBar();
            this.addLog('你被 ' + monsterName + ' 击败了，休整后继续...', '#e74c3c');
            this.onPlayerDefeated();
        }
    },

    /* ----------------------------------------------------------
       怪物被击杀
       ---------------------------------------------------------- */
    onMonsterKilled: function (zone, monsterName) {
        // 停止战斗定时器
        if (this.fightTimer) { clearInterval(this.fightTimer); this.fightTimer = null; }

        this.killCount++;
        if (this.isBoss) this.bossKillCount++;
        this.updateKillStats();

        // 奖励
        var expReward = this.isBoss ? zone.exp * 3 : zone.exp;
        var spiritReward = this.isBoss ? zone.spirit * 3 : zone.spirit;

        // 装备/套装经验加成和灵石加成
        var effects = getEquipAndSetEffects();
        if (effects.expBonus > 0) {
            expReward = Math.floor(expReward * (1 + effects.expBonus / 100));
        }
        if (effects.spiritBonus > 0) {
            spiritReward = Math.floor(spiritReward * (1 + effects.spiritBonus / 100));
        }

        Game.addExperience(expReward);
        Game.addSpirit(spiritReward);

        // 套装击杀回复：朱雀6件
        if (effects.killHealPct > 0) {
            var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus)
                ? Sect.getSectBonus() : { hpPct: 0 };
            var buffBonus = (typeof Sect !== 'undefined' && Sect.getActiveBuffs)
                ? Sect.getActiveBuffs() : { hpPct: 0 };
            var maxHp = Math.floor(Game.data.hp * (1 + sectBonus.hpPct / 100 + buffBonus.hpPct / 100));
            var healAmt = Math.floor(maxHp * effects.killHealPct / 100);
            this.playerHP = Math.min(this.playerHP + healAmt, maxHp);
            this.addLog('套装·朱雀！击杀回复 ' + healAmt + ' 点生命', '#2ecc71');
        }

        // 技能被动：血祭（击杀回复HP）
        if (typeof Skills !== 'undefined') {
            var equippedSkills = Skills.getEquippedSkills();
            for (var eqi = 0; eqi < equippedSkills.length; eqi++) {
                var eqSkill = equippedSkills[eqi] ? Skills.findSkillById(equippedSkills[eqi]) : null;
                if (eqSkill && eqSkill.type === 'passive' && eqSkill.id === 's3_3') {
                    var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus)
                        ? Sect.getSectBonus() : { hpPct: 0 };
                    var buffBonus = (typeof Sect !== 'undefined' && Sect.getActiveBuffs)
                        ? Sect.getActiveBuffs() : { hpPct: 0 };
                    var skillAllBuff = Skills.getBuffValue('buff_all');
                    var totalHpPct = sectBonus.hpPct + buffBonus.hpPct + skillAllBuff;
                    var maxHp = Math.floor(Game.data.hp * (1 + totalHpPct / 100));
                    var passiveHeal = Math.floor(maxHp * eqSkill.value / 100);
                    this.playerHP = Math.min(this.playerHP + passiveHeal, maxHp);
                    this.addLog('血祭·击杀回复 ' + passiveHeal + ' 点生命', '#ff4444');
                }
            }
        }

        // 宗门任务进度联动 — 击杀
        if (typeof Sect !== 'undefined') {
            Sect.updateTaskProgress('kill', 1);
        }

        var killMsg = this.isBoss ? '击杀BOSS「' + monsterName + '」！' : '击杀 ' + monsterName + '！';
        this.addLog(killMsg + ' 经验+' + formatNumber(expReward) + ' 灵石+' + formatNumber(spiritReward), '#ffd700');

        // 装备掉落
        Equipment.rollDrop(this.zoneIndex, this.isBoss);

        // 1.5秒后刷下一只
        var self = this;
        this.spawnTimer = setTimeout(function () {
            if (self.active) self.spawnMonster();
        }, 1500);
    },

    /* ----------------------------------------------------------
       角色被击败
       ---------------------------------------------------------- */
    onPlayerDefeated: function () {
        if (this.fightTimer) { clearInterval(this.fightTimer); this.fightTimer = null; }

        // 2秒后满血复活继续
        var self = this;
        this.spawnTimer = setTimeout(function () {
            if (!self.active) return;
            // 读取宗门生命加成计算最大HP
            var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus)
                ? Sect.getSectBonus() : { hpPct: 0 };
            var buffBonus = (typeof Sect !== 'undefined' && Sect.getActiveBuffs)
                ? Sect.getActiveBuffs() : { hpPct: 0 };
            var maxHp = Math.floor(Game.data.hp * (1 + sectBonus.hpPct / 100 + buffBonus.hpPct / 100));
            self.playerHP = maxHp;
            self.addLog('满血复活，继续挂机！', '#2ecc71');
            self.spawnMonster();
        }, 2000);
    },

    /* ----------------------------------------------------------
       添加战斗日志
       ---------------------------------------------------------- */
    addLog: function (message, color) {
        var log = document.getElementById('battle-log');
        if (!log) return;

        var entry = document.createElement('div');
        entry.style.cssText = 'color:' + (color || '#aaa') + ';font-size:13px;padding:2px 0;' +
            'border-bottom:1px solid rgba(255,255,255,0.05);';
        entry.textContent = message;
        log.appendChild(entry);

        this.logCount++;
        if (this.logCount > 8) {
            var first = log.firstElementChild;
            if (first) first.remove();
        }
        log.scrollTop = log.scrollHeight;
    },

};
