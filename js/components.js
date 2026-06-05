/* ============================================================
   js/components.js — 可复用 UI 组件
   所有函数自包含，通过参数接收所需 DOM 引用
   ============================================================ */

/* ----------------------------------------------------------
   飘字动效
   ---------------------------------------------------------- */

/**
 * 显示飘字
 * @param {HTMLElement} container - 飘字容器
 * @param {string} text - 显示文字
 * @param {string} cssClass - CSS 类名（'exp' / 'stone'）
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 */
function showFloatText(container, text, cssClass, x, y, color) {
    const el = document.createElement('div');
    el.className = 'float-text ' + (cssClass || '');
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    if (color) {
        el.style.color = color;
        el.style.textShadow = '0 0 10px ' + color;
    }
    container.appendChild(el);
    el.addEventListener('animationend', function () { el.remove(); });
}

/**
 * 在修炼按钮上方显示修炼飘字
 * @param {HTMLElement} btnEl - 修炼按钮元素
 * @param {HTMLElement} container - 飘字容器
 * @param {number} expGain - 经验获取
 * @param {number} stoneGain - 灵石获取
 */
function showCultivateFloat(btnEl, container, expGain, stoneGain, methodLabel, color) {
    var rect = btnEl.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top;
    if (methodLabel) {
        showFloatText(container, '【' + methodLabel + '】', 'method', cx - 30, cy - 30, color);
    }
    showFloatText(container, '+ ' + expGain + ' 经验', 'exp', cx - 40 - randInt(0, 20), cy);
    showFloatText(container, '+ ' + stoneGain + ' 灵石', 'stone', cx + 10 + randInt(0, 20), cy + 10);
}

/* ----------------------------------------------------------
   粒子光效
   ---------------------------------------------------------- */

/**
 * 在指定元素中心生成粒子爆发效果
 * @param {HTMLElement} containerEl - 目标元素
 * @param {number} count - 粒子数量
 */
function spawnParticles(containerEl, count) {
    var rect = containerEl.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    for (var i = 0; i < count; i++) {
        var particle = document.createElement('div');
        particle.className = 'particle';
        var angle = Math.random() * Math.PI * 2;
        var dist = 30 + Math.random() * 50;
        var dx = Math.cos(angle) * dist;
        var dy = Math.sin(angle) * dist;
        particle.style.setProperty('--dx', dx + 'px');
        particle.style.setProperty('--dy', dy + 'px');
        particle.style.left = cx + 'px';
        particle.style.top = cy + 'px';
        particle.style.width = (3 + Math.random() * 5) + 'px';
        particle.style.height = particle.style.width;
        document.body.appendChild(particle);
        particle.addEventListener('animationend', function () { particle.remove(); });
    }
}

/* ----------------------------------------------------------
   全屏金光特效
   ---------------------------------------------------------- */

/**
 * 触发全屏金光特效（突破境界时）
 * @param {HTMLElement} flashEl - 金光元素
 */
function triggerGoldenFlash(flashEl) {
    flashEl.classList.remove('flash');
    void flashEl.offsetWidth; // 强制回流，确保动画重新触发
    flashEl.classList.add('flash');
}

/* ----------------------------------------------------------
   通用进度条
   ---------------------------------------------------------- */

/**
 * 创建进度条元素
 * @param {number} value - 当前值
 * @param {number} max - 最大值
 * @param {string} color - 颜色（CSS 颜色值或渐变）
 * @param {string} label - 标签文字
 * @returns {HTMLElement}
 */
function createProgressBar(value, max, color, label) {
    var wrapper = document.createElement('div');
    wrapper.className = 'progress-bar-wrapper';
    wrapper.style.cssText = 'background:rgba(0,0,0,0.3);border-radius:8px;height:18px;overflow:hidden;margin:4px 0;';

    var fill = document.createElement('div');
    var pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    fill.style.cssText = 'height:100%;background:' + color + ';border-radius:8px;transition:width 0.4s ease;width:' + pct + '%;';
    wrapper.appendChild(fill);

    if (label) {
        var labelEl = document.createElement('div');
        labelEl.style.cssText = 'text-align:center;font-size:11px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.7);line-height:18px;margin-top:-18px;position:relative;';
        labelEl.textContent = label;
        wrapper.appendChild(labelEl);
    }

    return wrapper;
}

/* ----------------------------------------------------------
   按钮
   ---------------------------------------------------------- */

/**
 * 创建按钮
 * @param {string} text - 按钮文字
 * @param {string} className - CSS 类名
 * @param {Function} onClick - 点击回调
 * @returns {HTMLElement}
 */
function createButton(text, className, onClick) {
    var btn = document.createElement('button');
    btn.className = className || '';
    btn.textContent = text;
    if (onClick) btn.addEventListener('click', onClick);
    return btn;
}

/* ----------------------------------------------------------
   Toast 提示
   ---------------------------------------------------------- */

/**
 * 显示顶部 Toast 提示
 * @param {string} message
 * @param {number} duration - 显示毫秒数，默认 2000
 */
function showToast(message, duration) {
    duration = duration || 2000;
    var toast = document.createElement('div');
    toast.style.cssText =
        'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
        'background:rgba(0,0,0,0.85);color:#ffd700;padding:10px 24px;' +
        'border-radius:20px;font-size:14px;z-index:99999;' +
        'border:1px solid rgba(184,134,11,0.4);' +
        'animation:fadeInOut ' + (duration / 1000) + 's ease forwards;';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () { toast.remove(); }, duration);
}

/* ----------------------------------------------------------
   通用卡片
   ---------------------------------------------------------- */

/**
 * 创建通用卡片
 * @param {string} title - 标题
 * @param {string|HTMLElement} content - 内容
 * @param {string|HTMLElement} footer - 底部（可选）
 * @returns {HTMLElement}
 */
function createCard(title, content, footer) {
    var card = document.createElement('div');
    card.style.cssText =
        'background:rgba(15,52,96,0.4);border:1px solid rgba(184,134,11,0.2);' +
        'border-radius:12px;padding:14px 16px;margin-bottom:12px;';

    if (title) {
        var h3 = document.createElement('h3');
        h3.style.cssText = 'font-size:14px;color:#d4a574;margin-bottom:10px;letter-spacing:2px;';
        h3.innerHTML = title;
        card.appendChild(h3);
    }

    if (typeof content === 'string') {
        var div = document.createElement('div');
        div.style.cssText = 'font-size:13px;color:#a09080;';
        div.innerHTML = content;
        card.appendChild(div);
    } else if (content) {
        card.appendChild(content);
    }

    if (footer) {
        var ft = document.createElement('div');
        ft.style.cssText = 'margin-top:10px;border-top:1px solid rgba(184,134,11,0.15);padding-top:8px;';
        if (typeof footer === 'string') ft.innerHTML = footer;
        else ft.appendChild(footer);
        card.appendChild(ft);
    }

    return card;
}