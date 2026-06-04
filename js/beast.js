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

            html += '<div class="beast-card' + (captured ? ' captured' : '') + '" style="border-color:' + qColor + ';">';

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

    /** 内部模式标记：'bestiary' | 'capture' */
    _mode: 'bestiary',

    /** 当前捕捉槽位 */
    captureSlots: [],

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
            stats: stats
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

};
