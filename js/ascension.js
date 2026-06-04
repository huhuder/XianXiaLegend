/* ============================================================
   js/ascension.js — 飞升系统（第6批）
   依赖 Game.data / utils.js / components.js / worldBoss.js（伤害公式参考）
   ============================================================ */

var TRIBULATIONS = [
    { name: '九天神雷劫', atk: 60000, def: 40000, hp: 80000,   timeLimit: 60 },
    { name: '焚天烈火劫', atk: 75000, def: 50000, hp: 100000,  timeLimit: 60 },
    { name: '无相心魔劫', atk: 90000, def: 60000, hp: 130000,  timeLimit: 60 }
];

var ASCENSION_TITLES = [
    '一劫散仙', '二劫散仙', '三劫散仙', '四劫散仙', '五劫散仙',
    '六劫散仙', '七劫散仙', '八劫散仙', '九劫散仙', '十劫散仙'
];

var Ascension = {

    /* ----------------------------------------------------------
       状态
       ---------------------------------------------------------- */
    inTribulation: false,
    currentWave: 0,           // 0/1/2
    tribulationTimer: null,
    tribulationTick: 0,
    tribulationMaxTick: 60,    // 60秒
    playerHp: 0,
    bossHp: 0,
    bossMaxHp: 0,
    totalDamage: 0,

    /* ----------------------------------------------------------
       检查是否满足飞升条件
       ---------------------------------------------------------- */
    canAscend: function () {
        if (!Cultivation.isAscensionThreshold()) return false;
        if (!Cultivation.isExpFull()) return false;
        if (Game.data.spiritStones < 100000) return false;
        if (this.inTribulation) return false;
        return true;
    },

    /* ----------------------------------------------------------
       开始飞升流程
       ---------------------------------------------------------- */
    startAscension: function () {
        if (!this.canAscend()) {
            if (!Cultivation.isAscensionThreshold()) {
                showToast('需修炼至渡劫·十层方可渡劫飞升！', 2000);
            } else if (!Cultivation.isExpFull()) {
                showToast('经验尚未圆满，无法渡劫！', 2000);
            } else if (Game.data.spiritStones < 100000) {
                showToast('灵石不足 100000，无法开启天劫！', 2000);
            }
            return;
        }

        // 扣除灵石
        Game.data.spiritStones -= 100000;
        Game.data.ascensionFailed = false;
        Game.saveGame();

        // 进入第一波
        this.currentWave = 0;
        this.startTribulation(0);
    },

    /* ----------------------------------------------------------
       开始第N波天劫
       ---------------------------------------------------------- */
    startTribulation: function (waveIndex) {
        var trib = TRIBULATIONS[waveIndex];
        if (!trib) {
            // 所有波次通过
            this.completeAscension();
            return;
        }

        this.inTribulation = true;
        this.currentWave = waveIndex;
        this.tribulationTick = 0;
        this.totalDamage = 0;

        // 玩家HP（含宗门+天赋+套装加成）
        var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus) ? Sect.getSectBonus() : { hpPct: 0 };
        var buffBonus = (typeof Sect !== 'undefined' && Sect.getActiveBuffs) ? Sect.getActiveBuffs() : { hpPct: 0 };
        var talentEff = (typeof Talents !== 'undefined') ? Talents.getEffects() : { hpPct: 0 };
        var totalHpPct = sectBonus.hpPct + buffBonus.hpPct + talentEff.hpPct;
        if (typeof Equipment !== 'undefined') {
            var setBonuses = Equipment.getActiveSetBonuses();
            for (var _si = 0; _si < setBonuses.length; _si++) {
                if (setBonuses[_si].effects.hpPct) totalHpPct += setBonuses[_si].effects.hpPct;
            }
        }
        this.playerHp = Math.floor(Game.data.hp * (1 + totalHpPct / 100));

        // Boss HP
        this.bossMaxHp = trib.hp;
        this.bossHp = trib.hp;

        // 渲染天劫界面
        this.renderTribulationUI(trib, waveIndex);

        // 启动倒计时
        var self = this;
        this.tribulationTimer = setInterval(function () {
            self.tribulationTickFunc();
        }, 1000);
    },

    /* ----------------------------------------------------------
       渲染天劫战斗界面
       ---------------------------------------------------------- */
    renderTribulationUI: function (trib, waveIndex) {
        // 切换到飞升Tab
        Game.switchTab('ascend');

        var container = document.getElementById('tab-ascend');
        if (!container) return;

        container.innerHTML = '';
        container.style.cssText = 'position:relative;min-height:400px;';

        // 全屏天劫背景
        var overlay = document.createElement('div');
        overlay.id = 'tribulation-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
            'background:radial-gradient(ellipse at 50% 30%, rgba(128,0,128,0.4), rgba(20,0,0,0.95));' +
            'z-index:9990;pointer-events:none;' +
            'animation:tribLightning 3s ease-in-out infinite;';
        document.body.appendChild(overlay);

        // 天劫标题
        var title = document.createElement('div');
        title.style.cssText = 'text-align:center;font-size:22px;font-weight:bold;' +
            'color:#ff4444;font-family:var(--font-title);letter-spacing:4px;' +
            'margin-bottom:10px;text-shadow:0 0 20px rgba(255,0,0,0.6);';
        title.textContent = '⚡ ' + trib.name + ' ⚡';
        container.appendChild(title);

        // 波次显示
        var waveInfo = document.createElement('div');
        waveInfo.style.cssText = 'text-align:center;font-size:13px;color:#d4a574;margin-bottom:12px;';
        waveInfo.textContent = '第 ' + (waveIndex + 1) + ' / ' + TRIBULATIONS.length + ' 波';
        container.appendChild(waveInfo);

        // Boss 血量条
        var bossSection = document.createElement('div');
        bossSection.style.cssText = 'background:rgba(0,0,0,0.5);border-radius:10px;padding:10px 12px;margin-bottom:10px;' +
            'border:1px solid rgba(255,50,50,0.4);';

        var bossLabel = document.createElement('div');
        bossLabel.style.cssText = 'font-size:12px;color:#ff6666;margin-bottom:4px;';
        bossLabel.textContent = trib.name + ' HP';
        bossSection.appendChild(bossLabel);

        var bossBar = createProgressBar(this.bossHp, this.bossMaxHp,
            'linear-gradient(90deg,#8b0000,#ff0000,#ff4444)',
            formatNumber(this.bossHp) + ' / ' + formatNumber(this.bossMaxHp));
        bossBar.id = 'trib-boss-hp-bar';
        bossSection.appendChild(bossBar);
        container.appendChild(bossSection);

        // 玩家血量条
        var playerSection = document.createElement('div');
        playerSection.style.cssText = 'background:rgba(0,0,0,0.5);border-radius:10px;padding:10px 12px;margin-bottom:10px;' +
            'border:1px solid rgba(50,100,255,0.4);';

        var playerLabel = document.createElement('div');
        playerLabel.style.cssText = 'font-size:12px;color:#6699ff;margin-bottom:4px;';
        playerLabel.textContent = Game.data.playerName + ' HP';
        playerSection.appendChild(playerLabel);

        var playerBar = createProgressBar(this.playerHp, this.playerHp,
            'linear-gradient(90deg,#1a5276,#2980b9,#3498db)',
            formatNumber(this.playerHp) + ' / ' + formatNumber(this.playerHp));
        playerBar.id = 'trib-player-hp-bar';
        playerSection.appendChild(playerBar);
        container.appendChild(playerSection);

        // 倒计时
        var timerEl = document.createElement('div');
        timerEl.id = 'trib-timer';
        timerEl.style.cssText = 'text-align:center;font-size:18px;color:#ffd700;font-family:var(--font-title);' +
            'letter-spacing:2px;margin:10px 0;';
        timerEl.textContent = '倒计时：' + this.tribulationMaxTick + ' 秒';
        container.appendChild(timerEl);

        // 总伤害
        var dmgEl = document.createElement('div');
        dmgEl.id = 'trib-total-dmg';
        dmgEl.style.cssText = 'text-align:center;font-size:13px;color:#aaa;margin-bottom:8px;';
        dmgEl.textContent = '总伤害：0';
        container.appendChild(dmgEl);

        // 战斗日志
        var logArea = document.createElement('div');
        logArea.id = 'trib-log-area';
        logArea.style.cssText = 'background:rgba(10,10,25,0.9);border:1px solid rgba(184,134,11,0.3);' +
            'border-radius:8px;padding:8px 10px;min-height:100px;max-height:140px;overflow-y:auto;' +
            'font-size:11px;line-height:1.6;margin-bottom:10px;';
        container.appendChild(logArea);

        // 退出按钮
        var quitBtn = document.createElement('button');
        quitBtn.textContent = '放弃渡劫';
        quitBtn.style.cssText = 'display:block;width:100%;padding:10px 0;border:1px solid #c0392b;' +
            'border-radius:8px;background:rgba(192,57,43,0.15);color:#e74c3c;font-size:14px;' +
            'font-family:inherit;cursor:pointer;';
        quitBtn.addEventListener('click', function () {
            Ascension.failAscension();
        });
        container.appendChild(quitBtn);

        // 开场日志
        this.addTribLog('⚡ 天劫「' + trib.name + '」降临！', '#ff4444');
        this.addTribLog('在 ' + this.tribulationMaxTick + ' 秒内击败天劫，方可进入下一波！', '#ffd700');
    },

    /* ----------------------------------------------------------
       天劫战斗Tick
       ---------------------------------------------------------- */
    tribulationTickFunc: function () {
        if (!this.inTribulation) return;

        this.tribulationTick++;

        var trib = TRIBULATIONS[this.currentWave];
        var d = Game.data;

        // 玩家属性（含宗门+天赋+套装+技能Buff加成）
        var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus) ? Sect.getSectBonus() : { atkPct: 0, defPct: 0, hpPct: 0 };
        var buffBonus = (typeof Sect !== 'undefined' && Sect.getActiveBuffs) ? Sect.getActiveBuffs() : { atkPct: 0, defPct: 0, hpPct: 0 };
        var talentEff = (typeof Talents !== 'undefined') ? Talents.getEffects() : { atkPct: 0, defPct: 0, hpPct: 0, critRate: 0 };
        var skillAtkBuff = (typeof Skills !== 'undefined') ? Skills.getBuffValue('buff_atk') : 0;
        var skillAllBuff = (typeof Skills !== 'undefined') ? Skills.getBuffValue('buff_all') : 0;
        var totalAtkPct = sectBonus.atkPct + buffBonus.atkPct + talentEff.atkPct + skillAtkBuff + skillAllBuff;
        var totalDefPct = sectBonus.defPct + buffBonus.defPct + talentEff.defPct + skillAllBuff;

        // 套装加成
        if (typeof Equipment !== 'undefined') {
            var setBonuses = Equipment.getActiveSetBonuses();
            for (var si = 0; si < setBonuses.length; si++) {
                var se = setBonuses[si].effects;
                if (se.atkPct) totalAtkPct += se.atkPct;
                if (se.defPct) totalDefPct += se.defPct;
            }
        }

        var effectiveAtk = Math.floor(d.attack * (1 + totalAtkPct / 100));
        var effectiveDef = Math.floor(d.defense * (1 + totalDefPct / 100));

        // 灵兽出战加成（11-4批）
        if (typeof Beast !== 'undefined' && Beast.getActiveBeastBonus) {
            var beastBonus = Beast.getActiveBeastBonus();
            effectiveAtk += beastBonus.atk;
            effectiveDef += beastBonus.def;
        }

        // 动态暴击率：基础 + 装备效果 + 套装 + 天赋
        var totalCritRate = (d.critRate || 0.05);
        var equipped = d.equipped || [];
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
            for (var sk2 = 0; sk2 < setBonuses2.length; sk2++) {
                if (setBonuses2[sk2].effects.critRate) totalCritRate += setBonuses2[sk2].effects.critRate / 100;
            }
        }
        totalCritRate += talentEff.critRate / 100;
        // 灵兽暴击率加成
        if (typeof Beast !== 'undefined' && Beast.getActiveBeastBonus) {
            var beastCritRate = Beast.getActiveBeastBonus().critRate || 0;
            if (beastCritRate > 0) totalCritRate += beastCritRate / 100;
        }

        // 玩家攻击天劫
        var baseDmg = effectiveAtk * random(0.8, 1.2);
        var isCrit = Math.random() < totalCritRate;
        var playerDmg = Math.floor(isCrit ? baseDmg * 1.5 : baseDmg);

        this.bossHp -= playerDmg;
        this.totalDamage += playerDmg;

        if (isCrit) {
            this.addTribLog('暴击！对' + trib.name + '造成 ' + formatNumber(playerDmg) + ' 点伤害', '#ff2222');
        } else {
            this.addTribLog('对' + trib.name + '造成 ' + formatNumber(playerDmg) + ' 点伤害', '#ffaaaa');
        }

        // 更新Boss血条
        this.updateTribBossBar();

        // 检查Boss是否死亡
        if (this.bossHp <= 0) {
            this.bossHp = 0;
            this.updateTribBossBar();
            this.addTribLog('✅ 成功渡过 ' + trib.name + '！', '#2ecc71');
            this.nextWave();
            return;
        }

        // 天劫攻击玩家
        var bossRaw = trib.atk * random(0.9, 1.1);
        var bossDmg = Math.max(1, Math.floor(bossRaw - effectiveDef * 0.3));

        // 技能护盾吸收
        if (Game.data.skillShield && Game.data.skillShield > 0) {
            var absorbed = Math.min(Game.data.skillShield, bossDmg);
            Game.data.skillShield -= absorbed;
            bossDmg -= absorbed;
            if (absorbed > 0) {
                this.addTribLog('护盾吸收 ' + absorbed + ' 点伤害', '#38bdf8');
            }
        }

        this.playerHp -= bossDmg;

        this.addTribLog(trib.name + '攻击，你受到 ' + formatNumber(bossDmg) + ' 点伤害', '#ff6666');
        this.updateTribPlayerBar();

        // 检查玩家是否死亡
        if (this.playerHp <= 0) {
            this.playerHp = 0;
            this.updateTribPlayerBar();
            this.addTribLog('⚠ 你被天劫击溃...', '#e74c3c');
            this.failAscension();
            return;
        }

        // 更新倒计时
        var remaining = this.tribulationMaxTick - this.tribulationTick;
        var timerEl = document.getElementById('trib-timer');
        if (timerEl) {
            timerEl.textContent = '倒计时：' + remaining + ' 秒';
            if (remaining <= 10) {
                timerEl.style.color = '#ff4444';
            }
        }

        // 更新总伤害
        var dmgEl = document.getElementById('trib-total-dmg');
        if (dmgEl) dmgEl.textContent = '总伤害：' + formatNumber(this.totalDamage);

        // 超时检查
        if (this.tribulationTick >= this.tribulationMaxTick) {
            this.addTribLog('⏰ 时间耗尽，天劫未破...', '#e74c3c');
            this.failAscension();
        }
    },

    /* ----------------------------------------------------------
       进入下一波
       ---------------------------------------------------------- */
    nextWave: function () {
        if (this.tribulationTimer) {
            clearInterval(this.tribulationTimer);
            this.tribulationTimer = null;
        }

        this.currentWave++;

        if (this.currentWave >= TRIBULATIONS.length) {
            // 所有波次通过
            this.completeAscension();
        } else {
            // 下一波
            var self = this;
            setTimeout(function () {
                if (self.inTribulation) {
                    self.startTribulation(self.currentWave);
                }
            }, 2000);
        }
    },

    /* ----------------------------------------------------------
       天劫失败
       ---------------------------------------------------------- */
    failAscension: function () {
        this.inTribulation = false;
        this.currentWave = 0;

        if (this.tribulationTimer) {
            clearInterval(this.tribulationTimer);
            this.tribulationTimer = null;
        }

        // 标记失败（保留进度，可重新挑战）
        Game.data.ascensionFailed = true;
        Game.saveGame();

        // 移除天劫背景
        this.removeTribulationOverlay();

        // 显示失败界面
        this.renderFailureUI();
    },

    /* ----------------------------------------------------------
       渲染失败界面
       ---------------------------------------------------------- */
    renderFailureUI: function () {
        var container = document.getElementById('tab-ascend');
        if (!container) return;

        container.innerHTML = '';
        container.style.cssText = 'text-align:center;padding:40px 20px;';

        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:64px;margin-bottom:16px;opacity:0.5;filter:grayscale(1);';
        icon.textContent = '💀';
        container.appendChild(icon);

        var title = document.createElement('div');
        title.style.cssText = 'font-size:20px;color:#666;font-family:var(--font-title);letter-spacing:3px;margin-bottom:12px;';
        title.textContent = '渡劫失败';
        container.appendChild(title);

        var desc = document.createElement('div');
        desc.style.cssText = 'font-size:13px;color:var(--text-muted);margin-bottom:20px;line-height:1.8;';
        desc.textContent = '天劫凶险，道友尚欠火候...\n灵石已消耗，但来日方长，可再次挑战！';
        desc.style.whiteSpace = 'pre-line';
        container.appendChild(desc);

        // 重新挑战按钮
        var retryBtn = document.createElement('button');
        retryBtn.textContent = '重新挑战';
        retryBtn.style.cssText = 'display:block;width:80%;margin:0 auto 10px;padding:12px 0;' +
            'border:2px solid #d4a574;border-radius:10px;background:rgba(212,165,116,0.15);' +
            'color:#d4a574;font-size:16px;font-weight:bold;font-family:var(--font-title);' +
            'letter-spacing:2px;cursor:pointer;transition:all 0.3s;';
        retryBtn.addEventListener('mouseenter', function () {
            retryBtn.style.background = 'rgba(212,165,116,0.3)';
            retryBtn.style.boxShadow = '0 0 20px rgba(212,165,116,0.3)';
        });
        retryBtn.addEventListener('mouseleave', function () {
            retryBtn.style.background = 'rgba(212,165,116,0.15)';
            retryBtn.style.boxShadow = 'none';
        });
        retryBtn.addEventListener('click', function () {
            Ascension.startAscension();
        });
        container.appendChild(retryBtn);

        // 返回角色页
        var backBtn = document.createElement('button');
        backBtn.textContent = '返回';
        backBtn.style.cssText = 'display:block;width:80%;margin:0 auto;padding:10px 0;' +
            'border:1px solid #555;border-radius:8px;background:transparent;' +
            'color:#888;font-size:14px;font-family:inherit;cursor:pointer;';
        backBtn.addEventListener('click', function () {
            Game.switchTab('character');
        });
        container.appendChild(backBtn);
    },

    /* ----------------------------------------------------------
       天劫成功 — 飞升！
       ---------------------------------------------------------- */
    completeAscension: function () {
        this.inTribulation = false;

        if (this.tribulationTimer) {
            clearInterval(this.tribulationTimer);
            this.tribulationTimer = null;
        }

        // 移除天劫背景
        this.removeTribulationOverlay();

        // 飞升处理
        Game.data.ascensionCount = (Game.data.ascensionCount || 0) + 1;
        Game.data.ascensionFailed = false;

        // 奖励天赋点
        if (typeof Talents !== 'undefined') {
            Talents.addPoints(3);
        }

        // 增加技能槽（最多5个）
        if (typeof Skills !== 'undefined') {
            Game.data.skillSlots = Math.min((Game.data.skillSlots || 2) + 1, 5);
        }

        // 属性乘以 1.2
        var mult = 1.2;
        Game.data.hp = Math.floor(Game.data.hp * mult);
        Game.data.attack = Math.floor(Game.data.attack * mult);
        Game.data.defense = Math.floor(Game.data.defense * mult);

        // 重置境界
        Game.data.realmIndex = 0;
        Game.data.layer = 0;
        Game.data.experience = 0;

        // 重置地图解锁
        var zonesLen = (typeof Battle !== 'undefined') ? Battle.ZONES.length : 10;
        Game.data.battleUnlocked = [true].concat(Array(zonesLen - 1).fill(false));

        Game.saveGame();

        // 显示飞升成功界面
        this.renderSuccessUI();
    },

    /* ----------------------------------------------------------
       渲染飞升成功界面
       ---------------------------------------------------------- */
    renderSuccessUI: function () {
        var container = document.getElementById('tab-ascend');
        if (!container) return;

        container.innerHTML = '';
        container.style.cssText = 'position:relative;text-align:center;padding:30px 20px;';

        // 金色光效层
        var goldenOverlay = document.createElement('div');
        goldenOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
            'background:radial-gradient(circle,rgba(255,215,0,0.7) 0%,rgba(255,180,0,0.3) 50%,transparent 100%);' +
            'pointer-events:none;z-index:9990;' +
            'animation:ascendGlow 2s ease-out forwards;';
        document.body.appendChild(goldenOverlay);

        // 存储引用以便移除
        this._goldenOverlay = goldenOverlay;

        // 添加光效动画CSS（如果尚未添加）
        this.ensureAscendAnimationCSS();

        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:72px;margin-bottom:16px;animation:ascendPulse 1.5s ease-in-out infinite;';
        icon.textContent = '✨';
        container.appendChild(icon);

        var title = document.createElement('div');
        title.style.cssText = 'font-size:28px;color:#ffd700;font-family:var(--font-title);' +
            'letter-spacing:6px;margin-bottom:12px;text-shadow:0 0 30px rgba(255,215,0,0.8);';
        title.textContent = '飞 升 成 功';
        container.appendChild(title);

        var titleText = this.getAscensionTitle();
        var titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size:20px;color:#d4a574;font-family:var(--font-title);' +
            'letter-spacing:4px;margin-bottom:16px;';
        titleEl.textContent = '— ' + titleText + ' —';
        container.appendChild(titleEl);

        var statsBox = document.createElement('div');
        statsBox.style.cssText = 'background:rgba(15,52,96,0.5);border:1px solid rgba(184,134,11,0.3);' +
            'border-radius:12px;padding:16px;margin-bottom:20px;text-align:left;';

        var stats = [
            '飞升次数：' + Game.data.ascensionCount + ' 次',
            '属性加成：×' + this.getAscensionMultiplier().toFixed(1),
            '修炼速度：+' + (this.getCultivateSpeedBonus() * 100) + '%',
            '天赋点：+3（当前 ' + (Game.data.talentPoints || 0) + ' 点）',
            '生命：' + formatNumber(Game.data.hp),
            '攻击：' + formatNumber(Game.data.attack),
            '防御：' + formatNumber(Game.data.defense)
        ];

        stats.forEach(function (s) {
            var p = document.createElement('div');
            p.style.cssText = 'font-size:13px;color:var(--text-primary);padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);';
            p.textContent = s;
            statsBox.appendChild(p);
        });

        container.appendChild(statsBox);

        // 返回角色页
        var backBtn = document.createElement('button');
        backBtn.textContent = '返回角色';
        backBtn.style.cssText = 'display:block;width:80%;margin:0 auto;padding:12px 0;' +
            'border:2px solid #ffd700;border-radius:10px;' +
            'background:linear-gradient(135deg,rgba(255,215,0,0.2),rgba(255,215,0,0.05));' +
            'color:#ffd700;font-size:16px;font-weight:bold;font-family:var(--font-title);' +
            'letter-spacing:2px;cursor:pointer;transition:all 0.3s;';
        backBtn.addEventListener('mouseenter', function () {
            backBtn.style.boxShadow = '0 0 30px rgba(255,215,0,0.5)';
        });
        backBtn.addEventListener('mouseleave', function () {
            backBtn.style.boxShadow = 'none';
        });
        backBtn.addEventListener('click', function () {
            Ascension.removeTribulationOverlay();
            if (Ascension._goldenOverlay) {
                Ascension._goldenOverlay.remove();
                Ascension._goldenOverlay = null;
            }
            Game.switchTab('character');
            Cultivation.updateAllUI();
            Game.updatePower();
        });
        container.appendChild(backBtn);

        // 3秒后自动移除光效
        setTimeout(function () {
            if (Ascension._goldenOverlay) {
                Ascension._goldenOverlay.style.opacity = '0';
                Ascension._goldenOverlay.style.transition = 'opacity 1s ease';
                setTimeout(function () {
                    if (Ascension._goldenOverlay) {
                        Ascension._goldenOverlay.remove();
                        Ascension._goldenOverlay = null;
                    }
                }, 1000);
            }
        }, 3000);

        // 更新角色页UI
        Cultivation.updateAllUI();
        Game.updatePower();
    },

    /* ----------------------------------------------------------
       移除天劫背景
       ---------------------------------------------------------- */
    removeTribulationOverlay: function () {
        var overlay = document.getElementById('tribulation-overlay');
        if (overlay) overlay.remove();
    },

    /* ----------------------------------------------------------
       添加天劫日志
       ---------------------------------------------------------- */
    addTribLog: function (message, color) {
        var logArea = document.getElementById('trib-log-area');
        if (!logArea) return;

        var entry = document.createElement('div');
        entry.style.cssText = 'color:' + (color || '#aaa') + ';padding:1px 0;border-bottom:1px solid rgba(255,255,255,0.03);';
        entry.textContent = message;
        logArea.appendChild(entry);
        logArea.scrollTop = logArea.scrollHeight;

        // 限制日志行数
        while (logArea.children.length > 30) {
            logArea.removeChild(logArea.firstChild);
        }
    },

    /* ----------------------------------------------------------
       更新天劫Boss血条
       ---------------------------------------------------------- */
    updateTribBossBar: function () {
        var bar = document.getElementById('trib-boss-hp-bar');
        if (!bar) return;
        var fill = bar.querySelector('div');
        if (fill) {
            var pct = Math.max(0, (this.bossHp / this.bossMaxHp) * 100);
            fill.style.width = pct + '%';
        }
        var label = bar.querySelectorAll('div')[1];
        if (label) {
            label.textContent = formatNumber(Math.max(0, this.bossHp)) + ' / ' + formatNumber(this.bossMaxHp);
        }
    },

    /* ----------------------------------------------------------
       更新天劫玩家血条
       ---------------------------------------------------------- */
    updateTribPlayerBar: function () {
        var bar = document.getElementById('trib-player-hp-bar');
        if (!bar) return;

        var sectBonus = (typeof Sect !== 'undefined' && Sect.getSectBonus) ? Sect.getSectBonus() : { hpPct: 0 };
        var buffBonus = (typeof Sect !== 'undefined' && Sect.getActiveBuffs) ? Sect.getActiveBuffs() : { hpPct: 0 };
        var maxHp = Math.floor(Game.data.hp * (1 + sectBonus.hpPct / 100 + buffBonus.hpPct / 100));

        var fill = bar.querySelector('div');
        if (fill) {
            var pct = Math.max(0, (this.playerHp / maxHp) * 100);
            fill.style.width = pct + '%';
        }
        var label = bar.querySelectorAll('div')[1];
        if (label) {
            label.textContent = formatNumber(Math.max(0, this.playerHp)) + ' / ' + formatNumber(maxHp);
        }
    },

    /* ----------------------------------------------------------
       飞升倍率：Math.pow(1.2, ascensionCount)
       ---------------------------------------------------------- */
    getAscensionMultiplier: function () {
        var count = Game.data.ascensionCount || 0;
        return Math.pow(1.2, count);
    },

    /* ----------------------------------------------------------
       修炼速度加成：ascensionCount * 0.5 (即 50% 每劫)
       ---------------------------------------------------------- */
    getCultivateSpeedBonus: function () {
        return (Game.data.ascensionCount || 0) * 0.5;
    },

    /* ----------------------------------------------------------
       飞升称号
       ---------------------------------------------------------- */
    getAscensionTitle: function () {
        var count = Game.data.ascensionCount || 0;
        if (count <= 0) return '';
        if (count <= ASCENSION_TITLES.length) {
            return ASCENSION_TITLES[count - 1];
        }
        return '超脱轮回·无上真仙';
    },

    /* ----------------------------------------------------------
       确保飞升动画CSS已注入
       ---------------------------------------------------------- */
    ensureAscendAnimationCSS: function () {
        if (document.getElementById('ascend-anim-style')) return;

        var style = document.createElement('style');
        style.id = 'ascend-anim-style';
        style.textContent =
            '@keyframes ascendGlow {' +
            '  0% { opacity:0; }' +
            '  20% { opacity:1; }' +
            '  80% { opacity:1; }' +
            '  100% { opacity:0; }' +
            '}' +
            '@keyframes ascendPulse {' +
            '  0%,100% { transform:scale(1); }' +
            '  50% { transform:scale(1.15); }' +
            '}' +
            '@keyframes tribLightning {' +
            '  0%,100% { opacity:0.7; }' +
            '  50% { opacity:1; }' +
            '}';
        document.head.appendChild(style);
    },

    /* ----------------------------------------------------------
       初始化（在 Game.init 中调用）
       ---------------------------------------------------------- */
    init: function () {
        // 确保 ascensionCount 和 ascensionFailed 字段存在
        if (Game.data.ascensionCount === undefined) Game.data.ascensionCount = 0;
        if (Game.data.ascensionFailed === undefined) Game.data.ascensionFailed = false;
    },

    /* ----------------------------------------------------------
       渲染飞升页面（独立Tab入口，懒加载调用）
       ---------------------------------------------------------- */
    renderAscensionPage: function () {
        // 天劫进行中时不覆盖UI
        if (this.inTribulation) return;

        var container = document.getElementById('ascension-page-content');
        if (!container) {
            // 容器可能被天劫UI销毁，重新创建
            var tabPage = document.getElementById('tab-ascend');
            if (!tabPage) return;
            tabPage.innerHTML = '';
            container = document.createElement('div');
            container.id = 'ascension-page-content';
            tabPage.appendChild(container);
        }

        var count = Game.data.ascensionCount || 0;
        var html = '';

        if (count > 0) {
            // 已飞升状态
            html += '<div style="text-align:center;padding:10px 0;">' +
                '<div style="font-size:48px;margin-bottom:10px;">✨</div>' +
                '<div style="font-size:20px;font-weight:bold;color:#ffd700;' +
                'font-family:var(--font-title);letter-spacing:4px;margin-bottom:8px;">' +
                this.getAscensionTitle() + '</div>' +
                '<div style="font-size:14px;color:var(--gold-main);margin-bottom:20px;">' +
                '已飞升 <span style="color:#ffd700;font-weight:bold;">' + count + '</span> 次</div>' +
                '</div>';

            // 属性加成信息
            html += '<div style="background:rgba(15,52,96,0.4);border:1px solid rgba(184,134,11,0.2);' +
                'border-radius:12px;padding:14px 16px;margin-bottom:16px;">' +
                '<div style="font-size:14px;color:var(--gold-main);font-family:var(--font-title);' +
                'letter-spacing:2px;margin-bottom:10px;text-align:center;">飞升之力</div>' +
                '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">' +
                '<span style="color:var(--text-secondary);">属性倍率</span>' +
                '<span style="color:#ffd700;font-weight:bold;">×' + this.getAscensionMultiplier().toFixed(1) + '</span>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">' +
                '<span style="color:var(--text-secondary);">修炼速度</span>' +
                '<span style="color:#2ecc71;font-weight:bold;">+' + (this.getCultivateSpeedBonus() * 100) + '%</span>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">' +
                '<span style="color:var(--text-secondary);">生命</span>' +
                '<span style="color:var(--text-primary);font-weight:bold;">' + formatNumber(Game.data.hp) + '</span>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">' +
                '<span style="color:var(--text-secondary);">攻击</span>' +
                '<span style="color:var(--text-primary);font-weight:bold;">' + formatNumber(Game.data.attack) + '</span>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">' +
                '<span style="color:var(--text-secondary);">防御</span>' +
                '<span style="color:var(--text-primary);font-weight:bold;">' + formatNumber(Game.data.defense) + '</span>' +
                '</div>' +
                '</div>';

            // 渡劫按钮
            if (this.canAscend()) {
                html += '<button id="ascend-trib-btn" ' +
                    'style="display:block;width:100%;padding:14px 0;' +
                    'border:2px solid #ffd700;border-radius:12px;' +
                    'background:linear-gradient(135deg,rgba(255,215,0,0.2),rgba(255,180,0,0.08));' +
                    'color:#ffd700;font-size:18px;font-weight:bold;font-family:var(--font-title);' +
                    'letter-spacing:4px;cursor:pointer;transition:all 0.3s;' +
                    'box-shadow:0 0 20px rgba(255,215,0,0.3);">渡 劫 飞 升</button>';
                if (Game.data.ascensionFailed) {
                    html += '<div style="text-align:center;font-size:12px;color:#e74c3c;margin-top:8px;">' +
                        '上次渡劫失败，请再次挑战！</div>';
                }
            } else {
                html += '<div style="text-align:center;padding:16px;' +
                    'background:rgba(15,52,96,0.3);border:1px solid rgba(184,134,11,0.15);' +
                    'border-radius:10px;font-size:13px;color:var(--text-secondary);line-height:1.8;">';
                if (!Cultivation.isAscensionThreshold()) {
                    html += '需修炼至渡劫·十层方可渡劫飞升';
                } else if (!Cultivation.isExpFull()) {
                    html += '境界已达巅峰，但经验尚未圆满';
                } else if (Game.data.spiritStones < 100000) {
                    html += '灵石不足（需 100,000），无法开启天劫';
                }
                html += '</div>';
            }
        } else {
            // 未飞升状态
            html += '<div style="text-align:center;padding:40px 20px;">' +
                '<div style="font-size:64px;margin-bottom:16px;opacity:0.3;">✨</div>' +
                '<div style="font-size:18px;color:var(--text-muted);font-family:var(--font-title);' +
                'letter-spacing:3px;margin-bottom:12px;">飞升未至</div>' +
                '<div style="font-size:13px;color:var(--text-secondary);line-height:1.8;">' +
                '修炼至渡劫巅峰，即可引动天劫飞升<br>' +
                '每次飞升：全属性 ×1.2，修炼速度 +50%<br><br>' +
                '当前境界：' + getRealmDisplayName(Game.data.realmIndex, Game.data.layer) + '<br>' +
                '最高境界：' + REALMS[REALMS.length - 1] + '·10层' +
                '</div>' +
                '</div>';
        }

        container.innerHTML = html;

        // 绑定渡劫按钮
        var self = this;
        var tribBtn = container.querySelector('#ascend-trib-btn');
        if (tribBtn) {
            tribBtn.addEventListener('click', function () {
                self.startAscension();
            });
            tribBtn.addEventListener('mouseenter', function () {
                this.style.background = 'linear-gradient(135deg,rgba(255,215,0,0.4),rgba(255,180,0,0.15))';
                this.style.boxShadow = '0 0 40px rgba(255,215,0,0.6)';
            });
            tribBtn.addEventListener('mouseleave', function () {
                this.style.background = 'linear-gradient(135deg,rgba(255,215,0,0.2),rgba(255,180,0,0.08))';
                this.style.boxShadow = '0 0 20px rgba(255,215,0,0.3)';
            });
        }
    }

};
