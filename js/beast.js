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
    },

    /* ----------------------------------------------------------
       主渲染函数，切换到灵兽子Tab时调用
       ---------------------------------------------------------- */
    renderBeastTab: function () {
        this.renderBestiary();
    },

};
