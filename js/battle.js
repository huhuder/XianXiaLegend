/* ============================================================
   js/battle.js — 挂机战斗系统
   依赖 Game.data / utils.js / components.js
   进入即战斗，随机小怪/BOSS，不离开就一直挂机
   ============================================================ */

var Battle = {

    /* ----------------------------------------------------------
       地图数据（按境界解锁）
       ---------------------------------------------------------- */
    ZONES: [
        { name: '妖兽森林', realmRequired: 0, monsterName: '妖兽',   hp: 100,   atk: 10,   def: 5,   exp: 50,   spirit: 30 },
        { name: '幽冥鬼窟', realmRequired: 1, monsterName: '厉鬼',   hp: 500,   atk: 40,   def: 20,  exp: 200,  spirit: 100 },
        { name: '魔渊裂隙', realmRequired: 2, monsterName: '魔物',   hp: 2000,  atk: 150,  def: 80,  exp: 800,  spirit: 400 },
        { name: '上古遗迹', realmRequired: 3, monsterName: '石魔',   hp: 8000,  atk: 500,  def: 300, exp: 3000, spirit: 1500 },
        { name: '龙脉秘境', realmRequired: 4, monsterName: '蛟龙',   hp: 30000, atk: 1800, def: 1000,exp: 10000,spirit: 5000 },
        { name: '天劫废墟', realmRequired: 5, monsterName: '天魔',   hp: 100000,atk: 6000, def: 3000,exp: 40000,spirit: 20000 },
    ],

    /** BOSS名称词库 */
    BOSS_NAMES: ['远古', '深渊', '灭世', '噬魂', '血煞', '九幽', '混沌', '天罚', '裂空', '焚天'],

    /** 速度倍率 */
    SPEEDS: { '1x': 1000, '2x': 500, '3x': 333 },

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
                var unlocked = realmIndex >= zone.realmRequired;
                var isActive = self.zoneIndex === idx;

                var btn = document.createElement('button');
                btn.textContent = zone.name.substring(0, 4);
                btn.title = zone.name + '（需' + REALMS[zone.realmRequired] + '）';
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

        // 20%概率刷BOSS
        this.isBoss = Math.random() < 0.2;

        var bossName = '';
        if (this.isBoss) {
            bossName = this.BOSS_NAMES[randInt(0, this.BOSS_NAMES.length - 1)] + zone.monsterName + '王';
            this.monsterHP = zone.hp * 3;
            this.monsterMaxHP = zone.hp * 3;
        } else {
            this.monsterHP = zone.hp;
            this.monsterMaxHP = zone.hp;
        }

        // 渲染怪物信息
        this.renderMonsterInfo(zone, bossName);

        // 渲染玩家血条
        this.renderPlayerBar();

        // 开场日志
        if (this.isBoss) {
            this.addLog('⚠ BOSS「' + bossName + '」出现了！', '#ff4444');
        } else {
            this.addLog('遭遇 ' + zone.monsterName + '，准备战斗！', '#ffd700');
        }

        // 启动战斗定时器
        this.startFightTimer();
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
            nameEl.textContent = zone.monsterName;
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
            (this.BOSS_NAMES[randInt(0, this.BOSS_NAMES.length - 1)] + zone.monsterName + '王') :
            zone.monsterName;

        // 读取宗门功法加成
        var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus)
            ? Sect.getSectBonus() : { atkPct: 0, defPct: 0, hpPct: 0, lifestealPct: 0 };

        // 读取宗门 Buff 加成（丹药等）
        var buffBonus = (typeof Sect !== 'undefined' && Sect.getActiveBuffs)
            ? Sect.getActiveBuffs() : { atkPct: 0, defPct: 0, hpPct: 0, enhanceRate: 0 };

        // 角色攻击（含宗门加成）
        var effectiveAtk = Math.floor(Game.data.attack * (1 + sectBonus.atkPct / 100 + buffBonus.atkPct / 100));
        var effectiveDef = Math.floor(Game.data.defense * (1 + sectBonus.defPct / 100 + buffBonus.defPct / 100));
        var effectiveHp = Math.floor(Game.data.hp * (1 + sectBonus.hpPct / 100 + buffBonus.hpPct / 100));

        // 角色攻击
        var baseDmg = effectiveAtk * random(0.8, 1.2);
        var isCrit = Math.random() < (Game.data.critRate || 0.05);
        var playerDmg = Math.floor(isCrit ? baseDmg * 1.5 : baseDmg);

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

        // 吸血效果
        var totalLifesteal = sectBonus.lifestealPct;
        if (totalLifesteal > 0) {
            var lifestealHeal = Math.floor(playerDmg * totalLifesteal / 100);
            if (lifestealHeal > 0) {
                this.playerHP = Math.min(this.playerHP + lifestealHeal, effectiveHp);
                this.addLog('吸血恢复 ' + lifestealHeal + ' 点生命', '#2ecc71');
            }
        }

        // 怪物攻击
        var monsterAtk = this.isBoss ? zone.atk * 2 : zone.atk;
        var monsterRaw = monsterAtk * random(0.9, 1.1);
        var monsterDmg = Math.max(1, Math.floor(monsterRaw - effectiveDef * 0.3));
        this.addLog(monsterName + '攻击，受到 ' + monsterDmg + ' 点伤害', '#cc6666');

        this.playerHP -= monsterDmg;
        this.updatePlayerBar();

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

        Game.addExperience(expReward);
        Game.addSpirit(spiritReward);

        // 宗门任务进度联动 — 击杀
        if (typeof Sect !== 'undefined') {
            Sect.updateTaskProgress('kill', 1);
        }

        var killMsg = this.isBoss ? '击杀BOSS「' + monsterName + '」！' : '击杀 ' + monsterName + '！';
        this.addLog(killMsg + ' 经验+' + formatNumber(expReward) + ' 灵石+' + formatNumber(spiritReward), '#ffd700');

        // 装备掉落
        Equipment.rollDrop(this.zoneIndex);

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
