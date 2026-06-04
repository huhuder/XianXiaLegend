/* ============================================================
   js/beast.js — 灵兽系统
   依赖 Game.data / utils.js / components.js
   第11-1批：数据模型、图鉴渲染、子Tab骨架
   ============================================================ */

var Beast = {

    /* ----------------------------------------------------------
       品质常量
       ---------------------------------------------------------- */
    QUALITY_NAMES: ['凡品', '灵品', '仙品', '神品'],
    QUALITY_COLORS: ['#999999', '#2ecc71', '#3399ff', '#c084fc'],

    /* ----------------------------------------------------------
       灵兽图鉴池（22种预设灵兽）
       每只包含：name, type, quality(0~3), stats{atk,hp,def,critRate}
       ---------------------------------------------------------- */
    BEAST_POOL: [
        // ---- 神品(3) ----
        { name: '火凤', type: '神鸟', quality: 3, icon: '🦅', stats: { atk: 180, hp: 700, def: 100, critRate: 18 } },
        { name: '玄武', type: '圣兽', quality: 3, icon: '🐢', stats: { atk: 100, hp: 800, def: 120, critRate: 12 } },
        { name: '青龙', type: '圣兽', quality: 3, icon: '🐉', stats: { atk: 170, hp: 650, def: 90, critRate: 16 } },
        { name: '麒麟', type: '瑞兽', quality: 3, icon: '🦄', stats: { atk: 160, hp: 750, def: 110, critRate: 15 } },
        { name: '烛龙', type: '古神', quality: 3, icon: '🐲', stats: { atk: 200, hp: 600, def: 80, critRate: 20 } },

        // ---- 仙品(2) ----
        { name: '青鸾', type: '神鸟', quality: 2, icon: '🕊️', stats: { atk: 70, hp: 250, def: 45, critRate: 9 } },
        { name: '九尾狐', type: '妖兽', quality: 2, icon: '🦊', stats: { atk: 60, hp: 280, def: 30, critRate: 10 } },
        { name: '朱雀', type: '圣兽', quality: 2, icon: '🔥', stats: { atk: 80, hp: 220, def: 40, critRate: 8 } },
        { name: '白泽', type: '瑞兽', quality: 2, icon: '🦁', stats: { atk: 50, hp: 300, def: 50, critRate: 7 } },
        { name: '饕餮', type: '凶兽', quality: 2, icon: '😈', stats: { atk: 75, hp: 260, def: 35, critRate: 8 } },
        { name: '天马', type: '异兽', quality: 2, icon: '🐴', stats: { atk: 55, hp: 240, def: 40, critRate: 9 } },
        { name: '雷鹰', type: '灵禽', quality: 2, icon: '⚡', stats: { atk: 65, hp: 200, def: 38, critRate: 10 } },

        // ---- 灵品(1) ----
        { name: '白虎', type: '圣兽', quality: 1, icon: '🐯', stats: { atk: 28, hp: 100, def: 18, critRate: 5 } },
        { name: '貔貅', type: '瑞兽', quality: 1, icon: '💰', stats: { atk: 25, hp: 110, def: 15, critRate: 4 } },
        { name: '穷奇', type: '凶兽', quality: 1, icon: '👹', stats: { atk: 30, hp: 90, def: 12, critRate: 5 } },
        { name: '腾蛇', type: '妖兽', quality: 1, icon: '🐍', stats: { atk: 22, hp: 105, def: 14, critRate: 4 } },
        { name: '仙鹤', type: '灵禽', quality: 1, icon: '🦩', stats: { atk: 18, hp: 120, def: 16, critRate: 3 } },
        { name: '金蟾', type: '异兽', quality: 1, icon: '🐸', stats: { atk: 20, hp: 115, def: 18, critRate: 3 } },
        { name: '玄龟', type: '灵兽', quality: 1, icon: '🐢', stats: { atk: 15, hp: 150, def: 20, critRate: 2 } },

        // ---- 凡品(0) ----
        { name: '灵猫', type: '凡兽', quality: 0, icon: '🐱', stats: { atk: 8, hp: 35, def: 5, critRate: 2 } },
        { name: '玉兔', type: '凡兽', quality: 0, icon: '🐰', stats: { atk: 5, hp: 40, def: 3, critRate: 1 } },
        { name: '冰蝶', type: '灵虫', quality: 0, icon: '🦋', stats: { atk: 10, hp: 25, def: 4, critRate: 2 } },
    ],

    /* ----------------------------------------------------------
       渲染灵兽图鉴（全部灵兽卡片列表）
       ---------------------------------------------------------- */
    renderBestiary: function () {
        var container = document.getElementById('beast-content');
        if (!container) return;

        // 构建已捕捉灵兽的快速查找表（按名称）
        var capturedMap = {};
        var capturedBeasts = Game.data.capturedBeasts;
        for (var i = 0; i < capturedBeasts.length; i++) {
            capturedMap[capturedBeasts[i].name] = capturedBeasts[i];
        }

        var html = '';

        // 标题区
        html += '<div class="beast-header">' +
            '<div class="beast-header-title">灵 兽 图 鉴</div>' +
            '<div class="beast-header-sub">天地万灵，悉数收录</div>' +
            '</div>';

        // 统计区
        var capturedCount = 0;
        for (var k in capturedMap) {
            if (capturedMap.hasOwnProperty(k)) capturedCount++;
        }
        html += '<div class="beast-stat-bar">' +
            '<span>已收录：' + capturedCount + ' / ' + this.BEAST_POOL.length + '</span>' +
            '<span>口粮：' + formatNumber(Game.data.beastFood) + '</span>' +
            '</div>';

        // 前往捕捉入口
        html += '<div class="beast-capture-entry"><button class="beast-btn beast-btn-capture-entry" id="btn-go-capture">前 往 捕 捉</button></div>';

        // 图鉴网格
        html += '<div class="beast-grid">';

        for (var j = 0; j < this.BEAST_POOL.length; j++) {
            var beast = this.BEAST_POOL[j];
            var captured = capturedMap[beast.name];
            var qColor = this.QUALITY_COLORS[beast.quality];
            var qName = this.QUALITY_NAMES[beast.quality];

            html += '<div class="beast-card' + (captured ? ' captured' : '') + '" style="border-color:' + qColor + ';"' +
                (captured ? ' data-beast-id="' + captured.id + '"' : '') + '>';

            // 品质角标
            html += '<div class="beast-card-quality" style="color:' + qColor + ';">' + qName + '</div>';

            // 图标
            html += '<div class="beast-card-icon">' + beast.icon + '</div>';

            // 名称
            html += '<div class="beast-card-name" style="color:' + (captured ? qColor : '#555') + ';">' + beast.name + '</div>';

            // 类型
            html += '<div class="beast-card-type">' + beast.type + '</div>';

            // 状态：已捕捉显示等级，未捕捉显示???
            if (captured) {
                html += '<div class="beast-card-level">Lv.' + captured.level +
                    (captured.star > 1 ? ' ★x' + captured.star : '') + '</div>';
                // 出战中标签
                if (Game.data.activeBeastIdx !== undefined && Game.data.activeBeastIdx >= 0) {
                    var activeBeast = Game.data.capturedBeasts[Game.data.activeBeastIdx];
                    if (activeBeast && activeBeast.id === captured.id) {
                        html += '<div class="beast-card-deployed">出战中</div>';
                    }
                }
                html += '<div class="beast-card-stats">' +
                    '<span class="bs-atk">攻' + captured.stats.atk + '</span>' +
                    '<span class="bs-hp">血' + captured.stats.hp + '</span>' +
                    '<span class="bs-def">防' + captured.stats.def + '</span>' +
                    '<span class="bs-crit">暴' + captured.stats.critRate + '%</span>' +
                    '</div>';
            } else {
                html += '<div class="beast-card-unknown">???</div>';
            }

            html += '</div>';
        }

        html += '</div>';

        container.innerHTML = html;

        // 已捕捉卡片点击 → 详情
        var capturedCards = container.querySelectorAll('.beast-card.captured');
        for (var c = 0; c < capturedCards.length; c++) {
            (function (card) {
                card.addEventListener('click', function (e) {
                    self.renderBeastDetail(card.getAttribute('data-beast-id'));
                });
            })(capturedCards[c]);
        }

        // 前往捕捉按钮事件
        var goCaptureBtn = document.getElementById('btn-go-capture');
        if (goCaptureBtn) {
            var self = this;
            goCaptureBtn.addEventListener('click', function () {
                self.renderCapture();
            });
        }
    },

    /* ----------------------------------------------------------
       主渲染函数，切换到灵兽子Tab时调用
       ---------------------------------------------------------- */
    renderBeastTab: function () {
        this._mode = 'bestiary';
        this.renderBestiary();
    },

    /* =========================================================
       捕捉系统（第11-2批）
       ========================================================= */

    /** 内部模式标记：'bestiary' | 'capture' | 'detail' */
    _mode: 'bestiary',

    /** 当前捕捉槽位 */
    captureSlots: [],

    /** 当前查看详情的灵兽ID */
    _detailBeastId: null,

    /** 喂食数量 */
    _feedAmount: 1,

    /* =========================================================
       培养系统（第11-3批）— 辅助计算函数
       ========================================================= */

    /** 获取灵兽升级所需经验 */
    getExpRequired: function (beast) {
        var qualityMult = [1, 2, 4, 8][beast.quality];
        return beast.level * 100 * qualityMult;
    },

    /** 获取当前星级最大等级 */
    getMaxLevel: function (beast) {
        return beast.star * 20;
    },

    /** 获取品质最大星级 */
    getMaxStar: function (quality) {
        return [2, 3, 4, 5][quality];
    },

    /** 查找灵兽（by id） */
    _findBeast: function (beastId) {
        var list = Game.data.capturedBeasts;
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === beastId) return list[i];
        }
        return null;
    },

    /** 获取基础属性（兼容旧档） */
    getBaseStats: function (beast) {
        if (beast.baseStats) return beast.baseStats;
        return {
            atk: beast.stats.atk,
            hp: beast.stats.hp,
            def: beast.stats.def,
            critRate: beast.stats.critRate
        };
    },

    /** 根据等级重算属性：current = base * (1 + 0.1 * (level - 1)) */
    _recalcStats: function (beast) {
        var base = this.getBaseStats(beast);
        var mult = 1 + 0.1 * (beast.level - 1);
        beast.stats.atk = Math.floor(base.atk * mult);
        beast.stats.hp = Math.floor(base.hp * mult);
        beast.stats.def = Math.floor(base.def * mult);
        beast.stats.critRate = Math.floor(base.critRate * mult);
    },

    /* ----------------------------------------------------------
       根据境界获取可捕捉的最高品质
       ---------------------------------------------------------- */
    getMaxQuality: function () {
        var ri = Game.data.realmIndex;
        if (ri <= 1) return 0;
        if (ri <= 3) return 1;
        if (ri <= 6) return 2;
        return 3;
    },

    /* ----------------------------------------------------------
       获取可捕捉池（品质筛选 + 排除已拥有）
       ---------------------------------------------------------- */
    getAvailablePool: function () {
        var maxQ = this.getMaxQuality();
        var capturedNames = {};
        var captured = Game.data.capturedBeasts;
        for (var i = 0; i < captured.length; i++) {
            capturedNames[captured[i].name] = true;
        }
        var pool = [];
        for (var j = 0; j < this.BEAST_POOL.length; j++) {
            var b = this.BEAST_POOL[j];
            if (b.quality <= maxQ && !capturedNames[b.name]) {
                pool.push(b);
            }
        }
        // 全部已捕捉则允许重复
        if (pool.length === 0) {
            for (var k = 0; k < this.BEAST_POOL.length; k++) {
                if (this.BEAST_POOL[k].quality <= maxQ) {
                    pool.push(this.BEAST_POOL[k]);
                }
            }
        }
        return pool;
    },

    /* ----------------------------------------------------------
       生成/刷新 3 个捕捉槽位
       ---------------------------------------------------------- */
    _refreshPool: function () {
        var pool = this.getAvailablePool();
        this.captureSlots = [];
        if (pool.length === 0) return;
        for (var i = 0; i < 3; i++) {
            this.captureSlots.push(pool[randInt(0, pool.length - 1)]);
        }
    },

    /* ----------------------------------------------------------
       确保槽位有效（每日自动刷新 + 从存档恢复）
       ---------------------------------------------------------- */
    _ensureSlots: function () {
        var today = new Date().toISOString().slice(0, 10);
        if (Game.data.beastCaptureDate !== today || !Game.data.beastCaptureSlots || Game.data.beastCaptureSlots.length === 0) {
            this._refreshPool();
            Game.data.beastCaptureDate = today;
            Game.data.beastCaptureSlots = this.captureSlots.map(function (b) { return b.name; });
            Game.saveGame();
        } else {
            // 从存档恢复槽位
            this.captureSlots = [];
            var savedNames = Game.data.beastCaptureSlots;
            for (var i = 0; i < savedNames.length; i++) {
                var found = null;
                for (var j = 0; j < this.BEAST_POOL.length; j++) {
                    if (this.BEAST_POOL[j].name === savedNames[i]) {
                        found = this.BEAST_POOL[j];
                        break;
                    }
                }
                if (found) this.captureSlots.push(found);
            }
        }
    },

    /* ----------------------------------------------------------
       手动刷新捕捉池（消耗100灵石）
       ---------------------------------------------------------- */
    refreshCapture: function () {
        if (Game.data.spiritStones < 100) {
            showToast('灵石不足，刷新需要100灵石');
            return;
        }
        Game.data.spiritStones -= 100;
        this._refreshPool();
        Game.data.beastCaptureSlots = this.captureSlots.map(function (b) { return b.name; });
        Game.saveGame();
        this.renderCapture();
        showToast('已刷新捕捉池');
    },

    /* ----------------------------------------------------------
       品质基础属性表
       ---------------------------------------------------------- */
    _QUALITY_BASE: [
        { atk: 10,  hp: 50,   def: 5   },
        { atk: 30,  hp: 150,  def: 15  },
        { atk: 80,  hp: 400,  def: 40  },
        { atk: 200, hp: 1000, def: 100 },
    ],

    /* ----------------------------------------------------------
       捕捉灵兽
       @param {number} slotIndex - 槽位索引
       ---------------------------------------------------------- */
    captureBeast: function (slotIndex) {
        var beast = this.captureSlots[slotIndex];
        if (!beast) return;
        var q = beast.quality;

        var stoneCost = [500, 2000, 5000, 10000][q];
        var tokenCost = [0, 1, 2, 3][q];

        // 判断支付方式
        var useTokens = false;
        if (Game.data.spiritStones < stoneCost) {
            if (q > 0 && Game.data.mysticRealmTokens >= tokenCost) {
                useTokens = true;
            } else {
                var msg = '资源不足，需要' + stoneCost + '灵石';
                if (tokenCost > 0) msg += '或' + tokenCost + '秘境令';
                showToast(msg);
                return;
            }
        }

        // 扣除资源
        if (useTokens) {
            Game.data.mysticRealmTokens -= tokenCost;
        } else {
            Game.data.spiritStones -= stoneCost;
        }

        // 生成随机属性
        var base = this._QUALITY_BASE[q];
        var stats = {
            atk: Math.floor(base.atk * (0.8 + Math.random() * 0.4)),
            hp:  Math.floor(base.hp  * (0.8 + Math.random() * 0.4)),
            def: Math.floor(base.def * (0.8 + Math.random() * 0.4)),
            critRate: q * 2 + randInt(1, 3)
        };

        var captured = {
            id: 'beast_' + Date.now(),
            name: beast.name,
            type: beast.type,
            quality: beast.quality,
            level: 1,
            exp: 0,
            star: 1,
            stats: deepClone(stats),
            baseStats: deepClone(stats)
        };

        Game.data.capturedBeasts.push(captured);

        // 从槽位移除
        this.captureSlots.splice(slotIndex, 1);
        Game.data.beastCaptureSlots = this.captureSlots.map(function (b) { return b.name; });

        Game.saveGame();
        this.renderCapture();
        showToast('成功捕捉 ' + beast.name + '！');
    },

    /* ----------------------------------------------------------
       渲染捕捉UI
       ---------------------------------------------------------- */
    renderCapture: function () {
        var container = document.getElementById('beast-content');
        if (!container) return;
        this._mode = 'capture';
        this._ensureSlots();

        var self = this;
        var html = '';

        // 标题
        html += '<div class="beast-header">' +
            '<div class="beast-header-title">万 灵 捕 捉</div>' +
            '<div class="beast-header-sub">以灵石为引，结灵兽之缘</div>' +
            '</div>';

        // 资源栏
        html += '<div class="beast-resource-bar">' +
            '<span class="br-stone">灵石：' + formatNumber(Game.data.spiritStones) + '</span>' +
            '<span class="br-token">秘境令：' + Game.data.mysticRealmTokens + '</span>' +
            '<span class="br-food">口粮：' + formatNumber(Game.data.beastFood) + '</span>' +
            '</div>';

        // 品质解锁提示
        var maxQ = this.getMaxQuality();
        var qualitySpans = [];
        for (var qi = 0; qi <= maxQ; qi++) {
            qualitySpans.push('<span style="color:' + this.QUALITY_COLORS[qi] + ';">' + this.QUALITY_NAMES[qi] + '</span>');
        }
        html += '<div class="beast-capture-info">当前境界可捕捉：' + qualitySpans.join(' / ') + '</div>';

        // 捕捉槽位
        if (this.captureSlots.length === 0) {
            html += '<div class="beast-no-capture">暂无灵兽驻足，点击刷新召唤新的灵兽</div>';
        } else {
            html += '<div class="beast-capture-grid">';
            for (var i = 0; i < this.captureSlots.length; i++) {
                var b = this.captureSlots[i];
                var qColor = this.QUALITY_COLORS[b.quality];
                var qName = this.QUALITY_NAMES[b.quality];
                var stoneCost = [500, 2000, 5000, 10000][b.quality];
                var tokenCost = [0, 1, 2, 3][b.quality];

                var base = this._QUALITY_BASE[b.quality];
                var atkLo = Math.floor(base.atk * 0.8);
                var atkHi = Math.floor(base.atk * 1.2);
                var hpLo  = Math.floor(base.hp  * 0.8);
                var hpHi  = Math.floor(base.hp  * 1.2);
                var defLo = Math.floor(base.def * 0.8);
                var defHi = Math.floor(base.def * 1.2);

                var costText = stoneCost + '灵石';
                if (tokenCost > 0) costText += ' / ' + tokenCost + '秘令';

                html += '<div class="capture-card" style="border-color:' + qColor + ';">' +
                    '<div class="capture-card-icon">' + b.icon + '</div>' +
                    '<div class="capture-card-info">' +
                    '<div class="capture-card-quality" style="color:' + qColor + ';">' + qName + '</div>' +
                    '<div class="capture-card-name" style="color:' + qColor + ';">' + b.name + '</div>' +
                    '<div class="capture-card-type">' + b.type + '</div>' +
                    '<div class="capture-card-preview">' +
                    '<span class="cp-atk">攻 ' + atkLo + '~' + atkHi + '</span>' +
                    '<span class="cp-hp">血 ' + hpLo + '~' + hpHi + '</span>' +
                    '<span class="cp-def">防 ' + defLo + '~' + defHi + '</span>' +
                    '</div>' +
                    '<div class="capture-card-cost">' + costText + '</div>' +
                    '</div>' +
                    '<button class="capture-btn" data-slot="' + i + '">捕 捉</button>' +
                    '</div>';
            }
            html += '</div>';
        }

        // 操作按钮行
        html += '<div class="beast-capture-actions">' +
            '<button class="beast-btn beast-btn-refresh" id="btn-refresh-capture">刷新捕捉</button>' +
            '<button class="beast-btn beast-btn-back" id="btn-back-bestial">返回图鉴</button>' +
            '</div>';

        container.innerHTML = html;

        // 事件绑定：捕捉按钮
        var captureBtns = container.querySelectorAll('.capture-btn');
        for (var c = 0; c < captureBtns.length; c++) {
            (function (idx) {
                captureBtns[c].addEventListener('click', function () {
                    self.captureBeast(idx);
                });
            })(c);
        }

        // 事件绑定：刷新按钮
        var refreshBtn = document.getElementById('btn-refresh-capture');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function () {
                self.refreshCapture();
            });
        }

        // 事件绑定：返回图鉴
        var backBtn = document.getElementById('btn-back-bestial');
        if (backBtn) {
            backBtn.addEventListener('click', function () {
                self._mode = 'bestiary';
                self.renderBestiary();
            });
        }
    },

    /* =========================================================
       培养系统（第11-3批）— 详情 / 喂食 / 进化
       ========================================================= */

    /** 渲染灵兽详情面板 */
    renderBeastDetail: function (beastId) {
        var container = document.getElementById('beast-content');
        if (!container) return;

        var beast = this._findBeast(beastId);
        if (!beast) { this.renderBestiary(); return; }

        this._mode = 'detail';
        this._detailBeastId = beastId;
        this._feedAmount = 1;

        var self = this;
        var qColor = this.QUALITY_COLORS[beast.quality];
        var qName = this.QUALITY_NAMES[beast.quality];
        var maxLv = this.getMaxLevel(beast);
        var expReq = this.getExpRequired(beast);
        var isMaxLv = beast.level >= maxLv;
        var maxStar = this.getMaxStar(beast.quality);
        var isMaxStar = beast.star >= maxStar;

        // 查找图鉴池中的图标
        var icon = '';
        for (var j = 0; j < this.BEAST_POOL.length; j++) {
            if (this.BEAST_POOL[j].name === beast.name) {
                icon = this.BEAST_POOL[j].icon;
                break;
            }
        }

        var html = '';

        // 返回按钮行
        html += '<div class="detail-back-row">' +
            '<button class="detail-back-btn" id="btn-detail-back">← 返回图鉴</button>' +
            '</div>';

        // 头部：图标 + 名称 + 品质星
        html += '<div class="detail-header">' +
            '<div class="detail-icon">' + icon + '</div>' +
            '<div class="detail-title">' +
            '<div class="detail-name" style="color:' + qColor + ';">' + beast.name + '</div>' +
            '<div class="detail-tags">' +
            '<span class="detail-tag-quality" style="color:' + qColor + ';border-color:' + qColor + ';">' + qName + '</span>' +
            '<span class="detail-tag-star">★ x' + beast.star + '</span>' +
            '</div>' +
            '</div>' +
            '</div>';

        // 等级和经验条
        var expPct = isMaxLv ? 100 : Math.min(100, Math.floor(beast.exp / expReq * 100));
        html += '<div class="detail-level-section">' +
            '<div class="detail-level-row">' +
            '<span class="detail-lv">Lv.' + beast.level + '</span>' +
            (isMaxLv ? '<span class="detail-max-tag">MAX</span>' :
                '<span class="detail-exp-text">' + beast.exp + ' / ' + expReq + '</span>') +
            '</div>' +
            '<div class="detail-exp-bar">' +
            '<div class="detail-exp-fill" style="width:' + expPct + '%;background:' + qColor + ';"></div>' +
            '</div>' +
            '</div>';

        // 四维属性
        html += '<div class="detail-stats-section">' +
            '<div class="detail-stats-title">四 维 属 性</div>' +
            '<div class="detail-stats-grid">' +
            '<div class="detail-stat"><span class="ds-label ds-atk">攻击</span><span class="ds-val">' + beast.stats.atk + '</span></div>' +
            '<div class="detail-stat"><span class="ds-label ds-hp">生命</span><span class="ds-val">' + beast.stats.hp + '</span></div>' +
            '<div class="detail-stat"><span class="ds-label ds-def">防御</span><span class="ds-val">' + beast.stats.def + '</span></div>' +
            '<div class="detail-stat"><span class="ds-label ds-crit">暴击率</span><span class="ds-val">' + beast.stats.critRate + '%</span></div>' +
            '</div>' +
            '</div>';

        // 喂食区域
        html += '<div class="detail-feed-section">' +
            '<div class="detail-section-title">喂 食 升 级</div>';

        if (isMaxLv) {
            html += '<div class="detail-feed-disabled">已达当前星级上限，请进化后再升级</div>';
        } else {
            var foodNeededOne = Math.max(1, Math.ceil((expReq - beast.exp) / 100));
            html += '<div class="detail-feed-info">当前口粮：<span class="br-food">' + formatNumber(Game.data.beastFood) + '</span> — 本级还需 ' + foodNeededOne + ' 份</div>' +
                '<div class="detail-feed-controls">' +
                '<button class="feed-adj-btn" id="btn-feed-minus10">-10</button>' +
                '<button class="feed-adj-btn" id="btn-feed-minus">-1</button>' +
                '<span class="feed-amount" id="feed-amount-display">' + this._feedAmount + '</span>' +
                '<button class="feed-adj-btn" id="btn-feed-plus">+1</button>' +
                '<button class="feed-adj-btn" id="btn-feed-plus10">+10</button>' +
                '</div>' +
                '<div class="detail-feed-actions">' +
                '<button class="beast-btn beast-btn-feed" id="btn-feed-go">喂 食</button>' +
                '<button class="beast-btn beast-btn-feed-max" id="btn-feed-max">一键满级</button>' +
                '</div>';
        }

        html += '<div class="detail-feed-hint">口粮可通过宗门贡献兑换、挂机战斗掉落获得</div>' +
            '</div>';

        // 进化区域
        html += '<div class="detail-evolve-section">' +
            '<div class="detail-section-title">进 化 升 星</div>';

        if (isMaxStar) {
            html += '<div class="detail-evolve-disabled">已达品质上限（' + qName + '最高' + maxStar + '星）</div>';
        } else if (!isMaxLv) {
            html += '<div class="detail-evolve-disabled">需达到 Lv.' + maxLv + ' 方可进化</div>';
        } else {
            var stoneCost = beast.star * 5000 * (beast.quality + 1);
            var canAfford = Game.data.spiritStones >= stoneCost;
            // 找同品质牺牲材料（排除自身）
            var sacrificeCandidates = [];
            for (var k = 0; k < Game.data.capturedBeasts.length; k++) {
                var cb = Game.data.capturedBeasts[k];
                if (cb.id !== beast.id && cb.quality === beast.quality) {
                    sacrificeCandidates.push(cb);
                }
            }
            html += '<div class="detail-evolve-info">' +
                '<div>消耗：<span class="br-stone">' + formatNumber(stoneCost) + '灵石</span></div>' +
                '<div>材料：同品质灵兽 1 只' + (sacrificeCandidates.length > 0 ? '（可选 ' + sacrificeCandidates.length + ' 只）' : '（无可用材料）') + '</div>' +
                '<div>结果：星级 +1 → ★x' + (beast.star + 1) + '，属性基础 ×1.5，等级重置为 1</div>' +
                '</div>';

            if (!canAfford || sacrificeCandidates.length === 0) {
                var reason = !canAfford ? '灵石不足' : '无同品质灵兽可作材料';
                html += '<button class="beast-btn beast-btn-evolve disabled" disabled>' + reason + '</button>';
            } else {
                html += '<button class="beast-btn beast-btn-evolve" id="btn-evolve-go">进 化 升 星</button>';
            }
        }

        html += '</div>';

        // 出战/召回按钮
        var isActiveBeast = (Game.data.activeBeastIdx !== undefined &&
            Game.data.activeBeastIdx >= 0 &&
            Game.data.activeBeastIdx < Game.data.capturedBeasts.length &&
            Game.data.capturedBeasts[Game.data.activeBeastIdx].id === beast.id);
        html += '<div class="detail-battle-section">' +
            '<button class="beast-btn beast-btn-battle' + (isActiveBeast ? ' deployed' : '') +
            '" id="btn-deploy-beast" style="' + (isActiveBeast ? 'background:linear-gradient(135deg,rgba(46,204,113,0.25),rgba(39,174,96,0.12));border-color:#2ecc71;color:#2ecc71;' : 'background:linear-gradient(135deg,rgba(212,165,116,0.2),rgba(184,134,11,0.1));border-color:#d4a574;color:#d4a574;') + '">' +
            (isActiveBeast ? '出 战 中（点击召回）' : '出 战') +
            '</button>' +
            '</div>';

        container.innerHTML = html;

        // === 事件绑定 ===

        // 返回按钮
        var backBtn = document.getElementById('btn-detail-back');
        if (backBtn) {
            backBtn.addEventListener('click', function () {
                self._mode = 'bestiary';
                self.renderBestiary();
            });
        }

        if (!isMaxLv) {
            // 喂食数量调节
            var btnMinus10 = document.getElementById('btn-feed-minus10');
            var btnMinus = document.getElementById('btn-feed-minus');
            var btnPlus = document.getElementById('btn-feed-plus');
            var btnPlus10 = document.getElementById('btn-feed-plus10');
            var display = document.getElementById('feed-amount-display');

            var updateDisplay = function () {
                if (display) display.textContent = self._feedAmount;
            };

            if (btnMinus10) btnMinus10.addEventListener('click', function () { self._feedAmount = Math.max(1, self._feedAmount - 10); updateDisplay(); });
            if (btnMinus)   btnMinus.addEventListener('click',   function () { self._feedAmount = Math.max(1, self._feedAmount - 1);  updateDisplay(); });
            if (btnPlus)    btnPlus.addEventListener('click',    function () { self._feedAmount = Math.min(9999, self._feedAmount + 1);  updateDisplay(); });
            if (btnPlus10)  btnPlus10.addEventListener('click',  function () { self._feedAmount = Math.min(9999, self._feedAmount + 10); updateDisplay(); });

            // 喂食按钮
            var feedBtn = document.getElementById('btn-feed-go');
            if (feedBtn) feedBtn.addEventListener('click', function () { self.feedBeast(self._feedAmount); });

            // 一键满级
            var maxBtn = document.getElementById('btn-feed-max');
            if (maxBtn) maxBtn.addEventListener('click', function () { self.feedToMax(); });
        }

        // 进化按钮
        var evolveBtn = document.getElementById('btn-evolve-go');
        if (evolveBtn) {
            evolveBtn.addEventListener('click', function () {
                self.evolveBeast();
            });
        }

        // 出战/召回按钮
        var deployBtn = document.getElementById('btn-deploy-beast');
        if (deployBtn) {
            deployBtn.addEventListener('click', function () {
                self.deployBeast();
            });
        }
    },

    /** 计算从当前等级到 targetLevel 所需总经验 */
    _calcExpToLevel: function (beast, targetLevel) {
        var total = 0;
        var qualityMult = [1, 2, 4, 8][beast.quality];
        for (var lv = beast.level; lv < targetLevel; lv++) {
            total += lv * 100 * qualityMult;
        }
        total -= beast.exp; // 减去已有经验
        return Math.max(0, total);
    },

    /** 喂食灵兽 */
    feedBeast: function (amount) {
        var beast = this._findBeast(this._detailBeastId);
        if (!beast) return;

        var maxLv = this.getMaxLevel(beast);
        if (beast.level >= maxLv) {
            showToast('已达当前星级上限');
            return;
        }

        var totalFood = amount;
        if (Game.data.beastFood < totalFood) {
            showToast('口粮不足，当前仅有' + Game.data.beastFood + '份');
            return;
        }
        if (totalFood <= 0) {
            showToast('请输入有效数量');
            return;
        }

        var expGain = totalFood * 100;
        Game.data.beastFood -= totalFood;

        var levelUps = 0;
        while (expGain > 0 && beast.level < maxLv) {
            var need = this.getExpRequired(beast) - beast.exp;
            if (expGain >= need) {
                expGain -= need;
                beast.exp = 0;
                beast.level++;
                levelUps++;
            } else {
                beast.exp += expGain;
                expGain = 0;
            }
        }

        // 重算属性
        this._recalcStats(beast);

        Game.saveGame();
        this.renderBeastDetail(this._detailBeastId);

        if (levelUps > 0) {
            showToast(beast.name + ' 升至 Lv.' + beast.level + '！');
        }
    },

    /** 一键喂到满级 */
    feedToMax: function () {
        var beast = this._findBeast(this._detailBeastId);
        if (!beast) return;

        var maxLv = this.getMaxLevel(beast);
        if (beast.level >= maxLv) {
            showToast('已达当前星级上限');
            return;
        }

        var totalExpNeeded = this._calcExpToLevel(beast, maxLv);
        var foodNeeded = Math.ceil(totalExpNeeded / 100);

        if (foodNeeded <= 0) {
            showToast('已满级');
            return;
        }

        if (Game.data.beastFood < foodNeeded) {
            showToast('口粮不足，需要' + foodNeeded + '份，当前仅有' + Game.data.beastFood + '份');
            return;
        }

        this.feedBeast(foodNeeded);
    },

    /** 进化升星 */
    evolveBeast: function () {
        var beast = this._findBeast(this._detailBeastId);
        if (!beast) return;

        var maxLv = this.getMaxLevel(beast);
        if (beast.level < maxLv) {
            showToast('灵兽未满级，无法进化');
            return;
        }

        var maxStar = this.getMaxStar(beast.quality);
        if (beast.star >= maxStar) {
            showToast('已达品质最高星级');
            return;
        }

        var stoneCost = beast.star * 5000 * (beast.quality + 1);
        if (Game.data.spiritStones < stoneCost) {
            showToast('灵石不足，需要' + formatNumber(stoneCost) + '灵石');
            return;
        }

        // 找同品质牺牲材料
        var sacrificeIdx = -1;
        for (var i = 0; i < Game.data.capturedBeasts.length; i++) {
            if (Game.data.capturedBeasts[i].id !== beast.id &&
                Game.data.capturedBeasts[i].quality === beast.quality) {
                sacrificeIdx = i;
                break;
            }
        }
        if (sacrificeIdx === -1) {
            showToast('需要一只同品质灵兽作为进化材料');
            return;
        }

        var sacrifice = Game.data.capturedBeasts[sacrificeIdx];

        // 扣除灵石
        Game.data.spiritStones -= stoneCost;

        // 移除牺牲材料
        Game.data.capturedBeasts.splice(sacrificeIdx, 1);

        // 修正 activeBeastIdx（如果移除的索引在出战索引之前或被移除的就是出战灵兽）
        if (Game.data.activeBeastIdx !== undefined && Game.data.activeBeastIdx >= 0) {
            if (Game.data.activeBeastIdx === sacrificeIdx) {
                // 牺牲材料是出战灵兽 → 清除
                Game.data.activeBeastIdx = -1;
            } else if (Game.data.activeBeastIdx > sacrificeIdx) {
                // 出战灵兽在牺牲材料之后 → 索引前移
                Game.data.activeBeastIdx--;
            }
        }

        // 升星
        beast.star++;

        // 基础属性 ×1.5
        var base = this.getBaseStats(beast);
        beast.baseStats = {
            atk: Math.floor(base.atk * 1.5),
            hp: Math.floor(base.hp * 1.5),
            def: Math.floor(base.def * 1.5),
            critRate: Math.floor(base.critRate * 1.5)
        };

        // 重置等级
        beast.level = 1;
        beast.exp = 0;

        // 重算属性
        this._recalcStats(beast);

        Game.saveGame();
        this.renderBeastDetail(this._detailBeastId);
        showToast(beast.name + ' 进化为 ★x' + beast.star + '！');
    },

    /* =========================================================
       出战系统（第11-4批）
       ========================================================= */

    /** 出战/召回灵兽 */
    deployBeast: function () {
        var detailBeast = this._findBeast(this._detailBeastId);
        if (!detailBeast) return;

        // 查找该灵兽在 capturedBeasts 中的索引
        var beastIdx = -1;
        for (var i = 0; i < Game.data.capturedBeasts.length; i++) {
            if (Game.data.capturedBeasts[i].id === detailBeast.id) {
                beastIdx = i;
                break;
            }
        }
        if (beastIdx === -1) return;

        // 如果当前正好是该灵兽出战 → 召回
        if (Game.data.activeBeastIdx === beastIdx) {
            Game.data.activeBeastIdx = -1;
            Game.saveGame();
            this.renderBeastDetail(this._detailBeastId);
            showToast(detailBeast.name + ' 已召回');
            return;
        }

        // 出战：设置 activeBeastIdx
        Game.data.activeBeastIdx = beastIdx;
        Game.saveGame();
        this.renderBeastDetail(this._detailBeastId);
        showToast(detailBeast.name + ' 已出战！');
    },

    /** 获取出战灵兽的属性加成（加成比例 = star × 5%） */
    getActiveBeastBonus: function () {
        var idx = Game.data.activeBeastIdx;
        if (idx === undefined || idx < 0 || idx >= Game.data.capturedBeasts.length) {
            return { atk: 0, hp: 0, def: 0, critRate: 0 };
        }

        var beast = Game.data.capturedBeasts[idx];
        var ratio = beast.star * 0.05; // 每星5%

        var bonus = {
            atk: Math.floor(beast.stats.atk * ratio),
            hp: Math.floor(beast.stats.hp * ratio),
            def: Math.floor(beast.stats.def * ratio),
            critRate: Math.floor(beast.stats.critRate * ratio)
        };

        // 满级满星额外加成（属性 ×10% 额外）
        var maxLv = this.getMaxLevel(beast);
        var maxStar = this.getMaxStar(beast.quality);
        if (beast.level >= maxLv && beast.star >= maxStar) {
            bonus.atk += Math.floor(beast.stats.atk * 0.1);
            bonus.hp += Math.floor(beast.stats.hp * 0.1);
            bonus.def += Math.floor(beast.stats.def * 0.1);
            bonus.critRate += Math.floor(beast.stats.critRate * 0.1);
        }

        return bonus;
    },

};
