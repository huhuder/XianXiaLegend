/* ============================================================
   js/skills.js — 技能系统
   依赖 Game.data（状态）、utils.js
   ============================================================ */

var Skills = {

    /* ----------------------------------------------------------
       通用技能（境界解锁，共10个）
       ---------------------------------------------------------- */
    COMMON_SKILLS: [
        { id: 'c0', name: '御风术',   realm: 0, type: 'damage',   desc: '150%攻击伤害',         value: 150, cd: 3,  icon: '🌪' },
        { id: 'c1', name: '凝气成罡', realm: 1, type: 'buff_atk', desc: '3tick攻击+30%',        value: 30,  cd: 8,  icon: '💨', duration: 3 },
        { id: 'c2', name: '天雷引',   realm: 2, type: 'aoe',      desc: '120%攻击+溅射50%',     value: 120, cd: 5,  icon: '⚡', splash: 50 },
        { id: 'c3', name: '灵盾术',   realm: 3, type: 'shield',   desc: '吸收200%攻击伤害',     value: 200, cd: 10, icon: '🛡', duration: 2 },
        { id: 'c4', name: '真火诀',   realm: 4, type: 'dot',      desc: '200%攻击+灼烧3tick',   value: 200, cd: 6,  icon: '🔥', dotValue: 10, dotDuration: 3 },
        { id: 'c5', name: '虚空步',   realm: 5, type: 'dodge',    desc: '2tick闪避+40%',        value: 40,  cd: 8,  icon: '💨', duration: 2 },
        { id: 'c6', name: '碎星击',   realm: 6, type: 'damage',   desc: '250%攻击,BOSS+50%',    value: 250, cd: 5,  icon: '💥', bossBonus: 50 },
        { id: 'c7', name: '万灵归宗', realm: 7, type: 'heal',     desc: '恢复30%最大生命',      value: 30,  cd: 12, icon: '💚' },
        { id: 'c8', name: '破虚斩',   realm: 8, type: 'execute',  desc: 'HP<25%时400%攻击',     value: 400, cd: 7,  icon: '🗡', threshold: 25 },
        { id: 'c9', name: '天人合一', realm: 9, type: 'buff_all', desc: '5tick全属性+50%',      value: 50,  cd: 15, icon: '☯', duration: 5 }
    ],

    /* ----------------------------------------------------------
       宗门专属技能（每宗门4个，按职位解锁）
       ---------------------------------------------------------- */
    SECT_SKILLS: {
        0: [ // 青云剑宗
            { id: 's0_0', name: '剑气斩',   rank: 0, type: 'damage',       desc: '180%攻击伤害',           value: 180, cd: 4,  icon: '⚔' },
            { id: 's0_1', name: '万剑诀',   rank: 1, type: 'multi_hit',   desc: '3段×60%攻击',           value: 60,  cd: 6,  icon: '⚔', hits: 3 },
            { id: 's0_2', name: '剑意',     rank: 2, type: 'crit_dmg_buff', desc: '3tick暴伤+80%',        value: 80,  cd: 8,  icon: '✨', duration: 3 },
            { id: 's0_3', name: '御剑术',   rank: 3, type: 'extra_attack', desc: '5tick攻击次数+1',       value: 1,   cd: 12, icon: '⚔', duration: 5 }
        ],
        1: [ // 太虚道宗
            { id: 's1_0', name: '掌心雷',   rank: 0, type: 'stun',         desc: '150%攻击+麻痹1tick',    value: 150, cd: 4,  icon: '⚡', stunDuration: 1 },
            { id: 's1_1', name: '金光咒',   rank: 1, type: 'shield',       desc: '吸收攻击×3伤害',       value: 300, cd: 8,  icon: '🛡', duration: 3 },
            { id: 's1_2', name: '五雷正法', rank: 2, type: 'execute',      desc: 'HP<40%时350%攻击',     value: 350, cd: 7,  icon: '⚡', threshold: 40 },
            { id: 's1_3', name: '天罡阵',   rank: 3, type: 'aoe',          desc: '150%攻击AoE',          value: 150, cd: 6,  icon: '🌀', splash: 60 }
        ],
        2: [ // 玄铁盾门
            { id: 's2_0', name: '铁壁',     rank: 0, type: 'damage_reduce', desc: '3tick减伤30%',         value: 30,  cd: 5,  icon: '🛡', duration: 3 },
            { id: 's2_1', name: '嘲讽',     rank: 1, type: 'counter',      desc: '反伤50%,2tick',         value: 50,  cd: 8,  icon: '💢', duration: 2 },
            { id: 's2_2', name: '破釜',     rank: 2, type: 'sacrifice',    desc: 'HP<40%攻击×2',         value: 200, cd: 6,  icon: '💥', hpThreshold: 40 },
            { id: 's2_3', name: '不动如山', rank: 3, type: 'block',        desc: '3tick格挡80%',         value: 80,  cd: 10, icon: '🏔', duration: 3 }
        ],
        3: [ // 幽冥魔教
            { id: 's3_0', name: '噬魂',     rank: 0, type: 'lifesteal',    desc: '150%攻击+吸血30%',     value: 150, cd: 4,  icon: '💀', lifestealPct: 30 },
            { id: 's3_1', name: '暗影步',   rank: 1, type: 'dodge',        desc: '3tick闪避+40%',        value: 40,  cd: 6,  icon: '🌑', duration: 3 },
            { id: 's3_2', name: '天魔解体', rank: 2, type: 'sacrifice',    desc: '耗15%HP换300%伤害',   value: 300, cd: 8,  icon: '💀', hpCost: 15 },
            { id: 's3_3', name: '血祭',     rank: 3, type: 'passive',      desc: '击杀回复50%HP',        value: 50,  cd: 0,  icon: '🩸' }
        ]
    },

    /* ----------------------------------------------------------
       获取玩家已解锁的通用技能
       ---------------------------------------------------------- */
    getUnlockedCommonSkills: function () {
        var realm = Game.data.realmIndex;
        var unlocked = [];
        for (var i = 0; i < this.COMMON_SKILLS.length; i++) {
            if (this.COMMON_SKILLS[i].realm <= realm) {
                unlocked.push(this.COMMON_SKILLS[i]);
            }
        }
        return unlocked;
    },

    /* ----------------------------------------------------------
       获取玩家已解锁的宗门技能
       ---------------------------------------------------------- */
    getUnlockedSectSkills: function () {
        var sectIdx = Game.data.sectIndex;
        if (sectIdx < 0) return [];
        var rankInfo = Sect.getRank();
        var rankIdx = rankInfo.index;
        var pool = this.SECT_SKILLS[sectIdx] || [];
        var unlocked = [];
        for (var i = 0; i < pool.length; i++) {
            if (pool[i].rank <= rankIdx) {
                unlocked.push(pool[i]);
            }
        }
        return unlocked;
    },

    /* ----------------------------------------------------------
       获取所有已解锁技能
       ---------------------------------------------------------- */
    getAllUnlockedSkills: function () {
        return this.getUnlockedCommonSkills().concat(this.getUnlockedSectSkills());
    },

    /* ----------------------------------------------------------
       获取技能槽数量
       ---------------------------------------------------------- */
    getSlotCount: function () {
        return (Game.data.skillSlots || 2);
    },

    /* ----------------------------------------------------------
       获取已装备技能列表
       ---------------------------------------------------------- */
    getEquippedSkills: function () {
        return Game.data.equippedSkills || [];
    },

    /* ----------------------------------------------------------
       装备技能到指定槽位
       ---------------------------------------------------------- */
    equipSkill: function (skillId, slotIndex) {
        var equipped = this.getEquippedSkills();
        // 检查是否已装备
        for (var i = 0; i < equipped.length; i++) {
            if (equipped[i] === skillId) {
                showToast('该技能已装备！', 1500);
                return false;
            }
        }
        // 检查槽位
        if (slotIndex < 0 || slotIndex >= this.getSlotCount()) {
            showToast('无效的技能槽位！', 1500);
            return false;
        }
        // 确保数组长度
        while (equipped.length <= slotIndex) {
            equipped.push(null);
        }
        equipped[slotIndex] = skillId;
        Game.data.equippedSkills = equipped;
        Game.saveGame();
        return true;
    },

    /* ----------------------------------------------------------
       卸下技能
       ---------------------------------------------------------- */
    unequipSkill: function (slotIndex) {
        var equipped = this.getEquippedSkills();
        if (slotIndex >= 0 && slotIndex < equipped.length) {
            equipped[slotIndex] = null;
            // 清理尾部null
            while (equipped.length > 0 && equipped[equipped.length - 1] === null) {
                equipped.pop();
            }
            Game.data.equippedSkills = equipped;
            Game.saveGame();
        }
    },

    /* ----------------------------------------------------------
       根据ID查找技能定义（已应用等级倍率）
       ---------------------------------------------------------- */
    findSkillById: function (skillId) {
        var raw = this.findSkillByIdRaw(skillId);
        if (!raw) return null;
        var lv = this.getSkillLevel(skillId);
        if (lv === 1) return raw;
        var mult = this.getLevelMultiplier(lv);
        var copy = {};
        for (var k in raw) { copy[k] = raw[k]; }
        copy.value = Math.floor(raw.value * mult);
        copy.level = lv;
        if (copy.dotValue) copy.dotValue = Math.floor(raw.dotValue * mult);
        if (copy.lifestealPct) copy.lifestealPct = Math.floor(raw.lifestealPct * mult);
        if (copy.splash) copy.splash = Math.floor(raw.splash * mult);
        if (copy.bossBonus) copy.bossBonus = Math.floor(raw.bossBonus * mult);
        return copy;
    },

    /* ----------------------------------------------------------
       获取技能冷却剩余tick
       ---------------------------------------------------------- */
    getCooldown: function (skillId) {
        var cds = Game.data.skillCooldowns || {};
        return cds[skillId] || 0;
    },

    /* ----------------------------------------------------------
       设置技能冷却
       ---------------------------------------------------------- */
    setCooldown: function (skillId, ticks) {
        if (!Game.data.skillCooldowns) Game.data.skillCooldowns = {};
        Game.data.skillCooldowns[skillId] = ticks;
    },

    /* ----------------------------------------------------------
       每tick减少所有技能冷却
       ---------------------------------------------------------- */
    tickCooldowns: function () {
        var cds = Game.data.skillCooldowns || {};
        var changed = false;
        for (var key in cds) {
            if (cds[key] > 0) {
                cds[key]--;
                changed = true;
            }
        }
        if (changed) Game.data.skillCooldowns = cds;
    },

    /* ----------------------------------------------------------
       获取当前可释放的技能（CD就绪的已装备技能）
       ---------------------------------------------------------- */
    getReadySkills: function () {
        var equipped = this.getEquippedSkills();
        var ready = [];
        for (var i = 0; i < equipped.length; i++) {
            var skillId = equipped[i];
            if (!skillId) continue;
            if (this.getCooldown(skillId) <= 0) {
                var skill = this.findSkillById(skillId);
                if (skill) ready.push(skill);
            }
        }
        return ready;
    },

    /* ----------------------------------------------------------
       获取当前激活的Buff列表
       ---------------------------------------------------------- */
    getActiveBuffs: function () {
        return Game.data.skillBuffs || [];
    },

    /* ----------------------------------------------------------
       添加Buff
       ---------------------------------------------------------- */
    addBuff: function (buffType, value, duration) {
        if (!Game.data.skillBuffs) Game.data.skillBuffs = [];
        Game.data.skillBuffs.push({
            type: buffType,
            value: value,
            remaining: duration
        });
    },

    /* ----------------------------------------------------------
       每tick减少Buff持续时间，移除过期Buff
       ---------------------------------------------------------- */
    tickBuffs: function () {
        var buffs = Game.data.skillBuffs || [];
        var active = [];
        for (var i = 0; i < buffs.length; i++) {
            buffs[i].remaining--;
            if (buffs[i].remaining > 0) {
                active.push(buffs[i]);
            }
        }
        Game.data.skillBuffs = active;
    },

    /* ----------------------------------------------------------
       查询当前Buff总值
       ---------------------------------------------------------- */
    getBuffValue: function (buffType) {
        var buffs = Game.data.skillBuffs || [];
        var total = 0;
        for (var i = 0; i < buffs.length; i++) {
            if (buffs[i].type === buffType) {
                total += buffs[i].value;
            }
        }
        return total;
    },

    /* ----------------------------------------------------------
       检查是否有某类型Buff激活
       ---------------------------------------------------------- */
    hasBuff: function (buffType) {
        var buffs = Game.data.skillBuffs || [];
        for (var i = 0; i < buffs.length; i++) {
            if (buffs[i].type === buffType) return true;
        }
        return false;
    },

    /* ----------------------------------------------------------
       获取当前护盾值
       ---------------------------------------------------------- */
    getShield: function () {
        return Game.data.skillShield || 0;
    },

    /* ----------------------------------------------------------
       设置护盾值
       ---------------------------------------------------------- */
    setShield: function (value) {
        Game.data.skillShield = Math.max(0, value);
    },

    /* ----------------------------------------------------------
       护盾吸收伤害，返回剩余伤害
       ---------------------------------------------------------- */
    absorbDamage: function (dmg) {
        var shield = this.getShield();
        if (shield <= 0) return dmg;
        if (shield >= dmg) {
            this.setShield(shield - dmg);
            return 0;
        }
        this.setShield(0);
        return dmg - shield;
    },

    /* ----------------------------------------------------------
       获取DoT伤害（灼烧等）
       ---------------------------------------------------------- */
    getDotDamage: function () {
        var buffs = Game.data.skillBuffs || [];
        var total = 0;
        for (var i = 0; i < buffs.length; i++) {
            if (buffs[i].type === 'dot') {
                total += buffs[i].value;
            }
        }
        return total;
    },

    /* ----------------------------------------------------------
       渲染技能页面
       ---------------------------------------------------------- */
    render: function () {
        var container = document.getElementById('skills-content');
        if (!container) return;

        var slotCount = this.getSlotCount();
        var equipped = this.getEquippedSkills();
        var html = '';

        // 技能槽
        html += '<div class="skills-section-title">技能槽 <span class="skills-count">' + slotCount + '个</span></div>';
        html += '<div class="skills-slots">';
        for (var s = 0; s < slotCount; s++) {
            var eqSkillId = equipped[s] || null;
            var eqSkill = eqSkillId ? this.findSkillById(eqSkillId) : null;
            var cd = eqSkillId ? this.getCooldown(eqSkillId) : 0;
            var cdPct = eqSkill ? (1 - cd / eqSkill.cd) * 100 : 0;
            html += '<div class="skill-slot' + (eqSkill ? ' filled' : '') + '" data-slot="' + s + '">';
            if (eqSkill) {
                html += '<div class="skill-slot-cd-bar" style="width:' + cdPct + '%"></div>';
                html += '<span class="skill-slot-icon">' + eqSkill.icon + '</span>';
                html += '<span class="skill-slot-name">' + eqSkill.name + '</span>';
                if (cd > 0) {
                    html += '<span class="skill-slot-cd">CD:' + cd + '</span>';
                } else {
                    html += '<span class="skill-slot-ready">就绪</span>';
                }
                html += '<button class="skill-unequip-btn" onclick="Skills.unequipSkill(' + s + ');Skills.render();">✕</button>';
            } else {
                html += '<span class="skill-slot-empty">空槽位</span>';
            }
            html += '</div>';
        }
        html += '</div>';

        // 通用技能
        var commonSkills = this.getUnlockedCommonSkills();
        html += this._renderSkillGroup('通用技能', commonSkills, equipped, 'gold');

        // 宗门技能
        var sectSkills = this.getUnlockedSectSkills();
        if (sectSkills.length > 0) {
            html += this._renderSkillGroup('宗门技能', sectSkills, equipped, 'purple');
        }

        container.innerHTML = html;
    },

    /* ----------------------------------------------------------
       渲染技能分组
       ---------------------------------------------------------- */
    _renderSkillGroup: function (title, skills, equipped, colorClass) {
        if (skills.length === 0) return '';
        var html = '';
        html += '<div class="skills-section-title skills-section-' + colorClass + '">' + title + ' <span class="skills-count">' + skills.length + '个</span></div>';
        html += '<div class="skills-list">';
        for (var k = 0; k < skills.length; k++) {
            var sk = skills[k];
            var skAdjusted = this.findSkillById(sk.id) || sk;
            var isEquipped = equipped.indexOf(sk.id) >= 0;
            var skCd = this.getCooldown(sk.id);
            var cdPct = (1 - skCd / sk.cd) * 100;
            var typeLabel = this._getTypeLabel(skAdjusted.type);
            var lv = this.getSkillLevel(sk.id);
            var maxLv = this.getMaxLevel();
            var upgradeCost = lv < maxLv ? this.getUpgradeCost(sk.id) : 0;
            html += '<div class="skill-card' + (isEquipped ? ' equipped' : '') + '" onclick="Skills._toggleDetail(event, \'' + sk.id + '\')">';
            html += '<div class="skill-card-left">';
            html += '<span class="skill-card-icon">' + skAdjusted.icon + '</span>';
            html += '<div class="skill-card-info">';
            html += '<div class="skill-card-name">' + skAdjusted.name + ' <span class="skill-lv-tag">Lv.' + lv + '</span></div>';
            html += '<div class="skill-card-meta"><span class="skill-type-tag skill-type-' + skAdjusted.type + '">' + typeLabel + '</span> CD:' + skAdjusted.cd + 'tick</div>';
            html += '<div class="skill-card-detail" id="skill-detail-' + sk.id + '" style="display:none">' + this._getDetailText(skAdjusted) + '</div>';
            html += '</div>';
            html += '</div>';
            html += '<div class="skill-card-right">';
            if (skCd > 0) {
                html += '<div class="skill-card-cd-bar" style="width:' + cdPct + '%"></div>';
                html += '<span class="skill-card-cd-text">CD:' + skCd + '</span>';
            }
            if (lv < maxLv) {
                html += '<button class="skill-upgrade-btn" onclick="event.stopPropagation();Skills.upgradeSkill(\'' + sk.id + '\');Skills.render();">升级 ' + formatNumber(upgradeCost) + '灵</button>';
            } else {
                html += '<span class="skill-max-tag">MAX</span>';
            }
            if (!isEquipped) {
                html += '<button class="skill-equip-btn" onclick="event.stopPropagation();Skills.equipSkill(\'' + sk.id + '\',' + (equipped.indexOf(null) >= 0 ? equipped.indexOf(null) : 0) + ');Skills.render();">装备</button>';
            } else {
                html += '<span class="skill-equipped-tag">已装备</span>';
            }
            html += '</div>';
            html += '</div>';
        }
        html += '</div>';
        return html;
    },

    /* ----------------------------------------------------------
       展开/收起技能详情
       ---------------------------------------------------------- */
    _toggleDetail: function (event, skillId) {
        var detail = document.getElementById('skill-detail-' + skillId);
        if (!detail) return;
        detail.style.display = (detail.style.display === 'none' || detail.style.display === '') ? 'block' : 'none';
    },

    /* ----------------------------------------------------------
       获取技能类型中文标签
       ---------------------------------------------------------- */
    _getTypeLabel: function (type) {
        var map = {
            'damage': '伤害', 'aoe': 'AoE', 'multi_hit': '多段', 'execute': '斩杀',
            'dot': '灼烧', 'stun': '麻痹', 'lifesteal': '吸血', 'sacrifice': '牺牲',
            'heal': '回复', 'shield': '护盾', 'buff_atk': '攻击↑', 'buff_all': '全能↑',
            'dodge': '闪避↑', 'crit_dmg_buff': '暴伤↑', 'extra_attack': '连击↑',
            'damage_reduce': '减伤↑', 'counter': '反伤', 'block': '格挡',
            'passive': '被动'
        };
        return map[type] || type;
    },

    /* ----------------------------------------------------------
       获取技能详细描述
       ---------------------------------------------------------- */
    _getDetailText: function (sk) {
        var details = [];
        switch (sk.type) {
            case 'damage':
                details.push('造成 ' + sk.value + '% 攻击力的直接伤害');
                if (sk.bossBonus) details.push('对BOSS额外+' + sk.bossBonus + '%伤害');
                break;
            case 'aoe':
                details.push('造成 ' + sk.value + '% 攻击力伤害');
                details.push('溅射 ' + (sk.splash || 50) + '% 额外伤害');
                break;
            case 'multi_hit':
                details.push('发动 ' + (sk.hits || 3) + ' 段攻击');
                details.push('每段 ' + sk.value + '% 攻击力');
                break;
            case 'execute':
                details.push('敌方HP<' + (sk.threshold || 25) + '% 时');
                details.push('造成 ' + sk.value + '% 攻击力伤害');
                details.push('HP高于斩杀线时伤害减半');
                break;
            case 'dot':
                details.push('造成 ' + sk.value + '% 攻击力直接伤害');
                details.push('附加灼烧 ' + (sk.dotDuration || 3) + ' tick');
                break;
            case 'stun':
                details.push('造成 ' + sk.value + '% 攻击力伤害');
                details.push('麻痹 ' + (sk.stunDuration || 1) + ' tick（怪物跳过攻击）');
                break;
            case 'lifesteal':
                details.push('造成 ' + sk.value + '% 攻击力伤害');
                details.push('吸血 ' + (sk.lifestealPct || 30) + '%');
                break;
            case 'sacrifice':
                details.push('消耗 ' + (sk.hpCost || 15) + '% 当前生命');
                details.push('造成 ' + sk.value + '% 攻击力伤害');
                break;
            case 'heal':
                details.push('恢复 ' + sk.value + '% 最大生命');
                break;
            case 'shield':
                details.push('护盾吸收 ' + sk.value + '% 攻击力的伤害');
                details.push('持续 ' + (sk.duration || 2) + ' tick');
                break;
            case 'buff_atk':
                details.push('攻击力 +' + sk.value + '%');
                details.push('持续 ' + (sk.duration || 3) + ' tick');
                break;
            case 'buff_all':
                details.push('全属性 +' + sk.value + '%');
                details.push('持续 ' + (sk.duration || 5) + ' tick');
                break;
            case 'dodge':
                details.push('闪避率 +' + sk.value + '%');
                details.push('持续 ' + (sk.duration || 2) + ' tick');
                break;
            case 'crit_dmg_buff':
                details.push('暴击伤害 +' + sk.value + '%');
                details.push('持续 ' + (sk.duration || 3) + ' tick');
                break;
            case 'extra_attack':
                details.push('每tick额外攻击 +' + sk.value + ' 次');
                details.push('持续 ' + (sk.duration || 5) + ' tick');
                break;
            case 'damage_reduce':
                details.push('受到伤害 -' + sk.value + '%');
                details.push('持续 ' + (sk.duration || 3) + ' tick');
                break;
            case 'counter':
                details.push('受击时 ' + sk.value + '% 概率反击');
                details.push('持续 ' + (sk.duration || 2) + ' tick');
                break;
            case 'block':
                details.push(sk.value + '% 概率格挡（减免80%伤害）');
                details.push('持续 ' + (sk.duration || 3) + ' tick');
                break;
            case 'passive':
                details.push('击杀敌人时回复 ' + sk.value + '% 最大生命');
                break;
            default:
                details.push('造成 ' + sk.value + '% 攻击力伤害');
        }
        return details.join('<br>');
    },

    /* ============================================================
       技能升级系统
       ============================================================ */

    /* 获取技能等级 */
    getSkillLevel: function (skillId) {
        if (!Game.data.skillLevels) Game.data.skillLevels = {};
        return Game.data.skillLevels[skillId] || 1;
    },

    /* 等级倍率：Lv1=1.0, Lv2=1.15, ..., Lv10=2.35（每级+15%） */
    getLevelMultiplier: function (level) {
        return 1 + (level - 1) * 0.15;
    },

    /* 升级消耗（灵石） */
    getUpgradeCost: function (skillId) {
        var lv = this.getSkillLevel(skillId);
        var skill = this.findSkillByIdRaw(skillId);
        if (!skill) return 999999;
        return Math.floor((lv * lv) * 50 * (skill.realm !== undefined ? 1 : 1.2));
    },

    /* 获取最大等级 */
    getMaxLevel: function () {
        return 10;
    },

    /* 执行升级 */
    upgradeSkill: function (skillId) {
        var currentLv = this.getSkillLevel(skillId);
        if (currentLv >= this.getMaxLevel()) {
            showToast('已达满级！', 1500);
            return false;
        }
        var cost = this.getUpgradeCost(skillId);
        if ((Game.data.spiritStones || 0) < cost) {
            showToast('灵石不足（需 ' + formatNumber(cost) + '）', 2000);
            return false;
        }
        Game.data.spiritStones -= cost;
        if (!Game.data.skillLevels) Game.data.skillLevels = {};
        Game.data.skillLevels[skillId] = currentLv + 1;
        Game.saveGame();
        showToast('技能升至 Lv.' + (currentLv + 1) + '！', 2000);
        return true;
    },

    /* 查找技能原始定义（不乘等级倍率） */
    findSkillByIdRaw: function (skillId) {
        for (var i = 0; i < this.COMMON_SKILLS.length; i++) {
            if (this.COMMON_SKILLS[i].id === skillId) return this.COMMON_SKILLS[i];
        }
        for (var key in this.SECT_SKILLS) {
            var pool = this.SECT_SKILLS[key];
            for (var j = 0; j < pool.length; j++) {
                if (pool[j].id === skillId) return pool[j];
            }
        }
        return null;
    }

};
