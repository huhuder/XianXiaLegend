/* ============================================================
   js/worldBoss.js — 世界BOSS系统（第5批）
   依赖 Game.data / utils.js / components.js
   ============================================================ */

var WORLD_BOSSES = [
    { name: '千年蛇妖', realmRequired: 2, respawnHours: 2,
      rewardStones: 500, rewardContribution: 50, killReward: { stones: 1000, contribution: 100 } },
    { name: '万年尸王', realmRequired: 3, respawnHours: 4,
      rewardStones: 1200, rewardContribution: 100, killReward: { stones: 2500, contribution: 200 } },
    { name: '远古魔龙', realmRequired: 4, respawnHours: 6,
      rewardStones: 3000, rewardContribution: 200, killReward: { stones: 6000, contribution: 400 } },
    { name: '九尾天狐', realmRequired: 5, respawnHours: 8,
      rewardStones: 8000, rewardContribution: 400, killReward: { stones: 16000, contribution: 800 } },
    { name: '混世魔尊', realmRequired: 6, respawnHours: 12,
      rewardStones: 20000, rewardContribution: 800, killReward: { stones: 40000, contribution: 1600 } },
    { name: '灭世龙皇', realmRequired: 7, respawnHours: 16,
      rewardStones: 50000, rewardContribution: 1600, killReward: { stones: 100000, contribution: 3200 } },
    { name: '天道化身', realmRequired: 8, respawnHours: 24,
      rewardStones: 120000, rewardContribution: 3200, killReward: { stones: 250000, contribution: 6400 } }
];

/**
 * 动态计算世界Boss属性（基于玩家有效属性）
 * @param {number} bossIndex — WORLD_BOSSES 索引
 * @returns {{ hp: number, atk: number, def: number }}
 */
function getBossStats(bossIndex) {
    var playerEff = Cultivation.getEffectiveStats();
    return {
        hp: Math.floor(playerEff.hp * 8.0),
        atk: Math.floor(playerEff.atk * 0.8),
        def: Math.floor(playerEff.def * 0.7)
    };
}

var BOSS_EXTRA_CHANCE_COSTS = [1000, 2000, 5000, 10000];

var WorldBoss = {

    /** 当前选中的Boss索引 */
    currentBossIndex: 0,

    /** 战斗状态 */
    inBattle: false,
    battleTimer: null,
    battleTick: 0,
    battleMaxTick: 30,
    battleBossHp: 0,
    battleBossMaxHp: 0,
    battlePlayerHp: 0,
    battlePlayerMaxHp: 0,
    battleTotalDamage: 0,
    battleBossIndex: -1,
    battleBoss: null,

    /* ----------------------------------------------------------
       初始化
       ---------------------------------------------------------- */
    init: function () {
        var self = this;

        // 初始化bossData
        if (!Game.data.bossData) Game.data.bossData = {};
        if (!Game.data.bossChallenges) Game.data.bossChallenges = 3;
        if (!Game.data.bossChallengeDate) Game.data.bossChallengeDate = '';
        if (!Game.data.bossExtraChances) Game.data.bossExtraChances = 0;

        this.checkDailyReset();
        this.checkBossRespawn();

        // 绑定Boss子Tab事件
        var subBtns = document.querySelectorAll('.sub-tab-btn');
        for (var i = 0; i < subBtns.length; i++) {
            (function (btn) {
                btn.addEventListener('click', function () {
                    var sub = this.getAttribute('data-sub');
                    if (sub === 'boss') {
                        self.checkDailyReset();
                        self.checkBossRespawn();
                        self.renderBossList();
                    }
                });
            })(subBtns[i]);
        }
    },

    /* ----------------------------------------------------------
       每日重置挑战次数
       ---------------------------------------------------------- */
    checkDailyReset: function () {
        var today = this._getTodayStr();
        if (Game.data.bossChallengeDate !== today) {
            Game.data.bossChallenges = 3;
            Game.data.bossExtraChances = 0;
            Game.data.bossChallengeDate = today;
            Game.saveGame();
        }
    },

    _getTodayStr: function () {
        var d = new Date();
        var month = (d.getMonth() + 1);
        var day = d.getDate();
        return d.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
    },

    /* ----------------------------------------------------------
       检查Boss刷新（基于respawnAt时间戳）
       ---------------------------------------------------------- */
    checkBossRespawn: function () {
        var now = Date.now();
        var changed = false;
        for (var i = 0; i < WORLD_BOSSES.length; i++) {
            var bd = Game.data.bossData[i];
            if (bd && !bd.alive && bd.respawnAt && now >= bd.respawnAt) {
                bd.alive = true;
                bd.hp = getBossStats(i).hp;
                bd.respawnAt = null;
                bd.topDamage = [];
                changed = true;
            }
        }
        if (changed) Game.saveGame();
    },

    /* ----------------------------------------------------------
       获取Boss数据（缺失则初始化）
       ---------------------------------------------------------- */
    _getBossData: function (bossIndex) {
        var boss = WORLD_BOSSES[bossIndex];
        if (!Game.data.bossData[bossIndex]) {
            Game.data.bossData[bossIndex] = {
                hp: getBossStats(bossIndex).hp,
                alive: true,
                respawnAt: null,
                topDamage: []
            };
        }
        return Game.data.bossData[bossIndex];
    },

    /* ----------------------------------------------------------
       渲染世界页面（独立Tab入口，懒加载调用）
       ---------------------------------------------------------- */
    renderWorldPage: function () {
        this.renderBossList();
    },

    /* ----------------------------------------------------------
       渲染Boss列表
       ---------------------------------------------------------- */
    renderBossList: function () {
        var container = document.getElementById('world-page-content');
        if (!container) return;

        this.checkBossRespawn();

        var playerRealm = Game.data.realmIndex;
        var now = Date.now();
        var html = '';

        html += '<div style="text-align:center;margin-bottom:16px;">' +
            '<h3 style="color:var(--gold-main);font-family:var(--font-title);letter-spacing:2px;font-size:16px;margin-bottom:4px;">世界BOSS</h3>' +
            '<p style="color:var(--text-muted);font-size:12px;">挑战剩余：<span style="color:#ffd700;font-weight:bold;">' + Game.data.bossChallenges + '</span> 次</p>' +
            '</div>';

        html += '<div class="boss-list-grid">';

        for (var i = 0; i < WORLD_BOSSES.length; i++) {
            var boss = WORLD_BOSSES[i];
            var bd = this._getBossData(i);
            var unlocked = playerRealm >= boss.realmRequired;
            var hpPct = bd.alive && bd.hp > 0 ? Math.max(0, Math.floor(bd.hp / getBossStats(i).hp * 100)) : 0;

            // 刷新倒计时
            var countdownHtml = '';
            if (!bd.alive && bd.respawnAt && now < bd.respawnAt) {
                var seconds = Math.ceil((bd.respawnAt - now) / 1000);
                var h = Math.floor(seconds / 3600);
                var m = Math.floor((seconds % 3600) / 60);
                var s = seconds % 60;
                countdownHtml = '<div class="boss-countdown">刷新 ' + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + '</div>';
            } else if (!bd.alive) {
                countdownHtml = '<div class="boss-countdown">已刷新</div>';
            }

            var statusClass = '';
            var statusText = '';
            if (bd.alive) {
                statusClass = 'alive';
                statusText = '存活';
            } else {
                statusClass = 'dead';
                statusText = '已击杀';
            }

            var lockClass = unlocked ? '' : ' locked';
            var realmName = REALMS[boss.realmRequired];

            html += '<div class="boss-card' + lockClass + '" data-boss="' + i + '">' +
                '<div class="boss-card-name">' + boss.name + '</div>' +
                '<div class="boss-card-realm">' + (unlocked ? '需 ' + realmName : '<span style="color:#e74c3c;">需 ' + realmName + '</span>') + '</div>' +
                '<div class="boss-card-status ' + statusClass + '">' + statusText + '</div>';

            if (bd.alive) {
                html += '<div class="boss-card-hp-bar">' +
                    '<div class="boss-card-hp-fill" style="width:' + hpPct + '%;"></div>' +
                    '</div>' +
                    '<div class="boss-card-hp-text">' + formatNumber(bd.hp) + ' / ' + formatNumber(getBossStats(i).hp) + '</div>';
            } else {
                html += '<div class="boss-card-hp-bar dead-bar"><div class="boss-card-hp-fill dead-fill" style="width:0%;"></div></div>';
                html += countdownHtml;
            }

            if (!unlocked) {
                html += '<div class="boss-card-lock-overlay">未解锁</div>';
            }

            html += '</div>';
        }

        html += '</div>';

        // 额外次数按钮
        html += '<div style="text-align:center;margin-top:12px;">' +
            '<button class="boss-extra-btn" id="boss-extra-btn">购买挑战次数（' + formatNumber(BOSS_EXTRA_CHANCE_COSTS[Math.min(Game.data.bossExtraChances, BOSS_EXTRA_CHANCE_COSTS.length - 1)]) + ' 灵石）</button>' +
            '</div>';

        container.innerHTML = html;

        // 绑定点击事件
        var self = this;
        setTimeout(function () {
            var cards = container.querySelectorAll('.boss-card:not(.locked):not(.boss-card-lock-overlay)');
            for (var j = 0; j < cards.length; j++) {
                cards[j].addEventListener('click', function () {
                    var idx = parseInt(this.getAttribute('data-boss'));
                    self.renderBossDetail(idx);
                });
            }

            var extraBtn = document.getElementById('boss-extra-btn');
            if (extraBtn) {
                extraBtn.addEventListener('click', function () {
                    self.buyExtraChance();
                });
            }

            // 倒计时自动刷新
            self._startCountdownRefresh(container);
        }, 0);
    },

    /* ----------------------------------------------------------
       倒计时自动刷新（每秒更新）
       ---------------------------------------------------------- */
    _startCountdownRefresh: function (container) {
        var self = this;
        if (self._countdownInterval) clearInterval(self._countdownInterval);
        self._countdownInterval = setInterval(function () {
            var countdownEls = container.querySelectorAll('.boss-countdown');
            if (countdownEls.length === 0) {
                clearInterval(self._countdownInterval);
                return;
            }
            var now = Date.now();
            var needsRefresh = false;
            for (var i = 0; i < WORLD_BOSSES.length; i++) {
                var bd = Game.data.bossData[i];
                if (bd && !bd.alive && bd.respawnAt) {
                    if (now >= bd.respawnAt) {
                        needsRefresh = true;
                        break;
                    }
                    var seconds = Math.ceil((bd.respawnAt - now) / 1000);
                    var h = Math.floor(seconds / 3600);
                    var m = Math.floor((seconds % 3600) / 60);
                    var s = seconds % 60;
                    var cardEls = container.querySelectorAll('.boss-card');
                    if (cardEls[i]) {
                        var cdEl = cardEls[i].querySelector('.boss-countdown');
                        if (cdEl) cdEl.textContent = '刷新 ' + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
                    }
                }
            }
            if (needsRefresh) {
                self.checkBossRespawn();
                self.renderBossList();
            }
        }, 1000);
    },

    /* ----------------------------------------------------------
       渲染单个Boss详情
       ---------------------------------------------------------- */
    renderBossDetail: function (bossIndex) {
        var container = document.getElementById('world-page-content');
        if (!container) return;

        var boss = WORLD_BOSSES[bossIndex];
        var bd = this._getBossData(bossIndex);
        this.currentBossIndex = bossIndex;

        var bossStats = getBossStats(bossIndex);

        var hpPct = bd.alive ? Math.max(0, Math.floor(bd.hp / bossStats.hp * 100)) : 0;
        var now = Date.now();

        var html = '';

        // 返回按钮
        html += '<button class="boss-back-btn" id="boss-back-btn">← 返回列表</button>';

        // Boss详情卡片
        html += '<div class="boss-detail-card">' +
            '<div class="boss-detail-name">' + boss.name + '</div>' +
            '<div class="boss-detail-realm">需境界：' + REALMS[boss.realmRequired] + '</div>';

        // 属性
        html += '<div class="boss-detail-stats">' +
            '<span>ATK ' + formatNumber(bossStats.atk) + '</span>' +
            '<span>DEF ' + formatNumber(bossStats.def) + '</span>' +
            '<span>HP ' + formatNumber(bossStats.hp) + '</span>' +
            '</div>';

        // 大血量条
        if (bd.alive) {
            html += '<div class="boss-hp-section">' +
                '<div class="boss-hp-label">' + formatNumber(bd.hp) + ' / ' + formatNumber(bossStats.hp) + '</div>' +
                '<div class="boss-hp-bar">' +
                '<div class="boss-hp-fill" style="width:' + hpPct + '%;"></div>' +
                '</div>' +
                '</div>';
        } else {
            var cdText = '';
            if (bd.respawnAt && now < bd.respawnAt) {
                var seconds = Math.ceil((bd.respawnAt - now) / 1000);
                var h = Math.floor(seconds / 3600);
                var m = Math.floor((seconds % 3600) / 60);
                var s = seconds % 60;
                cdText = h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
            }
            html += '<div class="boss-hp-section dead-section">' +
                '<div class="boss-detail-dead">已击杀</div>';
            if (cdText) {
                html += '<div class="boss-detail-countdown" id="boss-detail-countdown">下次刷新：' + cdText + '</div>';
            }
            html += '</div>';
        }

        // 奖励预览
        html += '<div class="boss-reward-preview">' +
            '<span>参与奖：灵石 ' + formatNumber(boss.rewardStones) + ' + 贡献 ' + boss.rewardContribution + '</span>' +
            '<span>击杀奖：灵石 ' + formatNumber(boss.killReward.stones) + ' + 贡献 ' + boss.killReward.contribution + '</span>' +
            '</div>';

        // 挑战按钮
        if (bd.alive && Game.data.bossChallenges > 0 && !this.inBattle) {
            html += '<button class="boss-challenge-btn" id="boss-challenge-btn">挑战（剩余 ' + Game.data.bossChallenges + ' 次）</button>';
        } else if (bd.alive && this.inBattle) {
            html += '<button class="boss-challenge-btn" disabled>战斗中...</button>';
        } else if (bd.alive && Game.data.bossChallenges <= 0) {
            html += '<button class="boss-challenge-btn" disabled>挑战次数不足</button>';
        } else if (!bd.alive) {
            html += '<button class="boss-challenge-btn" disabled>Boss已击杀</button>';
        }

        html += '</div>'; // .boss-detail-card

        // 排行榜
        html += '<div class="boss-leaderboard">' +
            '<div class="boss-leaderboard-title">伤害排行榜</div>';

        if (bd.topDamage && bd.topDamage.length > 0) {
            html += '<div class="boss-leaderboard-list">';
            for (var j = 0; j < bd.topDamage.length; j++) {
                var entry = bd.topDamage[j];
                var rankClass = '';
                var rankIcon = '';
                if (j === 0) { rankClass = ' rank-gold'; rankIcon = '🥇 '; }
                else if (j === 1) { rankClass = ' rank-silver'; rankIcon = '🥈 '; }
                else if (j === 2) { rankClass = ' rank-bronze'; rankIcon = '🥉 '; }

                html += '<div class="boss-rank-row' + rankClass + '">' +
                    '<span class="boss-rank-num">' + rankIcon + (j + 1) + '</span>' +
                    '<span class="boss-rank-name">' + entry.name + '</span>' +
                    '<span class="boss-rank-dmg">' + formatNumber(entry.damage) + '</span>' +
                    '</div>';
            }
            html += '</div>';
        } else {
            html += '<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:12px;">暂无记录</p>';
        }

        html += '</div>';

        container.innerHTML = html;

        // 绑定事件
        var self = this;
        setTimeout(function () {
            var backBtn = document.getElementById('boss-back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', function () {
                    self.renderBossList();
                });
            }

            var challengeBtn = document.getElementById('boss-challenge-btn');
            if (challengeBtn && !challengeBtn.disabled) {
                challengeBtn.addEventListener('click', function () {
                    self.startChallenge(bossIndex);
                });
            }

            // 详情页倒计时
            var cdEl = document.getElementById('boss-detail-countdown');
            if (cdEl) {
                self._startDetailCountdown(bossIndex, cdEl, container);
            }
        }, 0);
    },

    _startDetailCountdown: function (bossIndex, cdEl, container) {
        var self = this;
        var intervalId = setInterval(function () {
            var bd = Game.data.bossData[bossIndex];
            if (!bd || bd.alive) {
                clearInterval(intervalId);
                self.renderBossDetail(bossIndex);
                return;
            }
            var now = Date.now();
            if (!bd.respawnAt || now >= bd.respawnAt) {
                clearInterval(intervalId);
                self.checkBossRespawn();
                self.renderBossDetail(bossIndex);
                return;
            }
            var seconds = Math.ceil((bd.respawnAt - now) / 1000);
            var h = Math.floor(seconds / 3600);
            var m = Math.floor((seconds % 3600) / 60);
            var s = seconds % 60;
            cdEl.textContent = '下次刷新：' + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        }, 1000);
    },

    /* ----------------------------------------------------------
       开始挑战
       ---------------------------------------------------------- */
    startChallenge: function (bossIndex) {
        if (this.inBattle) return;
        if (Game.data.bossChallenges <= 0) {
            showToast('今日挑战次数已用完！', 2000);
            return;
        }

        var boss = WORLD_BOSSES[bossIndex];
        var bd = this._getBossData(bossIndex);

        if (!bd.alive) {
            showToast('Boss已被击杀，等待刷新...', 2000);
            return;
        }

        // 扣除次数
        Game.data.bossChallenges--;
        Game.saveGame();

        this.inBattle = true;
        this.battleTick = 0;
        this.battleBossIndex = bossIndex;
        this.battleBoss = boss;
        this.battleBossMaxHp = getBossStats(bossIndex).hp;
        this.battleBossHp = bd.hp;
        this.battleTotalDamage = 0;

        // 玩家战斗HP（含宗门Buff + 天赋 + 套装加成）
        var sectBonus = typeof Sect !== 'undefined' ? Sect.getSectBonus() : { hpPct: 0, atkPct: 0, defPct: 0 };
        var activeBuffs = typeof Sect !== 'undefined' ? Sect.getActiveBuffs() : { hpPct: 0, atkPct: 0, defPct: 0 };
        var talentEff = typeof Talents !== 'undefined' ? Talents.getEffects() : { hpPct: 0, atkPct: 0, defPct: 0 };
        var totalHpPct = sectBonus.hpPct + activeBuffs.hpPct + talentEff.hpPct;
        // 套装hpPct加成
        if (typeof Equipment !== 'undefined') {
            var setBonuses = Equipment.getActiveSetBonuses();
            for (var _si = 0; _si < setBonuses.length; _si++) {
                if (setBonuses[_si].effects.hpPct) totalHpPct += setBonuses[_si].effects.hpPct;
            }
        }
        var hpMult = 1 + totalHpPct / 100;
        this.battlePlayerHp = Math.floor(Game.data.hp * hpMult);
        this.battlePlayerMaxHp = this.battlePlayerHp;

        // 更新UI为战斗状态
        this._renderBattleUI(bossIndex);

        // 启动战斗模拟
        var self = this;
        this.battleTimer = setInterval(function () {
            self._battleTick();
        }, 1000);
    },

    /* ----------------------------------------------------------
       战斗UI
       ---------------------------------------------------------- */
    _renderBattleUI: function (bossIndex) {
        var container = document.getElementById('world-page-content');
        if (!container) return;

        var boss = this.battleBoss;

        var html = '<div class="boss-battle-container">' +
            '<div class="boss-battle-header">' + boss.name + '</div>';

        // Boss血量条
        var hpPct = Math.max(0, Math.floor(this.battleBossHp / this.battleBossMaxHp * 100));
        html += '<div class="boss-battle-section">' +
            '<div class="boss-battle-label">' + boss.name + '</div>' +
            '<div class="boss-battle-hp-bar">' +
            '<div class="boss-battle-hp-fill" id="battle-boss-hp-fill" style="width:' + hpPct + '%;"></div>' +
            '</div>' +
            '<div class="boss-battle-hp-text" id="battle-boss-hp-text">' + formatNumber(this.battleBossHp) + ' / ' + formatNumber(this.battleBossMaxHp) + '</div>' +
            '</div>';

        // 玩家血量条
        var playerHpPct = Math.max(0, Math.floor(this.battlePlayerHp / Math.max(1, Game.data.hp) * 100));
        html += '<div class="boss-battle-section player-section">' +
            '<div class="boss-battle-label">' + Game.data.playerName + '</div>' +
            '<div class="boss-battle-hp-bar player-bar">' +
            '<div class="boss-battle-hp-fill player-fill" id="battle-player-hp-fill" style="width:' + playerHpPct + '%;"></div>' +
            '</div>' +
            '<div class="boss-battle-hp-text" id="battle-player-hp-text">' + formatNumber(this.battlePlayerHp) + ' / ' + formatNumber(Game.data.hp) + '</div>' +
            '</div>';

        // 计时器和伤害
        html += '<div class="boss-battle-timer" id="battle-timer">剩余 30 秒</div>' +
            '<div class="boss-battle-total-dmg" id="battle-total-dmg">总伤害：0</div>';

        // 伤害飘字区
        html += '<div class="boss-battle-log" id="battle-log-area"></div>';

        // 退出按钮
        html += '<button class="boss-battle-quit-btn" id="battle-quit-btn">退出战斗</button>';

        html += '</div>';

        container.innerHTML = html;

        var self = this;
        setTimeout(function () {
            var quitBtn = document.getElementById('battle-quit-btn');
            if (quitBtn) {
                quitBtn.addEventListener('click', function () {
                    self._quitBattle();
                });
            }
        }, 0);
    },

    /* ----------------------------------------------------------
       每tick战斗逻辑
       ---------------------------------------------------------- */
    _battleTick: function () {
        this.battleTick++;

        var boss = this.battleBoss;
        var d = Game.data;

        // 计算玩家属性（含宗门Buff + activeBuffs + 天赋 + 套装 + 技能Buff）
        var sectBonus = typeof Sect !== 'undefined' ? Sect.getSectBonus() : { atkPct: 0, defPct: 0 };
        var activeBuffs = typeof Sect !== 'undefined' ? Sect.getActiveBuffs() : { atkPct: 0, defPct: 0 };
        var talentEff = typeof Talents !== 'undefined' ? Talents.getEffects() : { atkPct: 0, defPct: 0, critRate: 0 };
        var skillAtkBuff = (typeof Skills !== 'undefined') ? Skills.getBuffValue('buff_atk') : 0;
        var skillAllBuff = (typeof Skills !== 'undefined') ? Skills.getBuffValue('buff_all') : 0;
        var totalAtkPct = sectBonus.atkPct + activeBuffs.atkPct + talentEff.atkPct + skillAtkBuff + skillAllBuff;
        var totalDefPct = sectBonus.defPct + activeBuffs.defPct + talentEff.defPct + skillAllBuff;

        // 套装加成
        if (typeof Equipment !== 'undefined') {
            var setBonuses = Equipment.getActiveSetBonuses();
            for (var si = 0; si < setBonuses.length; si++) {
                var se = setBonuses[si].effects;
                if (se.atkPct) totalAtkPct += se.atkPct;
                if (se.defPct) totalDefPct += se.defPct;
            }
        }

        var atkMult = 1 + totalAtkPct / 100;
        var defMult = 1 + totalDefPct / 100;

        var playerAtk = Math.floor(d.attack * atkMult);
        var playerDef = Math.floor(d.defense * defMult);

        // 灵兽出战加成（11-4批）
        if (typeof Beast !== 'undefined' && Beast.getActiveBeastBonus) {
            var beastBonus = Beast.getActiveBeastBonus();
            playerAtk += beastBonus.atk;
            playerDef += beastBonus.def;
        }

        // 动态暴击率：基础 + 装备效果 + 套装 + 天赋
        var totalCritRate = (d.critRate || 0);
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

        // 玩家伤害：max(1, 玩家ATK * (0.8~1.2随机) - BossDEF * 0.3)，暴击1.5倍
        var playerRaw = playerAtk * (0.8 + Math.random() * 0.4);
        var isCrit = Math.random() < totalCritRate;
        var bossStatsTick = getBossStats(this.battleBossIndex);
        var playerDmg = Math.max(1, Math.floor(playerRaw - bossStatsTick.def * 0.3));
        if (isCrit) playerDmg = Math.floor(playerDmg * 1.5);

        // Boss伤害：max(1, BossATK * (0.8~1.2随机) - 玩家DEF * 0.4)
        var bossRaw = bossStatsTick.atk * (0.8 + Math.random() * 0.4);
        var bossDmg = Math.max(1, Math.floor(bossRaw - playerDef * 0.4));

        // 技能护盾吸收
        if (Game.data.skillShield && Game.data.skillShield > 0) {
            var absorbed = Math.min(Game.data.skillShield, bossDmg);
            Game.data.skillShield -= absorbed;
            bossDmg -= absorbed;
        }

        // 应用伤害
        this.battleBossHp = Math.max(0, this.battleBossHp - playerDmg);
        this.battleTotalDamage += playerDmg;

        this.battlePlayerHp = Math.max(0, this.battlePlayerHp - bossDmg);

        // 更新UI
        var bossHpPct = Math.max(0, Math.floor(this.battleBossHp / this.battleBossMaxHp * 100));
        var playerHpPct = Math.max(0, Math.floor(this.battlePlayerHp / Math.max(1, this.battlePlayerMaxHp) * 100));

        var bossFill = document.getElementById('battle-boss-hp-fill');
        var bossText = document.getElementById('battle-boss-hp-text');
        var playerFill = document.getElementById('battle-player-hp-fill');
        var playerText = document.getElementById('battle-player-hp-text');
        var timerEl = document.getElementById('battle-timer');
        var totalDmgEl = document.getElementById('battle-total-dmg');

        if (bossFill) bossFill.style.width = bossHpPct + '%';
        if (bossText) bossText.textContent = formatNumber(this.battleBossHp) + ' / ' + formatNumber(this.battleBossMaxHp);
        if (playerFill) playerFill.style.width = playerHpPct + '%';
        if (playerText) playerText.textContent = formatNumber(this.battlePlayerHp) + ' / ' + formatNumber(this.battlePlayerMaxHp);
        if (timerEl) timerEl.textContent = '剩余 ' + (this.battleMaxTick - this.battleTick) + ' 秒';
        if (totalDmgEl) totalDmgEl.textContent = '总伤害：' + formatNumber(this.battleTotalDamage);

        // 伤害飘字
        var logArea = document.getElementById('battle-log-area');
        if (logArea) {
            var logLine = document.createElement('div');
            logLine.className = 'boss-battle-log-line';
            logLine.innerHTML = '<span class="boss-dmg-player">你对Boss造成 <b>' + formatNumber(playerDmg) + '</b> 伤害</span>' +
                ' <span class="boss-dmg-boss">Boss对你造成 <b>' + formatNumber(bossDmg) + '</b> 伤害</span>';
            logArea.appendChild(logLine);
            logArea.scrollTop = logArea.scrollHeight;
            // 限制日志行数
            while (logArea.children.length > 20) {
                logArea.removeChild(logArea.firstChild);
            }
        }

        // 判断结束条件
        if (this.battlePlayerHp <= 0) {
            // 玩家死亡
            this._endBattle(false);
            return;
        }

        if (this.battleBossHp <= 0) {
            // Boss击杀
            this._endBattle(true);
            return;
        }

        if (this.battleTick >= this.battleMaxTick) {
            // 时间到
            this._endBattle(false);
            return;
        }
    },

    /* ----------------------------------------------------------
       退出战斗
       ---------------------------------------------------------- */
    _quitBattle: function () {
        if (!this.inBattle) return;
        if (confirm('确定要退出战斗吗？挑战次数不会退还。')) {
            this._endBattle(false);
        }
    },

    /* ----------------------------------------------------------
       战斗结束结算
       ---------------------------------------------------------- */
    _endBattle: function (killed) {
        if (this.battleTimer) {
            clearInterval(this.battleTimer);
            this.battleTimer = null;
        }
        this.inBattle = false;

        var bossIndex = this.battleBossIndex;
        var boss = this.battleBoss;
        var bd = this._getBossData(bossIndex);

        var totalDamage = this.battleTotalDamage;

        // 更新Boss数据
        if (killed) {
            bd.alive = false;
            bd.hp = 0;
            bd.respawnAt = Date.now() + boss.respawnHours * 3600000;
        } else {
            bd.hp = this.battleBossHp;
        }

        // 更新排行榜（去重：同一玩家只保留最高伤害记录）
        if (!bd.topDamage) bd.topDamage = [];
        var existingIdx = -1;
        for (var ei = 0; ei < bd.topDamage.length; ei++) {
            if (bd.topDamage[ei].name === Game.data.playerName) {
                if (totalDamage > bd.topDamage[ei].damage) {
                    bd.topDamage[ei].damage = totalDamage;
                    bd.topDamage[ei].timestamp = Date.now();
                }
                existingIdx = ei;
                break;
            }
        }
        if (existingIdx < 0) {
            bd.topDamage.push({
                name: Game.data.playerName,
                damage: totalDamage,
                timestamp: Date.now()
            });
        }
        // 排序取前10
        bd.topDamage.sort(function (a, b) { return b.damage - a.damage; });
        if (bd.topDamage.length > 10) bd.topDamage = bd.topDamage.slice(0, 10);

        Game.saveGame();

        // 奖励结算
        var stonesReward = boss.rewardStones;
        var contribReward = boss.rewardContribution;

        if (killed) {
            stonesReward = boss.killReward.stones;
            contribReward = boss.killReward.contribution;
            Game.data.spiritStones += stonesReward;
            Game.data.sectContribution += contribReward;
            if (Game.dom && Game.dom.spiritStonesDisplay) {
                Game.dom.spiritStonesDisplay.textContent = formatNumber(Game.data.spiritStones);
            }
            // 宗门任务联动
            if (typeof Sect !== 'undefined') {
                Sect.updateTaskProgress('kill', 1);
            }
        } else {
            // 参与奖（按总伤害比例折算，但至少给基础奖励）
            Game.data.spiritStones += stonesReward;
            Game.data.sectContribution += contribReward;
            if (Game.dom && Game.dom.spiritStonesDisplay) {
                Game.dom.spiritStonesDisplay.textContent = formatNumber(Game.data.spiritStones);
            }
        }

        Game.updatePower();

        // 渲染结算界面
        this._renderResult(bossIndex, killed, totalDamage, stonesReward, contribReward);
    },

    /* ----------------------------------------------------------
       渲染结算界面
       ---------------------------------------------------------- */
    _renderResult: function (bossIndex, killed, totalDamage, stones, contrib) {
        var container = document.getElementById('world-page-content');
        if (!container) return;

        var boss = WORLD_BOSSES[bossIndex];

        var html = '<div class="boss-result-card">' +
            '<div class="boss-result-header ' + (killed ? 'victory' : 'defeat') + '">' +
            (killed ? '击杀成功！' : '挑战结束') +
            '</div>' +
            '<div class="boss-result-boss-name">' + boss.name + '</div>' +
            '<div class="boss-result-damage">总伤害：<span>' + formatNumber(totalDamage) + '</span></div>' +
            '<div class="boss-result-rewards">' +
            '<div class="boss-result-reward-item">灵石 +' + formatNumber(stones) + '</div>' +
            '<div class="boss-result-reward-item">贡献 +' + formatNumber(contrib) + '</div>' +
            '</div>' +
            '<button class="boss-back-btn" id="result-back-btn">返回</button>' +
            '</div>';

        container.innerHTML = html;

        var self = this;
        setTimeout(function () {
            var btn = document.getElementById('result-back-btn');
            if (btn) {
                btn.addEventListener('click', function () {
                    self.renderBossDetail(bossIndex);
                });
            }
        }, 0);
    },

    /* ----------------------------------------------------------
       购买额外挑战次数
       ---------------------------------------------------------- */
    buyExtraChance: function () {
        var costs = BOSS_EXTRA_CHANCE_COSTS;
        var idx = Math.min(Game.data.bossExtraChances, costs.length - 1);
        var cost = costs[idx];

        if (Game.data.spiritStones < cost) {
            showToast('灵石不足！需要 ' + formatNumber(cost) + ' 灵石', 2000);
            return;
        }

        if (Game.data.bossExtraChances >= costs.length) {
            showToast('今日额外次数已买满！', 2000);
            return;
        }

        if (!confirm('确定花费 ' + formatNumber(cost) + ' 灵石购买 1 次挑战次数？')) return;

        Game.data.spiritStones -= cost;
        Game.data.bossChallenges++;
        Game.data.bossExtraChances++;
        if (Game.dom && Game.dom.spiritStonesDisplay) {
            Game.dom.spiritStonesDisplay.textContent = formatNumber(Game.data.spiritStones);
        }
        Game.saveGame();
        showToast('购买成功！挑战次数+1', 2000);
        this.renderBossList();
    },

};