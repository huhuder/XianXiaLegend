/* ============================================================
   js/sect.js — 宗门系统
   依赖 Game.data / utils.js / components.js
   第4-1批：宗门基础框架（宗门选择、职位体系、功法加成）
   第4-2批：宗门任务系统（每日任务、进度追踪、奖励领取）
   ============================================================ */

var Sect = {

    /* ----------------------------------------------------------
       宗门定义（4个）
       ---------------------------------------------------------- */
    SECTS: [
        {
            name: '青云剑宗',
            desc: '一剑破万法，青云直上九重天',
            bonus: { atkPct: 15, defPct: 0, hpPct: 0, lifestealPct: 0 },
            icon: '⚔️',
            color: '#3498db',
        },
        {
            name: '太虚道宗',
            desc: '道法自然，长生久视',
            bonus: { atkPct: 0, defPct: 0, hpPct: 20, lifestealPct: 0 },
            icon: '☯️',
            color: '#2ecc71',
        },
        {
            name: '玄铁盾门',
            desc: '不动如山，万法不侵',
            bonus: { atkPct: 0, defPct: 20, hpPct: 0, lifestealPct: 0 },
            icon: '🛡️',
            color: '#f39c12',
        },
        {
            name: '幽冥魔教',
            desc: '以血为引，以杀证道',
            bonus: { atkPct: 0, defPct: 0, hpPct: 0, lifestealPct: 10 },
            icon: '💀',
            color: '#e74c3c',
        },
    ],

    /* ----------------------------------------------------------
       职位体系
       ---------------------------------------------------------- */
    RANKS: [
        { name: '外门弟子', minContribution: 0,    ratio: 0.33 },
        { name: '内门弟子', minContribution: 500,  ratio: 0.60 },
        { name: '真传弟子', minContribution: 2000, ratio: 0.80 },
        { name: '长老',     minContribution: 5000, ratio: 1.00 },
    ],

    /* ----------------------------------------------------------
       宗门商店物品（6种）
       ---------------------------------------------------------- */
    SECT_SHOP_ITEMS: [
        { name: '凡品装备箱', desc: '随机获得一件凡品装备', cost: 50,   type: 'chest',   quality: 0, minRank: 0 },
        { name: '良品装备箱', desc: '随机获得一件良品装备', cost: 150,  type: 'chest',   quality: 1, minRank: 0 },
        { name: '上品装备箱', desc: '随机获得一件上品装备', cost: 400,  type: 'chest',   quality: 2, minRank: 1 },
        { name: '强化符',   desc: '强化成功率+20%（单次有效）', cost: 200,  type: 'buff',    buffType: 'enhanceRate', buffValue: 20, minRank: 0 },
        { name: '小还丹',   desc: '1小时内攻击+30%',   cost: 300,  type: 'buff',    buffType: 'atkBuff',   buffValue: 0.3, duration: 3600000, minRank: 1 },
        { name: '大还丹',   desc: '1小时内全属性+50%',  cost: 800,  type: 'buff',    buffType: 'allBuff',   buffValue: 0.5, duration: 3600000, minRank: 2 },
    ],

    /* ----------------------------------------------------------
       宗门任务模板（6种，每日随机选3个）
       ---------------------------------------------------------- */
    SECT_TASKS: [
        { name: '猎杀妖兽', desc: '前往历练地图击杀妖兽', type: 'kill',      targetCount: 10, rewardContribution: 30,  rewardStones: 200 },
        { name: '潜心修炼', desc: '完成修炼以精进修为', type: 'cultivate', targetCount: 5,  rewardContribution: 20,  rewardStones: 150 },
        { name: '灵石采集', desc: '积累灵石以充宗门库藏', type: 'stones',    targetCount: 500, rewardContribution: 25,  rewardStones: 100 },
        { name: '宗门巡逻', desc: '巡视宗门领地驱逐外敌', type: 'kill',      targetCount: 15, rewardContribution: 40,  rewardStones: 300 },
        { name: '丹药炼制', desc: '完成修炼辅助宗门炼丹', type: 'cultivate', targetCount: 8,  rewardContribution: 30,  rewardStones: 200 },
        { name: '功法研习', desc: '研习宗门功法典籍', type: 'cultivate', targetCount: 3,  rewardContribution: 15,  rewardStones: 350 },
    ],

    /* ----------------------------------------------------------
       根据贡献值返回职位名称和加成比例
       @returns {{ name: string, ratio: number, index: number }}
       ---------------------------------------------------------- */
    getRank: function () {
        var contrib = Game.data.sectContribution || 0;
        var rank = this.RANKS[0];
        var index = 0;
        for (var i = this.RANKS.length - 1; i >= 0; i--) {
            if (contrib >= this.RANKS[i].minContribution) {
                rank = this.RANKS[i];
                index = i;
                break;
            }
        }
        return { name: rank.name, ratio: rank.ratio, index: index };
    },

    /* ----------------------------------------------------------
       返回当前宗门功法加成（已乘职位比例）
       @returns {{ atkPct: number, defPct: number, hpPct: number, lifestealPct: number }}
       ---------------------------------------------------------- */
    getSectBonus: function () {
        if (Game.data.sectIndex < 0 || Game.data.sectIndex >= this.SECTS.length) {
            return { atkPct: 0, defPct: 0, hpPct: 0, lifestealPct: 0 };
        }
        var sect = this.SECTS[Game.data.sectIndex];
        var rank = this.getRank();
        var raw = sect.bonus;
        return {
            atkPct: Math.floor(raw.atkPct * rank.ratio),
            defPct: Math.floor(raw.defPct * rank.ratio),
            hpPct: Math.floor(raw.hpPct * rank.ratio),
            lifestealPct: Math.floor(raw.lifestealPct * rank.ratio),
        };
    },

    /* ----------------------------------------------------------
       格式化加成文本
       ---------------------------------------------------------- */
    formatBonus: function (bonus) {
        var parts = [];
        if (bonus.atkPct) parts.push('攻击+' + bonus.atkPct + '%');
        if (bonus.defPct) parts.push('防御+' + bonus.defPct + '%');
        if (bonus.hpPct) parts.push('生命+' + bonus.hpPct + '%');
        if (bonus.lifestealPct) parts.push('吸血+' + bonus.lifestealPct + '%');
        return parts.join('、');
    },

    /* ----------------------------------------------------------
       加入宗门
       @param {number} sectIndex - 宗门索引 0~3
       ---------------------------------------------------------- */
    joinSect: function (sectIndex) {
        if (Game.data.sectIndex >= 0) {
            showToast('你已有宗门，无法再加入其他宗门！', 2000);
            return;
        }
        if (sectIndex < 0 || sectIndex >= this.SECTS.length) return;
        var sect = this.SECTS[sectIndex];
        Game.data.sectIndex = sectIndex;
        Game.data.sectContribution = 0;
        Game.saveGame();
        showToast('成功加入【' + sect.name + '】！', 2000);
        this.renderSect();
    },

    /* ============================================================
       宗门任务系统（第4-2批）
       ============================================================ */

    /* ----------------------------------------------------------
       获取今日日期字符串 'YYYY-MM-DD'
       ---------------------------------------------------------- */
    getTodayStr: function () {
        var d = new Date();
        var month = (d.getMonth() + 1);
        var day = d.getDate();
        return d.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
    },

    /* ----------------------------------------------------------
       检查每日重置：日期变化时自动重新生成任务
       ---------------------------------------------------------- */
    checkDailyReset: function () {
        var today = this.getTodayStr();
        if (Game.data.sectTaskDate !== today) {
            this.generateDailyTasks();
        }
    },

    /* ----------------------------------------------------------
       随机生成3个不重复的每日任务
       ---------------------------------------------------------- */
    generateDailyTasks: function () {
        var pool = [];
        for (var i = 0; i < this.SECT_TASKS.length; i++) {
            pool.push(i);
        }
        // Fisher-Yates 洗牌前3个
        for (var j = pool.length - 1; j > 0; j--) {
            var r = Math.floor(Math.random() * (j + 1));
            var tmp = pool[j];
            pool[j] = pool[r];
            pool[r] = tmp;
        }
        var selected = pool.slice(0, 3);

        Game.data.sectTasks = [];
        for (var k = 0; k < selected.length; k++) {
            Game.data.sectTasks.push({
                taskIndex: selected[k],
                progress: 0,
                completed: false,
            });
        }
        Game.data.sectTaskDate = this.getTodayStr();
        Game.saveGame();
    },

    /* ----------------------------------------------------------
       检查并标记已完成的任务
       ---------------------------------------------------------- */
    checkTaskCompletion: function () {
        var changed = false;
        var tasks = Game.data.sectTasks;
        if (!tasks || tasks.length === 0) return;
        for (var i = 0; i < tasks.length; i++) {
            if (tasks[i].completed) continue;
            var tpl = this.SECT_TASKS[tasks[i].taskIndex];
            if (tasks[i].progress >= tpl.targetCount) {
                tasks[i].completed = true;
                changed = true;
            }
        }
        if (changed) {
            Game.saveGame();
        }
    },

    /* ----------------------------------------------------------
       领取任务奖励
       @param {number} taskSlotIndex - 任务槽位索引 0~2
       ---------------------------------------------------------- */
    claimTaskReward: function (taskSlotIndex) {
        var tasks = Game.data.sectTasks;
        if (!tasks || taskSlotIndex < 0 || taskSlotIndex >= tasks.length) return;

        var taskData = tasks[taskSlotIndex];
        if (!taskData.completed) {
            showToast('任务尚未完成，无法领取奖励！', 1500);
            return;
        }
        if (taskData.claimed) {
            showToast('奖励已领取，不可重复领取！', 1500);
            return;
        }

        var tpl = this.SECT_TASKS[taskData.taskIndex];
        Game.data.sectContribution += tpl.rewardContribution;
        Game.data.spiritStones += tpl.rewardStones;
        taskData.claimed = true;

        if (Game.dom && Game.dom.spiritStonesDisplay) {
            Game.dom.spiritStonesDisplay.textContent = formatNumber(Game.data.spiritStones);
        }
        Game.saveGame();
        Game.updatePower();

        showToast('领取成功！贡献+' + tpl.rewardContribution + ' 灵石+' + tpl.rewardStones, 2000);
        this.renderSect();
    },

    /* ----------------------------------------------------------
       外部调用：更新任务进度
       @param {string} type - 任务类型 'kill' / 'cultivate' / 'stones'
       @param {number} count - 增量
       ---------------------------------------------------------- */
    updateTaskProgress: function (type, count) {
        if (Game.data.sectIndex < 0) return; // 未加入宗门不更新
        this.checkDailyReset();

        var tasks = Game.data.sectTasks;
        if (!tasks || tasks.length === 0) return;

        var changed = false;
        for (var i = 0; i < tasks.length; i++) {
            if (tasks[i].completed || tasks[i].claimed) continue;
            var tpl = this.SECT_TASKS[tasks[i].taskIndex];
            if (tpl.type === type) {
                tasks[i].progress = Math.min(tasks[i].progress + count, tpl.targetCount);
                changed = true;
            }
        }

        if (changed) {
            this.checkTaskCompletion();
            Game.saveGame();
            // 如果宗门页面正打开，刷新任务UI
            var container = document.getElementById('sect-content');
            if (container && container.querySelector('.sect-task-card')) {
                this.renderTaskCardsInto(container.querySelector('.sect-task-list'));
            }
        }
    },

    /* ----------------------------------------------------------
       渲染任务列表到指定容器
       @param {Element} listContainer - 任务列表容器DOM
       ---------------------------------------------------------- */
    renderTaskCardsInto: function (listContainer) {
        if (!listContainer) return;
        var self = this;
        var tasks = Game.data.sectTasks;
        if (!tasks || tasks.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:12px;padding:8px;">暂无任务</p>';
            return;
        }

        var allClaimed = true;
        var html = '';

        for (var i = 0; i < tasks.length; i++) {
            var td = tasks[i];
            var tpl = this.SECT_TASKS[td.taskIndex];
            var progress = td.progress || 0;
            var target = tpl.targetCount;
            var pct = Math.min(Math.floor(progress / target * 100), 100);

            // 确定状态
            var statusClass = '';
            var statusText = '进行中';
            var btnHtml = '';

            if (td.claimed) {
                statusClass = 'claimed';
                statusText = '已完成';
                btnHtml = '<span class="sect-task-status-done">已完成</span>';
            } else if (td.completed) {
                statusClass = 'claimable';
                statusText = '可领取';
                btnHtml = '<button class="sect-task-claim-btn" data-slot="' + i + '">领取奖励</button>';
                allClaimed = false;
            } else {
                statusClass = 'in-progress';
                allClaimed = false;
            }

            html += '<div class="sect-task-card ' + statusClass + '">' +
                '<div class="sect-task-header">' +
                '<span class="sect-task-name">' + tpl.name + '</span>' +
                '<span class="sect-task-status">' + statusText + '</span>' +
                '</div>' +
                '<div class="sect-task-desc">' + tpl.desc + '</div>' +
                '<div class="sect-task-progress-wrap">' +
                '<div class="sect-task-progress-bar">' +
                '<div class="sect-task-progress-fill" style="width:' + pct + '%;"></div>' +
                '</div>' +
                '<span class="sect-task-progress-text">' + progress + '/' + target + '</span>' +
                '</div>' +
                '<div class="sect-task-rewards">' +
                '<span class="sect-task-reward">贡献+' + tpl.rewardContribution + '</span>' +
                '<span class="sect-task-reward">灵石+' + tpl.rewardStones + '</span>' +
                '</div>' +
                btnHtml +
                '</div>';
        }

        if (allClaimed) {
            html += '<p class="sect-task-all-done">今日任务已全部完成</p>';
        }

        listContainer.innerHTML = html;

        // 绑定领取按钮
        setTimeout(function () {
            var btns = listContainer.querySelectorAll('.sect-task-claim-btn');
            for (var b = 0; b < btns.length; b++) {
                btns[b].addEventListener('click', function (e) {
                    e.stopPropagation();
                    var slot = parseInt(this.getAttribute('data-slot'));
                    self.claimTaskReward(slot);
                });
            }
        }, 0);
    },

    /* ----------------------------------------------------------
       渲染任务区域（完整面板）
       ---------------------------------------------------------- */
    renderTasks: function () {
        var container = document.getElementById('sect-page-content');
        if (!container) return;

        // 检查每日重置
        this.checkDailyReset();
        var tasks = Game.data.sectTasks;

        // 如果还未生成任务，初始化
        if (!tasks || tasks.length === 0) {
            this.generateDailyTasks();
        }

        var html = '<div class="sect-task-section">' +
            '<div class="sect-task-section-title">宗门任务</div>' +
            '<div class="sect-task-list"></div>' +
            '</div>';

        // 如果已存在任务区域，只刷新卡片
        var existingList = container.querySelector('.sect-task-list');
        if (existingList) {
            this.renderTaskCardsInto(existingList);
            return;
        }

        // 追加到功法加成之后
        var bonusSection = container.querySelector('.sect-bonus-section');
        if (bonusSection) {
            bonusSection.insertAdjacentHTML('afterend', html);
        } else {
            container.insertAdjacentHTML('beforeend', html);
        }

        var listEl = container.querySelector('.sect-task-list');
        this.renderTaskCardsInto(listEl);
    },

    /* ----------------------------------------------------------
       渲染宗门页面
       ---------------------------------------------------------- */
    renderSect: function () {
        var container = document.getElementById('sect-page-content');
        if (!container) return;

        if (Game.data.sectIndex < 0) {
            this.renderSectSelection(container);
        } else {
            this.renderSectInfo(container);
        }
    },

    /* ----------------------------------------------------------
       渲染宗门页面（独立Tab入口，懒加载调用）
       ---------------------------------------------------------- */
    renderSectPage: function () {
        this.renderSect();
    },

    /* ----------------------------------------------------------
       渲染宗门选择界面（2x2网格）
       ---------------------------------------------------------- */
    renderSectSelection: function (container) {
        var self = this;

        var html = '<div style="text-align:center;margin-bottom:16px;">' +
            '<h3 style="color:var(--gold-main);font-family:var(--font-title);letter-spacing:2px;font-size:16px;margin-bottom:4px;">选择宗门</h3>' +
            '<p style="color:var(--text-muted);font-size:12px;">择一宗门，踏上修仙正途</p>' +
            '</div>';

        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';

        for (var i = 0; i < this.SECTS.length; i++) {
            var s = this.SECTS[i];
            html += '<div class="sect-card" style="border-color:' + s.color + ';">' +
                '<div class="sect-card-icon">' + s.icon + '</div>' +
                '<div class="sect-card-name" style="color:' + s.color + ';">' + s.name + '</div>' +
                '<div class="sect-card-desc">' + s.desc + '</div>' +
                '<div class="sect-card-bonus">' + self.formatBonus(s.bonus) + '</div>' +
                '<button class="sect-join-btn" data-sect="' + i + '" ' +
                'style="border-color:' + s.color + ';color:' + s.color + ';">加入宗门</button>' +
                '</div>';
        }

        html += '</div>';
        container.innerHTML = html;

        // 绑定加入按钮事件
        setTimeout(function () {
            var btns = container.querySelectorAll('.sect-join-btn');
            for (var j = 0; j < btns.length; j++) {
                btns[j].addEventListener('click', function (e) {
                    e.stopPropagation();
                    var idx = parseInt(this.getAttribute('data-sect'));
                    var sect = self.SECTS[idx];
                    if (confirm('确定要加入【' + sect.name + '】吗？\n\n' +
                        sect.desc + '\n功法加成：' + self.formatBonus(sect.bonus))) {
                        self.joinSect(idx);
                    }
                });
            }
        }, 0);
    },

    /* ----------------------------------------------------------
       渲染已加入宗门界面
       ---------------------------------------------------------- */
    renderSectInfo: function (container) {
        var sect = this.SECTS[Game.data.sectIndex];
        var rank = this.getRank();
        var contrib = Game.data.sectContribution || 0;
        var bonus = this.getSectBonus();

        // 计算下一级所需贡献和进度
        var nextRankContrib = null;
        var nextRankName = null;
        var progressPct = 100;
        var prevThreshold = 0;

        for (var i = 0; i < this.RANKS.length; i++) {
            if (this.RANKS[i].minContribution > contrib) {
                nextRankContrib = this.RANKS[i].minContribution;
                nextRankName = this.RANKS[i].name;
                break;
            }
        }

        if (nextRankContrib !== null) {
            for (var j = this.RANKS.length - 1; j >= 0; j--) {
                if (this.RANKS[j].minContribution <= contrib) {
                    prevThreshold = this.RANKS[j].minContribution;
                    break;
                }
            }
            progressPct = Math.floor((contrib - prevThreshold) / (nextRankContrib - prevThreshold) * 100);
        }

        var html = '';

        // 宗门头部
        html += '<div class="sect-info-header" style="border-color:' + sect.color + ';">' +
            '<div class="sect-info-icon">' + sect.icon + '</div>' +
            '<div class="sect-info-name" style="color:' + sect.color + ';">' + sect.name + '</div>' +
            '<div class="sect-info-desc">' + sect.desc + '</div>' +
            '</div>';

        // 职位信息
        html += '<div class="sect-rank-section">' +
            '<div class="sect-rank-label">当前职位</div>' +
            '<div class="sect-rank-badge">' + rank.name + '</div>' +
            '<div class="sect-rank-ratio">功法加成比例：' + Math.floor(rank.ratio * 100) + '%</div>' +
            '</div>';

        // 贡献进度条
        html += '<div class="sect-contrib-section">';
        if (nextRankContrib !== null) {
            html += '<div class="sect-contrib-label">' +
                '<span>贡献：' + formatNumber(contrib) + '</span>' +
                '<span>→ ' + nextRankName + '（' + formatNumber(nextRankContrib) + '）</span>' +
                '</div>' +
                '<div class="sect-contrib-bar">' +
                '<div class="sect-contrib-fill" style="width:' + progressPct + '%;"></div>' +
                '</div>';
        } else {
            html += '<div class="sect-contrib-label">' +
                '<span>贡献：' + formatNumber(contrib) + '</span>' +
                '<span style="color:#ffd700;">已达最高职位</span>' +
                '</div>' +
                '<div class="sect-contrib-bar">' +
                '<div class="sect-contrib-fill" style="width:100%;background:linear-gradient(90deg,#b8860b,#ffd700);"></div>' +
                '</div>';
        }
        html += '</div>';

        // 功法加成
        html += '<div class="sect-bonus-section">' +
            '<div class="sect-bonus-title">当前功法加成</div>' +
            '<div class="sect-bonus-grid">';

        var bonusItems = [
            { label: '攻击加成', value: bonus.atkPct, show: sect.bonus.atkPct > 0 },
            { label: '防御加成', value: bonus.defPct, show: sect.bonus.defPct > 0 },
            { label: '生命加成', value: bonus.hpPct, show: sect.bonus.hpPct > 0 },
            { label: '吸血加成', value: bonus.lifestealPct, show: sect.bonus.lifestealPct > 0 },
        ];

        for (var k = 0; k < bonusItems.length; k++) {
            var bi = bonusItems[k];
            if (bi.show) {
                html += '<div class="sect-bonus-item">' +
                    '<span class="sect-bonus-label">' + bi.label + '</span>' +
                    '<span class="sect-bonus-value">+' + bi.value + '%</span>' +
                    '</div>';
            }
        }

        html += '</div></div>';

        container.innerHTML = html;

        // 渲染任务区域（第4-2批）
        this.renderTasks();

        // 渲染宗门商店（第4-3批）
        this.renderShop();
    },

    /* ----------------------------------------------------------
       渲染宗门商店
       ---------------------------------------------------------- */
    renderShop: function () {
        var container = document.getElementById('sect-page-content');
        if (!container) return;

        var rank = this.getRank();
        var contrib = Game.data.sectContribution || 0;

        var html = '<div class="sect-shop-section">' +
            '<div class="sect-shop-title">宗门商店</div>' +
            '<div class="sect-shop-grid">';

        for (var i = 0; i < this.SECT_SHOP_ITEMS.length; i++) {
            var item = this.SECT_SHOP_ITEMS[i];
            var canBuy = contrib >= item.cost && rank.index >= item.minRank;
            var rankName = item.minRank < this.RANKS.length ? this.RANKS[item.minRank].name : '';
            var rankTag = rank.index < item.minRank
                ? '<span class="sect-shop-rank-tag" style="color:#e74c3c;">需' + rankName + '</span>'
                : '<span class="sect-shop-rank-tag" style="color:#2ecc71;">' + rankName + '可购</span>';

            html += '<div class="sect-shop-card' + (canBuy ? '' : ' disabled') + '">' +
                '<div class="sect-shop-item-name">' + item.name + '</div>' +
                '<div class="sect-shop-item-desc">' + item.desc + '</div>' +
                '<div class="sect-shop-item-footer">' +
                '<span class="sect-shop-item-cost">贡献 ' + item.cost + '</span>' +
                rankTag +
                '</div>' +
                '<button class="sect-shop-buy-btn" data-idx="' + i + '" ' +
                'style="width:100%;margin-top:6px;padding:4px 0;border-radius:6px;font-size:12px;cursor:' + (canBuy ? 'pointer' : 'not-allowed') + ';' +
                'border:1px solid ' + (canBuy ? '#d4a574' : '#444') + ';' +
                'background:' + (canBuy ? 'rgba(212,165,116,0.15)' : 'rgba(30,30,50,0.5)') + ';' +
                'color:' + (canBuy ? '#d4a574' : '#555') + ';">' +
                (canBuy ? '购买' : '不可购买') + '</button>' +
                '</div>';
        }

        html += '</div></div>';

        // 如果已存在商店区域，替换；否则追加
        var existing = container.querySelector('.sect-shop-section');
        if (existing) {
            existing.outerHTML = html;
        } else {
            container.insertAdjacentHTML('beforeend', html);
        }

        // 绑定购买按钮
        var self = this;
        setTimeout(function () {
            var btns = container.querySelectorAll('.sect-shop-buy-btn');
            for (var b = 0; b < btns.length; b++) {
                btns[b].addEventListener('click', function (e) {
                    e.stopPropagation();
                    var idx = parseInt(this.getAttribute('data-idx'));
                    self.buyShopItem(idx);
                });
            }
        }, 0);
    },

    /* ----------------------------------------------------------
       购买商店物品
       @param {number} itemIndex - 物品索引
       ---------------------------------------------------------- */
    buyShopItem: function (itemIndex) {
        var item = this.SECT_SHOP_ITEMS[itemIndex];
        if (!item) return;

        var rank = this.getRank();
        var contrib = Game.data.sectContribution || 0;

        if (rank.index < item.minRank) {
            showToast('职位不足，需要【' + this.RANKS[item.minRank].name + '】！', 2000);
            return;
        }
        if (contrib < item.cost) {
            showToast('贡献值不足！需要 ' + item.cost + ' 贡献', 2000);
            return;
        }

        // 扣除贡献
        Game.data.sectContribution -= item.cost;

        if (item.type === 'chest') {
            // 装备箱：生成随机装备（无视地图限制，quality 直接指定）
            if (Game.data.inventory.length >= 50) {
                showToast('背包已满，无法开启装备箱！', 2000);
                Game.data.sectContribution += item.cost; // 退款
                return;
            }
            // 直接调用 Equipment.generateEquip 的变体：用指定 quality 生成
            var equip = this._generateChestEquip(item.quality);
            Game.data.inventory.push(equip);
            Game.saveGame();
            Equipment.showDropCard(equip);
            showToast('开启「' + item.name + '」，获得『' + equip.name + '』！', 2500);
        } else if (item.type === 'buff') {
            // 丹药/符：存入 activeBuffs
            this.applyBuff(item.buffType, item.buffValue, item.duration || 0);
            showToast('使用「' + item.name + '」，效果已生效！', 2000);
        }

        Game.saveGame();
        this.renderSect();
    },

    /* ----------------------------------------------------------
       生成指定品质的装备箱内容（无视地图限制）
       @param {number} quality - 品质索引
       @returns {object} 装备对象
       ---------------------------------------------------------- */
    _generateChestEquip: function (quality) {
        var slotIndex = randInt(0, 5);
        var qualityObj = Equipment.QUALITIES ? Equipment.QUALITIES[quality] : { name: '凡品', color: '#cccccc', mult: 1.0 };
        // 从 Equipment 的 WORD_BANK 取词
        var wordBank = Equipment.WORD_BANK[slotIndex];
        var word = wordBank[randInt(0, wordBank.length - 1)];
        var slot = Equipment.SLOTS[slotIndex];

        // 基础属性（按品质倍率，地图系数固定为1）
        var mult = qualityObj.mult || 1.0;
        var atk = Math.floor(randInt(3, 8) * mult);
        var def = Math.floor(randInt(2, 6) * mult);
        var hp  = Math.floor(randInt(15, 40) * mult);

        return {
            id: Equipment.nextId++,
            name: qualityObj.name + '·' + word,
            quality: quality,
            slot: slotIndex,
            atk: atk,
            def: def,
            hp: hp,
            enhance: 0,
            mapIndex: 0,
            effects: Equipment.rollEffects(quality),
            setName: null,
            setSlotName: word,
        };
    },

    /* ----------------------------------------------------------
       应用增益 Buff
       @param {string} buffType - 增益类型
       @param {number} buffValue - 增益值
       @param {number} duration - 持续时间（ms），0 表示单次有效
       ---------------------------------------------------------- */
    applyBuff: function (buffType, buffValue, duration) {
        if (!Game.data.activeBuffs) Game.data.activeBuffs = [];

        if (buffType === 'enhanceRate') {
            // 强化符：单次有效，存入 enhanceRateBuff
            Game.data.enhanceRateBuff = (Game.data.enhanceRateBuff || 0) + buffValue;
            showToast('强化符已生效，下次强化成功率+' + buffValue + '%', 2000);
            return;
        }

        var expireAt = duration > 0 ? Date.now() + duration : 0;
        Game.data.activeBuffs.push({
            buffType: buffType,
            buffValue: buffValue,
            expireAt: expireAt,
        });

        // 如果到期时间 > 0，设置定时器自动清除
        if (duration > 0) {
            var self = this;
            setTimeout(function () {
                self.clearExpiredBuffs();
                self.renderSect();
            }, duration);
        }
    },

    /* ----------------------------------------------------------
       清除过期 Buff
       ---------------------------------------------------------- */
    clearExpiredBuffs: function () {
        if (!Game.data.activeBuffs) return;
        var now = Date.now();
        var active = [];
        for (var i = 0; i < Game.data.activeBuffs.length; i++) {
            var b = Game.data.activeBuffs[i];
            if (b.expireAt === 0 || b.expireAt > now) {
                active.push(b);
            }
        }
        Game.data.activeBuffs = active;
    },

    /* ----------------------------------------------------------
       获取当前生效的 Buff 加成汇总
       @returns {object} { atkPct, defPct, hpPct, enhanceRate }
       ---------------------------------------------------------- */
    getActiveBuffs: function () {
        this.clearExpiredBuffs();
        var result = { atkPct: 0, defPct: 0, hpPct: 0, enhanceRate: 0 };
        if (!Game.data.activeBuffs) return result;

        for (var i = 0; i < Game.data.activeBuffs.length; i++) {
            var b = Game.data.activeBuffs[i];
            if (b.buffType === 'atkBuff')   result.atkPct += b.buffValue * 100;
            if (b.buffType === 'allBuff')   { result.atkPct += b.buffValue * 100; result.defPct += b.buffValue * 100; result.hpPct += b.buffValue * 100; }
            if (b.buffType === 'enhanceRate') result.enhanceRate += b.buffValue;
        }

        // 强化符（单次有效，不在这里汇总，在强化时直接读 enhanceRateBuff）
        if (Game.data.enhanceRateBuff) {
            result.enhanceRate += Game.data.enhanceRateBuff;
        }

        return result;
    },

    /* ----------------------------------------------------------
       初始化：绑定宗门子Tab事件
       ---------------------------------------------------------- */
    init: function () {
        // 宗门系统已改为独立Tab懒加载，不再绑定子Tab事件
        // 初始化在 Game.switchTab('sect') 时触发
    },
};