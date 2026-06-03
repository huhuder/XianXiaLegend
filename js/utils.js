/* ============================================================
   js/utils.js — 纯工具函数
   不依赖任何外部状态，所有函数均为纯函数或自包含
   ============================================================ */

/* ----------------------------------------------------------
   常量定义
   ---------------------------------------------------------- */

/** 境界列表 */
const REALMS = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神', '合体', '大乘', '渡劫', '真仙'];

/* ----------------------------------------------------------
   数值工具
   ---------------------------------------------------------- */

/**
 * 境界系数 = 2^realmIndex
 * @param {number} realmIndex - 境界索引 0~9
 * @returns {number}
 */
function getRealmMultiplier(realmIndex) {
    return Math.pow(2, realmIndex);
}

/**
 * 随机整数 [min, max]
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 随机浮点数 [min, max)
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function random(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * 值限制在指定区间内
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

/**
 * 大数字格式化（如 12345 → "1.2万"）
 * @param {number} n
 * @returns {string}
 */
function formatNumber(n) {
    if (n < 10000) return n.toLocaleString();
    const wan = n / 10000;
    if (wan < 10000) return wan.toFixed(1).replace(/\.0$/, '') + '万';
    const yi = wan / 10000;
    return yi.toFixed(1).replace(/\.0$/, '') + '亿';
}

/* ----------------------------------------------------------
   数据结构工具
   ---------------------------------------------------------- */

/**
 * 深拷贝（仅支持 JSON 安全类型）
 * @param {*} obj
 * @returns {*}
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * 生成简易唯一 ID
 * @returns {string}
 */
function generateId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

/* ----------------------------------------------------------
   境界相关（纯计算，不依赖 gameData）
   ---------------------------------------------------------- */

/**
 * 获取突破所需经验
 * @param {number} realmIndex
 * @param {number} layer - 当前层数 0~9
 * @returns {number}
 */
function calcRequiredExp(realmIndex, layer) {
    const mult = getRealmMultiplier(realmIndex);
    const globalLevel = realmIndex * 10 + layer + 1;  // 全局等级 1~100，保证经验单调递增
    return 100 * mult * globalLevel;
}

/**
 * 获取境界显示名
 * @param {number} realmIndex
 * @param {number} layer
 * @returns {string}
 */
function getRealmDisplayName(realmIndex, layer) {
    return REALMS[realmIndex] + '·' + (layer + 1) + '层';
}

/**
 * 检查是否已达最高境界
 * @param {number} realmIndex
 * @param {number} layer
 * @returns {boolean}
 */
function isMaxRealm(realmIndex, layer) {
    return realmIndex >= REALMS.length - 1 && layer >= 9;
}

/**
 * 装备最大强化等级
 */
const EQUIP_MAX_ENHANCE = 15;

/**
 * 计算战力（不含特殊效果，基础公式）
 * @param {number} hp
 * @param {number} attack
 * @param {number} defense
 * @returns {number}
 */
function calcPower(hp, attack, defense) {
    return Math.floor(attack * 2.5 + defense * 1.8 + hp * 0.5);
}

/**
 * 获取等级显示
 * @param {number} realmIndex
 * @param {number} layer
 * @returns {string}
 */
function calcLevel(realmIndex, layer) {
    return 'Lv.' + (realmIndex * 10 + layer + 1);
}