/* ============================================================
   折叠式搜索分类标签栏
   只保留第一行，其余折叠；点「展开全部 / 收起」切换
   ============================================================ */
(function () {
  'use strict';

  var CONFIG = {
    keepActiveVisible: true,   // 当前选中的分类被折叠时自动展开（避免高亮看不见）
    remember: true,            // 记住展开/收起状态
    collapsedHint: '展开全部',
    expandedHint: '收起'
  };

  var TABS_SEL = '.search-tabs';
  var BTN_SEL = '.category-btn';
  var STORE_KEY = 'navhub:tabsExpanded';

  var tabs = null, wrap = null, toggle = null;
  var labelEl = null, countEl = null;
  var expanded = false, lastWidth = -1, rafId = 0;

  if (CONFIG.remember) {
    try { expanded = localStorage.getItem(STORE_KEY) === '1'; } catch (e) {}
  }

  /* ---------- 工具 ---------- */
  function schedule() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      layout();
    });
  }

  function getButtons() {
    return tabs ? Array.prototype.slice.call(tabs.querySelectorAll(BTN_SEL)) : [];
  }

  function saveState() {
    if (!CONFIG.remember) return;
    try { localStorage.setItem(STORE_KEY, expanded ? '1' : '0'); } catch (e) {}
  }

  /* ---------- 创建切换按钮 ---------- */
  function ensureToggle() {
    if (wrap && wrap.isConnected) return;

    wrap = document.createElement('div');
    wrap.className = 'tabs-toggle-wrap';

    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tabs-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML =
      '<span class="tabs-toggle-label">' + CONFIG.collapsedHint + '</span>' +
      '<span class="tabs-toggle-count"></span>' +
      '<svg class="tabs-toggle-chevron" viewBox="0 0 24 24" width="12" height="12" ' +
      'fill="none" stroke="currentColor" stroke-width="2.5" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<polyline points="6 9 12 15 18 9"></polyline></svg>';

    labelEl = toggle.querySelector('.tabs-toggle-label');
    countEl = toggle.querySelector('.tabs-toggle-count');

    toggle.addEventListener('click', function () {
      expanded = !expanded;
      saveState();
      layout();
    });

    wrap.appendChild(toggle);
    tabs.insertAdjacentElement('afterend', wrap);
  }

  /* ---------- 核心：测量第一行 + 应用折叠 ---------- */
  function layout() {
    if (!tabs || !tabs.isConnected) {
      tabs = document.querySelector(TABS_SEL);
      if (!tabs) return;
    }

    var list = getButtons();
    if (!list.length) {
      if (wrap) wrap.style.display = 'none';
      return;
    }

    ensureToggle();

    // 先全部显示，才能测得准
    list.forEach(function (b) { b.classList.remove('is-hidden'); });

    var firstTop = list[0].offsetTop;
    var overflow = list.filter(function (b) { return b.offsetTop > firstTop + 1; });

    // 只有一行：不需要折叠
    if (!overflow.length) {
      wrap.style.display = 'none';
      tabs.classList.remove('is-collapsed');
      return;
    }
    wrap.style.display = '';

    // 记忆的选中项不在第一行 → 自动展开，否则高亮会"消失"
    if (CONFIG.keepActiveVisible && !expanded) {
      var active = tabs.querySelector(BTN_SEL + '.active');
      if (active && overflow.indexOf(active) !== -1) expanded = true;
    }

    var collapsed = !expanded;
    overflow.forEach(function (b) { b.classList.toggle('is-hidden', collapsed); });
    tabs.classList.toggle('is-collapsed', collapsed);

    toggle.setAttribute('aria-expanded', String(expanded));
    labelEl.textContent = expanded ? CONFIG.expandedHint : CONFIG.collapsedHint;
    countEl.textContent = expanded ? '' : '+' + overflow.length;
  }

  /* ---------- 初始化 ---------- */
  function boot() {
    tabs = document.querySelector(TABS_SEL);
    if (!tabs) {
      requestAnimationFrame(boot);
      return;
    }

    ensureToggle();
    layout();

    // 分类被重新渲染（切数据源、导入书签、编辑分类）时重算
    new MutationObserver(function () {
      if (!tabs || !tabs.isConnected) tabs = document.querySelector(TABS_SEL);
      schedule();
    }).observe(document.body, { childList: true, subtree: true });

    // 窗口宽度变化时重算（高度变化不用管，避免自我触发死循环）
    window.addEventListener('resize', schedule);
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var w = tabs ? tabs.clientWidth : 0;
        if (w === lastWidth) return;
        lastWidth = w;
        schedule();
      }).observe(tabs);
    }

    // 字体加载完宽度会变，补一次
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(schedule);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
