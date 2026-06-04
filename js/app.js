/* ============================================================
   js/app.js — 主应用
   Game 对象：全局状态管理、Tab切换、存档/读档、游戏循环、初始化
   依赖 utils.js / components.js / cultivation.js
   ============================================================ */

var Game = {

    /* ----------------------------------------------------------
       常量（存档 Key 与定时器间隔）
       ---------------------------------------------------------- */
    SAVE_KEY: 'xianxia_legend_save',
    AUTO_SAVE_INTERVAL: 30000,   // 30秒自动存档
    AUTO_CULTIVATE_INTERVAL: 2000, // 2秒自动修炼

    /* ----------------------------------------------------------
       数据模型（初始默认值）
       ---------------------------------------------------------- */
    defaultData: {
        playerName: '无名修士',
        realmIndex: 0,          // 境界索引 0~9
        layer: 0,               // 当前层数 0~9（显示为 1~10 层）
        experience: 0,          // 当前经验
        spiritStones: 0,        // 灵石
        totalCultivations: 0,   // 累计修炼次数
        hp: 100,                // 生命
        maxHp: 100,             // 生命上限
        attack: 20,             // 攻击
        defense: 10,            // 防御
        critRate: 0.05,         // 暴击率
        battleUnlocked: (function () {
            var len = (typeof Battle !== 'undefined' && Battle.ZONES) ? Battle.ZONES.length : 10;
            return [true].concat(Array(len - 1).fill(false));
        })(), // 已解锁地图（动态匹配ZONES长度）
        inventory: [],          // 背包装备
        equipped: [null, null, null, null, null, null], // 已装备（6槽位）
        sectIndex: -1,           // 宗门索引（-1未加入，0~3四宗门）
        sectContribution: 0,     // 宗门贡献值
        sectTasks: [],           // 宗门每日任务 [{ taskIndex, progress, completed, claimed }]
        sectTaskDate: '',        // 宗门任务日期 'YYYY-MM-DD'
        activeBuffs: [],         // 宗门商店Buff [{ buffType, buffValue, expireAt }]
        enhanceRateBuff: 0,      // 当前强化成功率加成
        bossChallenges: 3,        // 今日剩余BOSS挑战次数
        bossChallengeDate: '',    // BOSS挑战日期 'YYYY-MM-DD'
        bossData: {},             // 各Boss状态 { bossIndex: { hp, alive, respawnAt, topDamage } }
        bossExtraChances: 0,      // 已购买的额外挑战次数（每日重置）
        ascensionCount: 0,        // 飞升次数
        ascensionFailed: false,   // 上次天劫是否失败
        talentPoints: 0,          // 可用天赋点
        talents: {                // 天赋等级 sword/body/qi 各0~10
            sword: 0,
            body: 0,
            qi: 0
        },
        // 技能系统（第8批新增）
        equippedSkills: [],       // 已装备技能ID列表 [skillId, ...]
        skillCooldowns: {},       // 技能冷却 { skillId: remainingTicks }
        skillBuffs: [],           // 技能Buff [{ type, value, remaining }]
        skillShield: 0,           // 当前护盾值
        skillSlots: 2,            // 技能槽数量（飞升+1）
        // 秘境系统（第10批新增）
        mysticRealmTokens: 5,           // 秘境令数量
        mysticRealmExtraBought: 0,      // 已购买的额外秘境令
        mysticRealmLastRefreshDate: '', // 秘境每日刷新日期
        mysticRealmClearedRealms: [],   // 今日已通关的秘境ID列表
        capturedBeasts: [],          // 已捕捉灵兽
        activeBeastIdx: -1,          // 出战灵兽索引
        beastFood: 0,               // 灵兽口粮
    },

    /** 运行时游戏数据（初始化为默认值） */
    data: null,

    /** DOM 引用缓存 */
    dom: {},

    /** 定时器引用 */
    timers: {
        autoCultivate: null,
        autoSave: null,
    },

    /* ----------------------------------------------------------
       初始化
       ---------------------------------------------------------- */

    init: function () {
        var self = this;

        // 初始化数据
        this.data = deepClone(this.defaultData);

        // 缓存 DOM 引用
        this.cacheDOM();

        // 加载存档
        var hasSave = this.loadGame();
        if (!hasSave) {
            console.log('[仙侠传奇] 新档初始化，欢迎踏入修仙之路！');
        }

        // 初始化详细属性面板事件
        Cultivation.initDetailStats();

        // 更新全部UI
        Cultivation.updateAllUI();
        this.updatePower();

        // 绑定事件
        this.bindEvents();

        // 启动游戏循环
        this.startGameLoop();

        // 初始化装备子Tab事件（角色Tab需要）
        Equipment.init();
        this._equipInit = true;

        // 宗门、世界BOSS、飞升改为懒加载（首次切到对应Tab时初始化）

        // 页面可见性变化时调整定时器
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                self.stopGameLoop();
            } else {
                self.startGameLoop();
            }
        });

        console.log('[仙侠传奇] 修仙世界已就绪 | 境界：' + Cultivation.getRealmDisplayName() +
                    ' | 战力：' + formatNumber(this.calcPower()) +
                    ' | 灵石：' + formatNumber(this.data.spiritStones));
    },

    /** 缓存所有 DOM 引用 */
    cacheDOM: function () {
        var $ = function (id) { return document.getElementById(id); };

        this.dom = {
            spiritStonesDisplay: $('spirit-stones-display'),
            playerName: $('player-name'),
            realmTitle: $('realm-title'),
            powerValue: $('power-value'),
            realmProgressFill: $('realm-progress-fill'),
            realmProgressText: $('realm-progress-text'),
            cultivateBtn: $('cultivate-btn'),
            cultivateBtnLabel: $('cultivate-btn').querySelector('.btn-label'),
            totalCults: $('total-cults'),
            statLevel: $('stat-level'),
            statHp: $('stat-hp'),
            statAtk: $('stat-atk'),
            statDef: $('stat-def'),
            statCrit: $('stat-crit'),
            hpBar: $('hp-bar'),
            atkBar: $('atk-bar'),
            defBar: $('def-bar'),
            expBarInner: $('exp-bar-inner'),
            expText: $('exp-text'),
            cultivationArea: $('cultivation-area'),
            goldenFlash: $('golden-flash'),
            floatTextContainer: $('float-text-container'),
        };
    },

    /* ----------------------------------------------------------
       事件绑定
       ---------------------------------------------------------- */

    bindEvents: function () {
        // 修炼/突破按钮（根据当前状态决定行为）
        this.dom.cultivateBtn.addEventListener('click', function () {
            if (Cultivation.isMaxRealm() && Cultivation.isExpFull()) {
                Ascension.startAscension();
                return;
            }
            if (Cultivation.isMaxRealm()) return;
            if (Cultivation.isExpFull()) {
                Cultivation.breakthrough();
            } else {
                Cultivation.cultivate(false);
            }
        });

        // 角色名点击修改
        this.dom.playerName.addEventListener('click', function () {
            Game.editPlayerName();
        });

        // 底部导航Tab切换
        var navItems = document.querySelectorAll('.nav-item');
        for (var i = 0; i < navItems.length; i++) {
            navItems[i].addEventListener('click', function () {
                var tabName = this.getAttribute('data-tab');
                Game.switchTab(tabName);
            });
        }
    },

    /* ----------------------------------------------------------
       Tab 切换
       ---------------------------------------------------------- */

    switchTab: function (tabName) {
        // 隐藏所有Tab页
        var pages = document.querySelectorAll('.tab-page');
        for (var i = 0; i < pages.length; i++) {
            pages[i].classList.remove('active');
        }
        // 取消所有导航高亮
        var navs = document.querySelectorAll('.nav-item');
        for (var j = 0; j < navs.length; j++) {
            navs[j].classList.remove('active');
        }

        // 显示目标Tab
        var targetPage = document.getElementById('tab-' + tabName);
        if (targetPage) targetPage.classList.add('active');

        // 高亮目标导航
        var targetNav = document.querySelector('.nav-item[data-tab="' + tabName + '"]');
        if (targetNav) targetNav.classList.add('active');

        // 战斗Tab：开始挂机或停止
        if (tabName === 'battle') {
            Battle.startAFK();
        } else if (this.currentTab === 'battle') {
            Battle.stopAFK();
        }

        // 角色Tab：初始化装备子Tab（仅首次）
        if (tabName === 'character' && !this._equipInit) {
            Equipment.init();
            this._equipInit = true;
        }

        // 角色Tab：渲染天赋子页面
        if (tabName === 'character' && typeof Talents !== 'undefined') {
            Talents.render();
        }

        // 宗门Tab：懒加载
        if (tabName === 'sect') {
            if (!this._sectInit) {
                Sect.init();
                this._initSectSubTabs();
                this._sectInit = true;
            }
            Sect.renderSectPage();
        }

        // 世界Tab：懒加载
        if (tabName === 'world') {
            if (!this._worldInit) {
                WorldBoss.init();
                MysticRealm.init();
                this._initWorldSubTabs();
                this._worldInit = true;
            }
            WorldBoss.renderWorldPage();
        }

        // 飞升Tab：懒加载
        if (tabName === 'ascend') {
            if (!this._ascendInit) {
                Ascension.init();
                this._ascendInit = true;
            }
            Ascension.renderAscensionPage();
        }

        // 记录当前Tab
        this.currentTab = tabName;
    },

    /* ----------------------------------------------------------
       角色名修改
       ---------------------------------------------------------- */

    editPlayerName: function () {
        var newName = prompt('请输入新的道号：', this.data.playerName);
        if (newName !== null && newName.trim() !== '') {
            this.data.playerName = newName.trim().substring(0, 12);
            Cultivation.updateAvatarSection();
            this.saveGame();
        }
    },

    /* ----------------------------------------------------------
       经验与灵石（战斗奖励入口）
       ---------------------------------------------------------- */

    addExperience: function (exp) {
        this.data.experience += exp;
        Cultivation.updateExpBar();
        Cultivation.updateAllUI();
    },

    addSpirit: function (stones) {
        this.data.spiritStones += stones;
        if (this.dom.spiritStonesDisplay) {
            this.dom.spiritStonesDisplay.textContent = formatNumber(this.data.spiritStones);
        }
        // 宗门任务进度联动 — 灵石
        if (typeof Sect !== 'undefined') {
            Sect.updateTaskProgress('stones', stones);
        }
    },

    /* ----------------------------------------------------------
       战力计算（含装备特殊效果和套装加成）
       ---------------------------------------------------------- */

    calcPower: function () {
        var d = this.data;

        // 基础属性战力
        var power = d.attack * 2.5 + d.defense * 1.8 + d.hp * 0.5;

        // 使用统一聚合函数获取装备+套装效果
        var eff = Equipment.getTotalEquipEffects();

        var totalCritRate = (d.critRate || 0.05) * 100 + eff.critRate;
        var totalDodgeRate = eff.dodgeRate;
        var totalLifesteal = eff.lifesteal;

        power += totalCritRate * 30 + totalDodgeRate * 20 + totalLifesteal * 15;

        // 飞升加成
        power *= Ascension.getAscensionMultiplier();

        return Math.floor(power);
    },

    /** 更新战力显示 */
    updatePower: function () {
        if (this.dom.powerValue) {
            this.dom.powerValue.textContent = formatNumber(this.calcPower());
        }
    },

    /* ----------------------------------------------------------
       存档系统
       ---------------------------------------------------------- */

    saveGame: function () {
        try {
            var saveData = JSON.stringify(this.data);
            localStorage.setItem(this.SAVE_KEY, saveData);
        } catch (e) {
            console.warn('[仙侠传奇] 存档失败:', e.message);
        }
    },

    loadGame: function () {
        try {
            var raw = localStorage.getItem(this.SAVE_KEY);
            if (!raw) return false;
            var saved = JSON.parse(raw);

            // 数据校验与合并（防止存档字段缺失）
            this.data = Object.assign({}, this.defaultData, saved);

            // 数值合理性校验
            if (this.data.realmIndex < 0 || this.data.realmIndex >= REALMS.length) {
                this.data.realmIndex = 0;
            }
            if (this.data.layer < 0 || this.data.layer > 9) {
                this.data.layer = 0;
            }
            if (this.data.experience < 0) this.data.experience = 0;
            if (this.data.spiritStones < 0) this.data.spiritStones = 0;
            if (this.data.hp < 1) this.data.hp = 1;
            if (this.data.attack < 1) this.data.attack = 1;
            if (this.data.defense < 1) this.data.defense = 1;

            // 战斗系统兼容（第1批新增）
            var zonesLen = (typeof Battle !== 'undefined' && Battle.ZONES) ? Battle.ZONES.length : 10;
            if (!this.data.battleUnlocked || !Array.isArray(this.data.battleUnlocked)) {
                this.data.battleUnlocked = [true].concat(Array(zonesLen - 1).fill(false));
            } else {
                // 兼容旧档：补齐到ZONES长度
                while (this.data.battleUnlocked.length < zonesLen) {
                    this.data.battleUnlocked.push(false);
                }
            }
            if (!this.data.critRate) this.data.critRate = 0.05;
            // 装备系统兼容（第2批新增）
            if (!this.data.inventory || !Array.isArray(this.data.inventory)) {
                this.data.inventory = [];
            }
            if (!this.data.equipped || !Array.isArray(this.data.equipped)) {
                this.data.equipped = [null, null, null, null, null, null];
            }
            // 宗门系统兼容（第4批新增）
            if (this.data.sectIndex === undefined || this.data.sectIndex === null) {
                this.data.sectIndex = -1;
            }
            if (this.data.sectContribution === undefined || this.data.sectContribution === null) {
                this.data.sectContribution = 0;
            }
            // 宗门任务系统兼容（第4-2批新增）
            if (!this.data.sectTasks || !Array.isArray(this.data.sectTasks)) {
                this.data.sectTasks = [];
            }
            if (this.data.sectTaskDate === undefined || this.data.sectTaskDate === null) {
                this.data.sectTaskDate = '';
            }
            // 宗门商店/Buff系统兼容（第4-3批新增）
            if (!this.data.activeBuffs || !Array.isArray(this.data.activeBuffs)) {
                this.data.activeBuffs = [];
            }
            if (this.data.enhanceRateBuff === undefined || this.data.enhanceRateBuff === null) {
                this.data.enhanceRateBuff = 0;
            }
            // 世界BOSS系统兼容（第5批新增）
            if (this.data.bossChallenges === undefined || this.data.bossChallenges === null) {
                this.data.bossChallenges = 3;
            }
            if (this.data.bossChallengeDate === undefined || this.data.bossChallengeDate === null) {
                this.data.bossChallengeDate = '';
            }
            if (!this.data.bossData || typeof this.data.bossData !== 'object') {
                this.data.bossData = {};
            }
            if (this.data.bossExtraChances === undefined || this.data.bossExtraChances === null) {
                this.data.bossExtraChances = 0;
            }
            // 飞升系统兼容（第6批新增）
            if (this.data.ascensionCount === undefined || this.data.ascensionCount === null) {
                this.data.ascensionCount = 0;
            }
            if (this.data.ascensionFailed === undefined || this.data.ascensionFailed === null) {
                this.data.ascensionFailed = false;
            }
            // 天赋系统兼容（第7批新增）
            if (this.data.talentPoints === undefined || this.data.talentPoints === null) {
                this.data.talentPoints = 0;
            }
            if (!this.data.talents || typeof this.data.talents !== 'object') {
                this.data.talents = { sword: 0, body: 0, qi: 0 };
            } else {
                if (this.data.talents.sword === undefined) this.data.talents.sword = 0;
                if (this.data.talents.body === undefined) this.data.talents.body = 0;
                if (this.data.talents.qi === undefined) this.data.talents.qi = 0;
            }
            // 技能系统兼容（第8批新增）
            if (!this.data.equippedSkills || !Array.isArray(this.data.equippedSkills)) {
                this.data.equippedSkills = [];
            }
            if (!this.data.skillCooldowns || typeof this.data.skillCooldowns !== 'object') {
                this.data.skillCooldowns = {};
            }
            if (!this.data.skillBuffs || !Array.isArray(this.data.skillBuffs)) {
                this.data.skillBuffs = [];
            }
            if (this.data.skillShield === undefined || this.data.skillShield === null) {
                this.data.skillShield = 0;
            }
            if (this.data.skillSlots === undefined || this.data.skillSlots === null) {
                this.data.skillSlots = 2;
            }
            // 秘境系统兼容 + 旧 localStorage 迁移（第10批）
            if (this.data.mysticRealmTokens === undefined) {
                // 尝试从旧 localStorage 迁移
                try {
                    var oldRealm = JSON.parse(localStorage.getItem('mysticRealm'));
                    if (oldRealm) {
                        this.data.mysticRealmTokens = oldRealm.tokens != null ? oldRealm.tokens : 5;
                        this.data.mysticRealmExtraBought = oldRealm.extraBought || 0;
                        this.data.mysticRealmLastRefreshDate = oldRealm.lastRefreshDate || '';
                        this.data.mysticRealmClearedRealms = oldRealm.clearedRealms || [];
                        localStorage.removeItem('mysticRealm'); // 迁移后清除旧数据
                    }
                } catch (e) {}
                if (this.data.mysticRealmTokens === undefined) this.data.mysticRealmTokens = 5;
                if (this.data.mysticRealmExtraBought === undefined) this.data.mysticRealmExtraBought = 0;
                if (this.data.mysticRealmLastRefreshDate === undefined) this.data.mysticRealmLastRefreshDate = '';
                if (!this.data.mysticRealmClearedRealms) this.data.mysticRealmClearedRealms = [];
            }
            // 灵兽系统兼容（第11批新增）
            if (!this.data.capturedBeasts || !Array.isArray(this.data.capturedBeasts)) {
                this.data.capturedBeasts = [];
            }
            if (this.data.activeBeastIdx === undefined || this.data.activeBeastIdx === null) {
                this.data.activeBeastIdx = -1;
            }
            if (this.data.beastFood === undefined || this.data.beastFood === null) {
                this.data.beastFood = 0;
            }

            return true;
        } catch (e) {
            console.warn('[仙侠传奇] 读档失败，使用默认数据:', e.message);
            this.data = deepClone(this.defaultData);
            return false;
        }
    },

    /* ----------------------------------------------------------
       游戏循环
       ---------------------------------------------------------- */

    startGameLoop: function () {
        // 自动修炼定时器
        if (!this.timers.autoCultivate) {
            this.timers.autoCultivate = setInterval(function () {
                Cultivation.cultivate(true);
            }, this.AUTO_CULTIVATE_INTERVAL);
        }

        // 自动存档定时器
        if (!this.timers.autoSave) {
            this.timers.autoSave = setInterval(function () {
                Game.saveGame();
            }, this.AUTO_SAVE_INTERVAL);
        }
    },

    stopGameLoop: function () {
        if (this.timers.autoCultivate) {
            clearInterval(this.timers.autoCultivate);
            this.timers.autoCultivate = null;
        }
        if (this.timers.autoSave) {
            clearInterval(this.timers.autoSave);
            this.timers.autoSave = null;
        }
    },

    /* ----------------------------------------------------------
       初始化世界Tab子Tab切换
       ---------------------------------------------------------- */
    _initWorldSubTabs: function () {
        var worldTab = document.getElementById('tab-world');
        if (!worldTab) return;
        var subBtns = worldTab.querySelectorAll('.sub-tab-btn');
        for (var i = 0; i < subBtns.length; i++) {
            subBtns[i].addEventListener('click', function () {
                var sub = this.getAttribute('data-sub');
                // 切换按钮高亮
                var allBtns = worldTab.querySelectorAll('.sub-tab-btn');
                for (var b = 0; b < allBtns.length; b++) {
                    allBtns[b].classList.remove('active');
                }
                this.classList.add('active');
                // 切换子页面
                var allPages = worldTab.querySelectorAll('.sub-page');
                for (var p = 0; p < allPages.length; p++) {
                    allPages[p].classList.remove('active');
                }
                var target = document.getElementById('sub-' + sub);
                if (target) target.classList.add('active');

                // 切换到秘境时懒加载
                if (sub === 'realm' && typeof MysticRealm !== 'undefined') {
                    MysticRealm.render();
                }
            });
        }
    },

    /* ----------------------------------------------------------
       初始化宗门Tab子Tab切换
       ---------------------------------------------------------- */
    _initSectSubTabs: function () {
        var sectTab = document.getElementById('tab-sect');
        if (!sectTab) return;
        var subBtns = sectTab.querySelectorAll('.sub-tab-btn');
        for (var i = 0; i < subBtns.length; i++) {
            subBtns[i].addEventListener('click', function () {
                var sub = this.getAttribute('data-sub');
                // 切换按钮高亮
                var allBtns = sectTab.querySelectorAll('.sub-tab-btn');
                for (var b = 0; b < allBtns.length; b++) {
                    allBtns[b].classList.remove('active');
                }
                this.classList.add('active');
                // 切换子页面
                var allPages = sectTab.querySelectorAll('.sub-page');
                for (var p = 0; p < allPages.length; p++) {
                    allPages[p].classList.remove('active');
                }
                var target = document.getElementById('sub-' + sub);
                if (target) target.classList.add('active');

                // 切换到灵兽时渲染
                if (sub === 'beast' && typeof Beast !== 'undefined') {
                    Beast.renderBeastTab();
                }
            });
        }
    },

};

/* ----------------------------------------------------------
   启动（DOM 加载完毕）
   ---------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
    Game.init();
});

/* ----------------------------------------------------------
   TODO: 宗门系统 - 第3批开发，包括宗门创建、攻城战、贡献度
   TODO: 世界BOSS - 第3批开发，伪多人NPC排名系统
   TODO: 飞升转生 - 第4批开发，飞升条件、转生重置、转生加成
   ---------------------------------------------------------- */