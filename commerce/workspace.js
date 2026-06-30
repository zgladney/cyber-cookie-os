/* CyberCookieOS — Revenue Operations Center
   ES5 strict IIFEs. No const/let/arrow functions. */

/* ── 1. COMMERCE STORE ─────────────────────────────────────────── */
var CommerceStore = (function () {
  'use strict';

  var KEY_PRODUCTS  = 'rev.products.v1';
  var KEY_TRENDS    = 'rev.trends.v1';
  var KEY_REVENUE   = 'rev.revenue.v1';
  var KEY_LOG       = 'rev.log.v1';
  var KEY_APPROVALS = 'rev.approvals.v1';
  var KEY_DECISIONS = 'rev.decisions.v1';

  var PRODUCT_SEEDS = [
    { id: 'p1', title: '2026 Digital Planner — Undated Weekly', type: 'Printable',      platform: 'etsy',    price: 7.99,  status: 'selling',  revenue: 143.82, sales: 18, views: 420,  tags: ['planner','printable','digital','undated'],    desc: 'Minimalist undated weekly planner — printable PDF. Perfect for goal-setters and habit trackers.',   progress: 100, created: Date.now() - 1296000000 },
    { id: 'p2', title: 'Black Girl Magic Affirmation Stickers',  type: 'Printable',      platform: 'etsy',    price: 3.99,  status: 'published', revenue: 27.93, sales: 7,  views: 185,  tags: ['stickers','affirmation','printable','Black'], desc: 'Printable sticker sheet — 12 affirmations. Print at home.',                                            progress: 100, created: Date.now() - 864000000 },
    { id: 'p3', title: 'AI Prompt Pack — 150 Prompts for Creators', type: 'Prompt Pack', platform: 'gumroad', price: 12.99, status: 'ready',    revenue: 0,      sales: 0,  views: 0,    tags: ['AI','ChatGPT','prompts','creators'],          desc: 'Curated ChatGPT prompts for content creators, entrepreneurs, and freelancers.',                       progress: 95,  created: Date.now() - 432000000 },
    { id: 'p4', title: 'Budget Binder Printable Kit 2026',        type: 'Printable',      platform: 'etsy',    price: 9.99,  status: 'creating', revenue: 0,      sales: 0,  views: 0,    tags: ['budget','finance','printable','planner'],     desc: 'Full budget binder system — 20 pages including monthly tracker, savings challenge, and bill calendar.', progress: 68,  created: Date.now() - 172800000 },
    { id: 'p5', title: 'Cybersecurity Career Starter Guide',       type: 'Ebook',          platform: 'gumroad', price: 19.99, status: 'research', revenue: 0,      sales: 0,  views: 0,    tags: ['cybersecurity','career','guide','IT'],        desc: 'Step-by-step guide to breaking into cybersecurity without a degree.',                                  progress: 20,  created: Date.now() - 86400000 },
    { id: 'p6', title: 'Vision Board Digital Kit 2027',            type: 'Digital Download', platform: 'etsy', price: 6.99,  status: 'idea',    revenue: 0,      sales: 0,  views: 0,    tags: ['vision board','digital','aesthetic','goals'], desc: 'Canva vision board kit — 50+ elements, goal cards, affirmation tiles.',                                progress: 0,   created: Date.now() - 43200000 }
  ];

  var TREND_SEEDS = [
    { id: 't1', keyword: 'AI planner 2026',           platform: 'Etsy',    category: 'Planners',  volume: '4.2K/mo', competition: 'medium', profit: 'high',      status: 'new',        ts: Date.now() - 86400000 },
    { id: 't2', keyword: 'Black girl digital planner', platform: 'Etsy',    category: 'Planners',  volume: '2.1K/mo', competition: 'low',    profit: 'high',      status: 'saved',      ts: Date.now() - 172800000 },
    { id: 't3', keyword: 'ChatGPT prompt packs',       platform: 'Gumroad', category: 'Digital',   volume: '8.7K/mo', competition: 'high',   profit: 'medium',    status: 'new',        ts: Date.now() - 43200000 },
    { id: 't4', keyword: 'Budget binder printable 2026', platform: 'Etsy', category: 'Finance',   volume: '6.3K/mo', competition: 'medium', profit: 'high',      status: 'researching', ts: Date.now() - 259200000 },
    { id: 't5', keyword: 'Cybersecurity study guide PDF', platform: 'Gumroad', category: 'Career', volume: '1.8K/mo', competition: 'low',    profit: 'very high', status: 'saved',      ts: Date.now() - 345600000 },
    { id: 't6', keyword: 'Desk organization printable', platform: 'TikTok', category: 'Wellness', volume: '3.4K/mo', competition: 'medium', profit: 'high',      status: 'new',        ts: Date.now() - 21600000 },
    { id: 't7', keyword: 'Self-care checklist printable', platform: 'Etsy', category: 'Wellness',  volume: '5.1K/mo', competition: 'high',   profit: 'medium',    status: 'new',        ts: Date.now() - 10800000 },
    { id: 't8', keyword: 'Resume template bundle',      platform: 'Etsy',    category: 'Career',   volume: '12K/mo',  competition: 'high',   profit: 'high',      status: 'new',        ts: Date.now() - 3600000 }
  ];

  var REVENUE_SEED = { today: 15.98, week: 63.91, month: 171.75, profit: 171.75, platform: { etsy: 143.82, gumroad: 0, tiktok: 27.93, shopify: 0 } };

  function _loadKey(key, seed) {
    try {
      var s = localStorage.getItem(key);
      if (s) { return JSON.parse(s); }
    } catch (e) {}
    if (seed !== undefined) { _saveKey(key, seed); return seed instanceof Array ? seed.slice() : seed; }
    return null;
  }
  function _saveKey(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  function getProducts()  { return _loadKey(KEY_PRODUCTS,  PRODUCT_SEEDS); }
  function getTrends()    { return _loadKey(KEY_TRENDS,    TREND_SEEDS);   }
  function getRevenue()   { return _loadKey(KEY_REVENUE,   REVENUE_SEED);  }
  function getApprovals() { return _loadKey(KEY_APPROVALS, []);            }
  function getDecisions() { return _loadKey(KEY_DECISIONS, []);            }
  function getLog()       { return _loadKey(KEY_LOG,       []);            }

  function saveProducts(list)  { _saveKey(KEY_PRODUCTS,  list); }
  function saveTrends(list)    { _saveKey(KEY_TRENDS,    list); }
  function saveRevenue(obj)    { _saveKey(KEY_REVENUE,   obj);  }
  function saveApprovals(list) { _saveKey(KEY_APPROVALS, list); }
  function saveDecisions(list) { _saveKey(KEY_DECISIONS, list); }

  function upsertProduct(prod) {
    var list  = getProducts();
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === prod.id) { list[i] = prod; found = true; break; }
    }
    if (!found) { list.unshift(prod); }
    saveProducts(list);
  }

  function removeProduct(id) {
    saveProducts(getProducts().filter(function (p) { return p.id !== id; }));
  }

  function pushLog(agent, action) {
    var log = getLog();
    log.unshift({ agent: agent, action: action, ts: Date.now() });
    if (log.length > 80) { log.length = 80; }
    _saveKey(KEY_LOG, log);
  }

  function genId() { return 'rev' + Date.now(); }

  return {
    getProducts:    getProducts,    saveProducts:    saveProducts,    upsertProduct: upsertProduct, removeProduct: removeProduct,
    getTrends:      getTrends,      saveTrends:      saveTrends,
    getRevenue:     getRevenue,     saveRevenue:     saveRevenue,
    getApprovals:   getApprovals,   saveApprovals:   saveApprovals,
    getDecisions:   getDecisions,   saveDecisions:   saveDecisions,
    getLog:         getLog,         pushLog:         pushLog,
    genId:          genId
  };
}());


/* ── 2. PIPELINE & PRODUCTS ─────────────────────────────────────── */
var RevPipeline = (function () {
  'use strict';

  var _filter = 'all';

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function _statusLabel(s) {
    var map = { idea:'IDEA', research:'RESEARCH', creating:'CREATING', ready:'READY', published:'PUBLISHED', selling:'SELLING' };
    return map[s] || (s || '').toUpperCase();
  }

  function renderCounts() {
    var all    = CommerceStore.getProducts();
    var counts = { idea:0, research:0, creating:0, ready:0, published:0, selling:0 };
    for (var i = 0; i < all.length; i++) { if (counts[all[i].status] !== undefined) { counts[all[i].status]++; } }

    var tot = document.getElementById('rev-cnt-total');
    if (tot) { tot.textContent = all.length; }

    var stages = ['idea','research','creating','ready','published','selling'];
    for (var k = 0; k < stages.length; k++) {
      var el = document.getElementById('rev-cnt-' + stages[k]);
      if (el) { el.textContent = counts[stages[k]]; }
    }
  }

  function renderList() {
    var all      = CommerceStore.getProducts();
    var filtered = _filter === 'all' ? all : all.filter(function (p) { return p.status === _filter; });
    var el       = document.getElementById('rev-pipeline-list');
    if (!el) { return; }

    if (!filtered.length) { el.innerHTML = '<div class="rev-empty">No products in this stage.</div>'; return; }

    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var p = filtered[i];
      html += '<div class="rev-product-card" onclick="revOpenProduct(\'' + p.id + '\')">' +
        '<div class="rev-product-card-top">' +
          '<span class="rev-product-name">' + esc(p.title) + '</span>' +
          '<span class="rev-product-price">$' + (p.price || 0).toFixed(2) + '</span>' +
        '</div>' +
        '<div class="rev-product-meta">' + esc(p.type || '') + ' · ' + (p.platform || '').toUpperCase() +
          '<span class="rev-product-status ' + (p.status || '') + '">' + _statusLabel(p.status) + '</span>' +
        '</div>' +
      '</div>';
    }
    el.innerHTML = html;
  }

  function renderWorkshop() {
    var all = CommerceStore.getProducts().filter(function (p) {
      return p.status === 'creating' || p.status === 'research' || p.status === 'idea';
    });
    var el = document.getElementById('rev-workshop-list');
    if (!el) { return; }

    if (!all.length) { el.innerHTML = '<div class="rev-empty">No products in workshop. Add one above.</div>'; return; }

    var html = '';
    for (var i = 0; i < all.length; i++) {
      var p   = all[i];
      var pct = Math.min(100, Math.max(0, p.progress || 0));
      html += '<div class="rev-workshop-item" onclick="revOpenProduct(\'' + p.id + '\')">' +
        '<div class="rev-workshop-top">' +
          '<span class="rev-workshop-title">' + esc(p.title) + '</span>' +
          '<span class="rev-product-status ' + (p.status || '') + '">' + _statusLabel(p.status) + '</span>' +
        '</div>' +
        '<div class="rev-workshop-bar"><div class="rev-workshop-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="rev-workshop-meta"><span>' + esc(p.type || '') + '</span><span>' + pct + '% complete</span></div>' +
      '</div>';
    }
    el.innerHTML = html;
  }

  function setFilter(stage) {
    _filter = stage;
    var stages = document.querySelectorAll('.rev-pipe-stage');
    for (var i = 0; i < stages.length; i++) { stages[i].classList.remove('active'); }
    var el = document.getElementById('rev-stage-' + stage);
    if (el) { el.classList.add('active'); }
    renderList();
  }

  function renderAll() {
    renderCounts();
    renderList();
    renderWorkshop();
    RevMarketplace.renderAll();
    RevAnalytics.render();
    RevSidebar.renderApprovals();
    RevTrends.render();
  }

  return { renderAll: renderAll, renderList: renderList, renderCounts: renderCounts, renderWorkshop: renderWorkshop, setFilter: setFilter };
}());


/* ── 3. TREND INTELLIGENCE ──────────────────────────────────────── */
var RevTrends = (function () {
  'use strict';

  var _scanning  = false;
  var _activeId  = null;

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function _profitClass(p) {
    if (p === 'very high' || p === 'high') { return 'high'; }
    if (p === 'medium') { return 'medium'; }
    return 'low';
  }
  function _competClass(c) {
    if (c === 'low')    { return 'high'; }
    if (c === 'medium') { return 'medium'; }
    return 'low';
  }

  function render() {
    var platform = (document.getElementById('rev-trend-platform') || {}).value || 'all';
    var category = (document.getElementById('rev-trend-category') || {}).value || 'all';
    var all      = CommerceStore.getTrends();

    var filtered = all.filter(function (t) {
      var pOk = platform === 'all' || t.platform === platform;
      var cOk = category === 'all' || t.category === category;
      return pOk && cOk;
    });

    var el = document.getElementById('rev-trend-list');
    if (!el) { return; }

    if (_scanning) {
      el.innerHTML = '<div class="rev-trend-scanning" id="rev-scan-progress">● TRENDSEER SCANNING MARKETS...</div>';
      return;
    }

    if (!filtered.length) { el.innerHTML = '<div class="rev-empty">No trends match filter.</div>'; return; }

    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var t = filtered[i];
      html += '<div class="rev-trend-card" onclick="revOpenTrend(\'' + t.id + '\')">' +
        '<div class="rev-trend-top">' +
          '<span class="rev-trend-keyword">' + esc(t.keyword) + '</span>' +
          '<span class="rev-trend-platform">' + esc(t.platform).toUpperCase() + '</span>' +
        '</div>' +
        '<div class="rev-trend-meta">' +
          '<span>' + esc(t.category) + '</span>' +
          '<span>' + esc(t.volume) + ' searches</span>' +
          '<span class="rev-trend-tag ' + _profitClass(t.profit) + '">PROFIT: ' + (t.profit || '').toUpperCase() + '</span>' +
          '<span class="rev-trend-tag ' + _competClass(t.competition) + '">COMP: ' + (t.competition || '').toUpperCase() + '</span>' +
        '</div>' +
      '</div>';
    }
    el.innerHTML = html;
  }

  function runScan() {
    if (_scanning) { return; }
    _scanning = true;
    var btn = document.getElementById('rev-scan-btn');
    if (btn) { btn.textContent = 'SCANNING...'; btn.disabled = true; }
    render();

    var steps = [
      { delay: 500,  text: '● TRENDSEER: Connecting to Etsy API...' },
      { delay: 1100, text: '● TRENDSEER: Scanning TikTok Shop trends...' },
      { delay: 1800, text: '● TRENDSEER: Analyzing Gumroad bestsellers...' },
      { delay: 2500, text: '● TRENDSEER: Scoring opportunities by profit potential...' },
      { delay: 3200, text: '● TRENDSEER: Injecting 2 new trends into feed...' }
    ];

    for (var i = 0; i < steps.length; i++) {
      (function (step) {
        setTimeout(function () {
          var el = document.getElementById('rev-scan-progress');
          if (el) { el.textContent = step.text; }
        }, step.delay);
      }(steps[i]));
    }

    setTimeout(function () {
      var trends = CommerceStore.getTrends();
      var newTrends = [
        { id: 'tn' + Date.now(),       keyword: 'Affirmation journal printable', platform: 'Etsy',    category: 'Wellness', volume: '3.8K/mo', competition: 'low',  profit: 'high',   status: 'new', ts: Date.now() },
        { id: 'tn' + (Date.now() + 1), keyword: 'Side hustle income tracker',    platform: 'Gumroad', category: 'Finance',  volume: '2.2K/mo', competition: 'low',  profit: 'high',   status: 'new', ts: Date.now() }
      ];
      for (var j = 0; j < newTrends.length; j++) { trends.unshift(newTrends[j]); }
      CommerceStore.saveTrends(trends);
      CommerceStore.pushLog('TrendSeer', 'Market scan complete — 2 new trends added');
      _scanning = false;
      if (btn) { btn.textContent = 'SCAN NOW'; btn.disabled = false; }
      render();
      RevSidebar.pushAlert('pink', 'TrendSeer found 2 new opportunities');
    }, 3600);
  }

  function openDetail(id) {
    var all = CommerceStore.getTrends();
    var t   = null;
    for (var i = 0; i < all.length; i++) { if (all[i].id === id) { t = all[i]; break; } }
    if (!t) { return; }
    _activeId = id;

    var tit = document.getElementById('rev-trend-detail-title');
    if (tit) { tit.textContent = 'TREND: ' + t.keyword.toUpperCase(); }

    var body = document.getElementById('rev-trend-detail-body');
    if (!body) { return; }

    body.innerHTML =
      '<div style="font-size:12px;font-weight:700;color:rgba(200,180,255,.9);margin-bottom:10px">' + esc(t.keyword) + '</div>' +
      '<div class="rev-drawer-field-row"><span>PLATFORM</span><span>' + esc(t.platform) + '</span></div>' +
      '<div class="rev-drawer-field-row"><span>CATEGORY</span><span>' + esc(t.category) + '</span></div>' +
      '<div class="rev-drawer-field-row"><span>SEARCH VOLUME</span><span style="color:#2ecc71">' + esc(t.volume) + '</span></div>' +
      '<div class="rev-drawer-field-row"><span>COMPETITION</span><span>' + (t.competition || '').toUpperCase() + '</span></div>' +
      '<div class="rev-drawer-field-row"><span>PROFIT POTENTIAL</span><span style="color:#f1c40f">' + (t.profit || '').toUpperCase() + '</span></div>' +
      '<div class="rev-drawer-field-row"><span>STATUS</span><span>' + (t.status || '').toUpperCase() + '</span></div>' +
      '<div style="margin-top:12px">' +
        '<button class="rev-btn-primary" onclick="revCreateFromTrend(\'' + id + '\')">CREATE PRODUCT FROM TREND</button>' +
      '</div>';

    revOpenDrawer('rev-drawer-trend');
  }

  function createFromTrend(id) {
    var all = CommerceStore.getTrends();
    var t   = null;
    for (var i = 0; i < all.length; i++) { if (all[i].id === id) { t = all[i]; break; } }
    if (!t) { return; }

    revCloseDrawers();
    setTimeout(function () {
      var titleEl = document.getElementById('rev-prod-title');
      var descEl  = document.getElementById('rev-prod-desc');
      var tagsEl  = document.getElementById('rev-prod-tags');
      if (titleEl) { titleEl.value = t.keyword; }
      if (descEl)  { descEl.value  = 'Product inspired by trending keyword: ' + t.keyword + ' (' + t.volume + ' monthly searches on ' + t.platform + ')'; }
      if (tagsEl)  { tagsEl.value  = t.keyword.toLowerCase().split(' ').join(', '); }
      revOpenDrawer('rev-drawer-product');
    }, 80);
  }

  return { render: render, runScan: runScan, openDetail: openDetail, createFromTrend: createFromTrend };
}());


/* ── 4. MARKETPLACE OPS ─────────────────────────────────────────── */
var RevMarketplace = (function () {
  'use strict';

  var _activeTab = 'etsy';

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function _dollar(n) { return '$' + (Number(n) || 0).toFixed(2); }

  function renderPanel(platform) {
    var all      = CommerceStore.getProducts().filter(function (p) { return p.platform === platform && (p.status === 'selling' || p.status === 'published'); });
    var el       = document.getElementById('rev-mp-' + platform);
    if (!el) { return; }

    if (!all.length) {
      el.innerHTML = '<div class="rev-empty" style="padding:12px 0">No ' + platform + ' listings yet.<br>Add a product and queue it for publish.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < all.length; i++) {
      var p = all[i];
      html += '<div class="rev-listing-card" onclick="revOpenProduct(\'' + p.id + '\')">' +
        '<div class="rev-listing-body">' +
          '<div class="rev-listing-title">' + esc(p.title) + '</div>' +
          '<div class="rev-listing-meta">' + esc(p.type || '') + ' · $' + (p.price || 0).toFixed(2) + ' · ' + (p.sales || 0) + ' sales · ' + (p.views || 0) + ' views</div>' +
        '</div>' +
        '<div class="rev-listing-revenue">' + _dollar(p.revenue) + '</div>' +
      '</div>';
    }
    el.innerHTML = html;
  }

  function renderAll() {
    renderPanel('etsy');
    renderPanel('tiktok');
    renderPanel('gumroad');
    renderPanel('shopify');
  }

  function switchTab(tab) {
    _activeTab = tab;
    var tabs = ['etsy','tiktok','gumroad','shopify'];
    for (var i = 0; i < tabs.length; i++) {
      var tabEl   = document.getElementById('rev-tab-'   + tabs[i]);
      var panelEl = document.getElementById('rev-mp-'    + tabs[i]);
      if (tabEl)   { tabEl.classList.remove('active'); }
      if (panelEl) { panelEl.classList.remove('active'); }
    }
    var at = document.getElementById('rev-tab-'   + tab);
    var ap = document.getElementById('rev-mp-'    + tab);
    if (at) { at.classList.add('active'); }
    if (ap) { ap.classList.add('active'); }
  }

  return { renderAll: renderAll, switchTab: switchTab };
}());


/* ── 5. REVENUE ANALYTICS ───────────────────────────────────────── */
var RevAnalytics = (function () {
  'use strict';

  function _dollar(n) { return '$' + (Number(n) || 0).toFixed(2); }

  function render() {
    var rev = CommerceStore.getRevenue();
    if (!rev) { return; }

    var els = {
      today:  'rev-rev-today',
      week:   'rev-rev-week',
      month:  'rev-rev-month',
      profit: 'rev-rev-profit'
    };

    var td = document.getElementById(els.today);  if (td) { td.textContent = _dollar(rev.today);  }
    var wk = document.getElementById(els.week);   if (wk) { wk.textContent = _dollar(rev.week);   }
    var mo = document.getElementById(els.month);  if (mo) { mo.textContent = _dollar(rev.month);  }
    var pr = document.getElementById(els.profit); if (pr) { pr.textContent = _dollar(rev.profit); }

    var plat = rev.platform || {};
    var maxPlat = Math.max(plat.etsy || 0, plat.gumroad || 0, plat.tiktok || 0, 1);

    _setBar('rev-bar-etsy',    'rev-bar-etsy-val',    plat.etsy    || 0, maxPlat);
    _setBar('rev-bar-gumroad', 'rev-bar-gumroad-val', plat.gumroad || 0, maxPlat);
    _setBar('rev-bar-tiktok',  'rev-bar-tiktok-val',  plat.tiktok  || 0, maxPlat);

    _renderTopProducts();

    var ts = document.getElementById('rev-analytics-ts');
    if (ts) { ts.textContent = 'Last updated: ' + new Date().toLocaleTimeString(); }
  }

  function _setBar(barId, valId, val, max) {
    var pct = max > 0 ? Math.round((val / max) * 100) : 0;
    var bar = document.getElementById(barId);
    var lbl = document.getElementById(valId);
    if (bar) { bar.style.width = pct + '%'; }
    if (lbl) { lbl.textContent = '$' + (Number(val) || 0).toFixed(0); }
  }

  function _renderTopProducts() {
    var el = document.getElementById('rev-top-products');
    if (!el) { return; }

    var all = CommerceStore.getProducts().filter(function (p) { return (p.revenue || 0) > 0; });
    all.sort(function (a, b) { return (b.revenue || 0) - (a.revenue || 0); });
    var top = all.slice(0, 3);

    if (!top.length) { el.innerHTML = '<div class="rev-empty" style="padding:5px 0">No sales yet.</div>'; return; }

    var maxRev = top[0].revenue || 1;
    var html = '';
    for (var i = 0; i < top.length; i++) {
      var p   = top[i];
      var pct = Math.round(((p.revenue || 0) / maxRev) * 100);
      html += '<div class="rev-bar-row" style="margin-bottom:5px">' +
        '<span class="rev-bar-label" style="font-size:7px;color:rgba(180,150,255,.45);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (p.title || '').substring(0, 14) + '…</span>' +
        '<div class="rev-bar-track"><div class="rev-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="rev-bar-val">$' + (Number(p.revenue) || 0).toFixed(0) + '</span>' +
      '</div>';
    }
    el.innerHTML = html;
  }

  function renderForecast() {
    var body = document.getElementById('rev-forecast-body');
    if (!body) { return; }

    var rev      = CommerceStore.getRevenue() || {};
    var products = CommerceStore.getProducts();
    var selling  = products.filter(function (p) { return p.status === 'selling'; }).length;
    var ready    = products.filter(function (p) { return p.status === 'ready';   }).length;
    var monthly  = rev.month || 0;
    var proj3mo  = monthly * 3 * 1.15;
    var proj12mo = monthly * 12 * 1.35;

    body.innerHTML =
      '<div style="font-size:10px;font-weight:700;color:rgba(255,105,180,.8);margin-bottom:10px;letter-spacing:1.5px">REVENUEAI FORECAST</div>' +
      '<div class="rev-drawer-field-row"><span>CURRENT MONTHLY</span><span style="color:#2ecc71">$' + monthly.toFixed(2) + '</span></div>' +
      '<div class="rev-drawer-field-row"><span>PRODUCTS SELLING</span><span>' + selling + '</span></div>' +
      '<div class="rev-drawer-field-row"><span>READY TO LAUNCH</span><span style="color:#f39c12">' + ready + '</span></div>' +
      '<div class="rev-drawer-field-row"><span>3-MONTH PROJECTION</span><span style="color:#ff69b4">$' + proj3mo.toFixed(2) + '</span></div>' +
      '<div class="rev-drawer-field-row"><span>12-MONTH PROJECTION</span><span style="color:#f1c40f">$' + proj12mo.toFixed(2) + '</span></div>' +
      '<div class="rev-divider" style="margin:10px 0"></div>' +
      '<div style="font-size:8px;color:rgba(180,150,255,.4);line-height:1.6">' +
        'Projections assume +15% growth per quarter from current trajectory. ' +
        'Launching 1 new product per month is the primary growth lever. ' +
        'RevenueAI recommends prioritizing your READY products for CEO approval and publish.' +
      '</div>' +
      '<div style="margin-top:12px">' +
        '<button class="rev-btn-primary" onclick="revOpenDrawer(\'rev-drawer-product\')">+ ADD PRODUCT TO PIPELINE</button>' +
      '</div>';
  }

  function renderInsights() {
    var body = document.getElementById('rev-insight-body');
    if (!body) { return; }

    var products = CommerceStore.getProducts();
    var selling  = products.filter(function (p) { return p.status === 'selling'; });
    var totalRev = 0;
    var totalSales = 0;
    for (var i = 0; i < selling.length; i++) { totalRev += (selling[i].revenue || 0); totalSales += (selling[i].sales || 0); }
    var avgOrder = totalSales > 0 ? (totalRev / totalSales) : 0;

    body.innerHTML =
      '<div style="font-size:10px;font-weight:700;color:rgba(255,105,180,.8);margin-bottom:10px;letter-spacing:1.5px">CUSTOMER INSIGHTS</div>' +
      '<div class="rev-drawer-field-row"><span>TOTAL CUSTOMERS</span><span>' + totalSales + '</span></div>' +
      '<div class="rev-drawer-field-row"><span>AVG ORDER VALUE</span><span style="color:#2ecc71">$' + avgOrder.toFixed(2) + '</span></div>' +
      '<div class="rev-drawer-field-row"><span>TOP PLATFORM</span><span>ETSY</span></div>' +
      '<div class="rev-drawer-field-row"><span>TOP CATEGORY</span><span>Printables</span></div>' +
      '<div class="rev-drawer-field-row"><span>REPEAT RATE</span><span>N/A (Early Stage)</span></div>' +
      '<div class="rev-divider" style="margin:10px 0"></div>' +
      '<div style="font-size:8.5px;color:rgba(180,150,255,.45);font-weight:700;margin-bottom:5px;letter-spacing:1.5px">AUDIENCE NOTES</div>' +
      '<div style="font-size:8px;color:rgba(180,150,255,.4);line-height:1.6">' +
        'Primary buyers: Black women 25-40, interested in planning, finance, and career tools. ' +
        'Strong Etsy search traffic for budget + planner keywords. ' +
        'TikTok is emerging channel — visual products perform best. ' +
        'Digital downloads convert at 3-5x higher rate than physical products.' +
      '</div>';
  }

  return { render: render, renderForecast: renderForecast, renderInsights: renderInsights };
}());


/* ── 6. SIDEBAR ─────────────────────────────────────────────────── */
var RevSidebar = (function () {
  'use strict';

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function renderApprovals() {
    var all = CommerceStore.getApprovals();
    var el  = document.getElementById('rev-approval-queue');
    if (!el) { return; }

    if (!all.length) { el.innerHTML = '<div class="rev-empty" style="padding:4px 0">No pending approvals.</div>'; return; }

    var html = '';
    for (var i = 0; i < all.length; i++) {
      var a = all[i];
      html += '<div class="rev-approval-item">' +
        '<div class="rev-approval-title">' + esc(a.title) + '</div>' +
        '<div class="rev-approval-meta">' + esc(a.type || '') + ' · ' + esc(a.risk || '') + '</div>' +
        '<div class="rev-approval-btns">' +
          '<button class="rev-approval-btn approve" onclick="revApprove(\'' + a.id + '\')">APPROVE</button>' +
          '<button class="rev-approval-btn decline" onclick="revDecline(\'' + a.id + '\')">DECLINE</button>' +
        '</div>' +
      '</div>';
    }
    el.innerHTML = html;
  }

  function renderDecisions() {
    var all = CommerceStore.getDecisions();
    var el  = document.getElementById('rev-recent-decisions');
    if (!el) { return; }

    if (!all.length) { el.innerHTML = '<div class="rev-empty" style="padding:4px 0">No decisions yet.</div>'; return; }

    var html = '';
    for (var i = 0; i < Math.min(all.length, 5); i++) {
      var d = all[i];
      html += '<div class="rev-recent-item">' +
        '<span class="rev-recent-decision ' + (d.decision || '') + '">' + (d.decision || '').toUpperCase() + '</span>' +
        '<span class="rev-recent-title">' + esc(d.title) + '</span>' +
      '</div>';
    }
    el.innerHTML = html;
  }

  function pushAlert(type, text) {
    var el = document.getElementById('rev-alerts-list');
    if (!el) { return; }
    var item = document.createElement('div');
    item.className = 'rev-alert-item';
    item.innerHTML = '<span class="rev-alert-dot ' + (type || '') + '"></span><span class="rev-alert-text">' + text + '</span>';
    el.insertBefore(item, el.firstChild);
    if (el.children.length > 6) { el.removeChild(el.lastChild); }
  }

  return { renderApprovals: renderApprovals, renderDecisions: renderDecisions, pushAlert: pushAlert };
}());


/* ── 7. AGENT ANIMATION ─────────────────────────────────────────── */
var RevAgents = (function () {
  'use strict';

  var TREND_TASKS = [
    'Scanning Etsy for printable demand spikes...',
    'Watching TikTok Shop trending hashtags...',
    'Checking Gumroad bestseller charts...',
    'Analyzing competitor pricing on Etsy...',
    'Scoring new keywords by profit potential...',
    'Monitoring seasonal trend calendar...'
  ];
  var TREND_OUTPUTS = [
    'Found: digital planners trending +34% this week',
    'Spike detected: budget printables +22% on Pinterest',
    'Low competition niche: cybersecurity guides on Gumroad',
    'Etsy: resume bundles up 40% in July searches',
    'TikTok: desk printables performing in video saves',
    'Seasonal: vision boards peak Jan — prepare Oct launch'
  ];

  var MAKER_TASKS = [
    'Generating Budget Binder Kit layout...',
    'Writing SEO product description...',
    'Creating Canva template structure...',
    'Exporting PDF pages for planner...',
    'Drafting file naming convention...',
    'Preparing mockup preview images...'
  ];
  var MAKER_OUTPUTS = [
    '20 pages — Canva template draft ready',
    'SEO title: 560 chars · 13 keyword targets',
    'Template structure: A4 + US Letter format',
    'PDF export: 300 DPI print-ready',
    'Naming: budget-binder-2026-printable.pdf',
    '3 lifestyle mockups generated in staging'
  ];

  var MARKET_TASKS = [
    'Updating Etsy SEO tags for planner listing...',
    'Checking conversion rates across listings...',
    'Monitoring Etsy search ranking for top product...',
    'Reviewing listing thumbnail click-through...',
    'Flagging listings with low views...',
    'Syncing sales count to revenue tracker...'
  ];
  var MARKET_OUTPUTS = [
    'CTR improved — 2.4% above category avg',
    'Planner: rank #8 for "digital planner undated"',
    'Sticker pack CTR low — thumbnail update queued',
    'Monthly sales velocity: +3.2 units/week',
    'Views-to-sale ratio: 23:1 (target: 20:1)',
    '18 sales confirmed — revenue updated'
  ];

  var REVENUE_TASKS = [
    'Calculating Q3 revenue forecast...',
    'Updating platform breakdown metrics...',
    'Projecting monthly run rate...',
    'Analyzing profit margin per product...',
    'Comparing week-over-week performance...',
    'Building launch ROI model for AI Prompt Pack...'
  ];
  var REVENUE_OUTPUTS = [
    'Projected: $1,240/mo at current trajectory',
    'Etsy: 84% of revenue | Gumroad: 0% (unpublished)',
    'Monthly run rate: $171.75 (+12% vs last month)',
    'Digital planner: 100% margin (no production cost)',
    'Week over week: +8.3% revenue growth',
    'AI Prompt Pack: break-even at 1 sale/day'
  ];

  var _tIdx = 0; var _mIdx = 0; var _mkIdx = 0; var _rIdx = 0;
  var _tOut = 0; var _mOut = 0; var _mkOut = 0; var _rOut = 0;

  function _set(taskId, outputId, fillId, task, output, pct) {
    var te = document.getElementById(taskId);
    var oe = document.getElementById(outputId);
    var fe = document.getElementById(fillId);
    if (te) { te.textContent = task; }
    if (oe) { oe.textContent = output; }
    if (fe) { fe.style.width = pct + '%'; }
  }
  function _rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

  function start() {
    setInterval(function () {
      _tIdx = (_tIdx + 1) % TREND_TASKS.length;
      _tOut = (_tOut + 1) % TREND_OUTPUTS.length;
      _set('rev-task-trend', 'rev-output-trend', 'rev-fill-trend', TREND_TASKS[_tIdx], TREND_OUTPUTS[_tOut], _rand(45, 92));
    }, 3800);

    setInterval(function () {
      _mIdx = (_mIdx + 1) % MAKER_TASKS.length;
      _mOut = (_mOut + 1) % MAKER_OUTPUTS.length;
      _set('rev-task-maker', 'rev-output-maker', 'rev-fill-maker', MAKER_TASKS[_mIdx], MAKER_OUTPUTS[_mOut], _rand(30, 88));
    }, 5200);

    setInterval(function () {
      _mkIdx = (_mkIdx + 1) % MARKET_TASKS.length;
      _mkOut = (_mkOut + 1) % MARKET_OUTPUTS.length;
      _set('rev-task-market', 'rev-output-market', 'rev-fill-market', MARKET_TASKS[_mkIdx], MARKET_OUTPUTS[_mkOut], _rand(25, 80));
    }, 4500);

    setInterval(function () {
      _rIdx = (_rIdx + 1) % REVENUE_TASKS.length;
      _rOut = (_rOut + 1) % REVENUE_OUTPUTS.length;
      _set('rev-task-revenue', 'rev-output-revenue', 'rev-fill-revenue', REVENUE_TASKS[_rIdx], REVENUE_OUTPUTS[_rOut], _rand(20, 75));
      var st = document.getElementById('rev-status-revenue');
      if (st) { st.className = 'rev-ws-status working'; st.textContent = 'CALCULATING'; }
    }, 6100);
  }

  return { start: start };
}());


/* ── 8. COS INTEGRATION + GLOBAL FUNCTIONS ──────────────────────── */
(function () {
  'use strict';

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function _toast(msg) {
    var el = document.getElementById('rev-toast');
    if (!el) { return; }
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  function _emit(event, data) {
    if (window.COS && COS.events) { try { COS.events.emit(event, data); } catch (e) {} }
  }

  function _orionSubmit(item) {
    var approvals = CommerceStore.getApprovals();
    approvals.unshift(item);
    CommerceStore.saveApprovals(approvals);
    RevSidebar.renderApprovals();
    RevSidebar.pushAlert('amber', 'Sent to ORION: ' + item.title);
    _emit('commerce.orion_submitted', { id: item.id, title: item.title });
    _toast('Submitted to ORION for CEO approval.');
  }

  function _ensureAgents() {
    if (!window.COS || !COS.AgentEngine) { return; }
    try {
      COS.AgentEngine.register('trendseer',  { name: 'TrendSeer',  dept: 'commerce', role: 'Trend Intelligence', status: 'working' });
      COS.AgentEngine.register('maker',      { name: 'Maker',      dept: 'commerce', role: 'Product Creator',    status: 'working' });
      COS.AgentEngine.register('marketmind', { name: 'MarketMind', dept: 'commerce', role: 'Marketplace Ops',    status: 'working' });
      COS.AgentEngine.register('revenueai',  { name: 'RevenueAI',  dept: 'commerce', role: 'Revenue Analyst',    status: 'idle'    });
    } catch (e) {}
  }

  /* DRAWER */
  window.revOpenDrawer = function (id) {
    var ovs = document.querySelectorAll('.rev-drawer-ov');
    for (var i = 0; i < ovs.length; i++) { ovs[i].classList.remove('open'); }
    var el = document.getElementById(id);
    if (el) { el.classList.add('open'); }
    if (id === 'rev-drawer-forecast') { RevAnalytics.renderForecast(); }
    if (id === 'rev-drawer-insight')  { RevAnalytics.renderInsights(); }
    if (id === 'rev-drawer-listing')  { _populateListingSelect(); }
  };

  window.revCloseDrawers = function () {
    var ovs = document.querySelectorAll('.rev-drawer-ov');
    for (var i = 0; i < ovs.length; i++) { ovs[i].classList.remove('open'); }
  };

  function _populateListingSelect() {
    var sel = document.getElementById('rev-listing-product');
    if (!sel) { return; }
    var products = CommerceStore.getProducts().filter(function (p) { return p.status === 'ready' || p.status === 'creating'; });
    var html = '<option value="">Select product...</option>';
    for (var i = 0; i < products.length; i++) {
      html += '<option value="' + esc(products[i].id) + '">' + esc(products[i].title) + '</option>';
    }
    sel.innerHTML = html;
  }

  /* PIPELINE FILTER */
  window.revFilterPipeline = function (stage) {
    RevPipeline.setFilter(stage);
  };

  /* MARKETPLACE TAB */
  window.revMpTab = function (tab) {
    RevMarketplace.switchTab(tab);
  };

  /* TREND ACTIONS */
  window.revRenderTrends     = function ()   { RevTrends.render(); };
  window.revRunTrendScan     = function ()   { RevTrends.runScan(); };
  window.revOpenTrend        = function (id) { RevTrends.openDetail(id); };
  window.revCreateFromTrend  = function (id) { RevTrends.createFromTrend(id); };

  /* SAVE PRODUCT */
  window.revSaveProduct = function () {
    var titleEl  = document.getElementById('rev-prod-title');
    var typeEl   = document.getElementById('rev-prod-type');
    var platEl   = document.getElementById('rev-prod-platform');
    var priceEl  = document.getElementById('rev-prod-price');
    var statusEl = document.getElementById('rev-prod-status');
    var descEl   = document.getElementById('rev-prod-desc');
    var tagsEl   = document.getElementById('rev-prod-tags');
    var idEl     = document.getElementById('rev-prod-id');

    var title = titleEl ? titleEl.value : '';
    if (!title || !title.trim()) { _toast('Product title is required.'); return; }

    var rawTags = tagsEl ? tagsEl.value : '';
    var tags    = rawTags ? rawTags.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : [];

    var prod = {
      id:       (idEl && idEl.value) ? idEl.value : CommerceStore.genId(),
      title:    title.trim(),
      type:     (typeEl   && typeEl.value)   || 'Printable',
      platform: (platEl   && platEl.value)   || 'etsy',
      price:    parseFloat((priceEl && priceEl.value) || 0) || 0,
      status:   (statusEl && statusEl.value) || 'creating',
      revenue:  0,
      sales:    0,
      views:    0,
      tags:     tags,
      desc:     (descEl && descEl.value) || '',
      progress: 0,
      created:  Date.now()
    };

    CommerceStore.upsertProduct(prod);
    CommerceStore.pushLog('Maker', 'Product saved: ' + prod.title);
    _emit('commerce.product_created', { id: prod.id, title: prod.title, status: prod.status });

    if (prod.status === 'ready') {
      _orionSubmit({ id: 'appr' + Date.now(), type: 'publish_product', risk: 'reversible', title: prod.title, productId: prod.id, ts: Date.now() });
    }

    _toast('Product saved.');
    revCloseDrawers();
    RevPipeline.renderAll();

    var fields = ['rev-prod-id','rev-prod-title','rev-prod-price','rev-prod-desc','rev-prod-tags'];
    for (var f = 0; f < fields.length; f++) {
      var el = document.getElementById(fields[f]);
      if (el) { el.value = ''; }
    }
    var dbt = document.getElementById('rev-prod-delete-btn');
    if (dbt) { dbt.style.display = 'none'; }
    var dt = document.getElementById('rev-product-drawer-title');
    if (dt) { dt.textContent = 'NEW PRODUCT'; }
  };

  /* OPEN / EDIT PRODUCT */
  window.revOpenProduct = function (id) {
    var all = CommerceStore.getProducts();
    var p   = null;
    for (var i = 0; i < all.length; i++) { if (all[i].id === id) { p = all[i]; break; } }
    if (!p) { return; }

    var fields = {
      'rev-prod-id':     p.id,
      'rev-prod-title':  p.title,
      'rev-prod-type':   p.type,
      'rev-prod-platform': p.platform,
      'rev-prod-price':  p.price,
      'rev-prod-status': p.status,
      'rev-prod-desc':   p.desc,
      'rev-prod-tags':   (p.tags || []).join(', ')
    };
    for (var fid in fields) {
      var el = document.getElementById(fid);
      if (el) { el.value = fields[fid]; }
    }
    var dbt = document.getElementById('rev-prod-delete-btn');
    if (dbt) { dbt.style.display = 'block'; }
    var dt = document.getElementById('rev-product-drawer-title');
    if (dt) { dt.textContent = 'EDIT PRODUCT'; }
    revOpenDrawer('rev-drawer-product');
  };

  /* DELETE PRODUCT */
  window.revDeleteProduct = function () {
    var idEl = document.getElementById('rev-prod-id');
    var id   = idEl ? idEl.value : '';
    if (!id) { return; }
    CommerceStore.removeProduct(id);
    CommerceStore.pushLog('Maker', 'Product removed.');
    _toast('Product removed.');
    revCloseDrawers();
    RevPipeline.renderAll();
  };

  /* QUEUE LISTING */
  window.revQueueListing = function () {
    var selEl   = document.getElementById('rev-listing-product');
    var titleEl = document.getElementById('rev-listing-title');
    var priceEl = document.getElementById('rev-listing-price');
    var descEl  = document.getElementById('rev-listing-desc');

    var selId = selEl ? selEl.value : '';
    var title = titleEl ? titleEl.value : '';

    if (!selId) { _toast('Select a product first.'); return; }
    if (!title || !title.trim()) { _toast('Listing title is required.'); return; }

    var all = CommerceStore.getProducts();
    var prod = null;
    for (var i = 0; i < all.length; i++) { if (all[i].id === selId) { prod = all[i]; break; } }

    _orionSubmit({
      id:          'lst' + Date.now(),
      type:        'publish_listing',
      risk:        'irreversible',
      title:       title.trim(),
      productId:   selId,
      platform:    prod ? prod.platform : 'unknown',
      price:       priceEl ? priceEl.value : '',
      description: descEl  ? descEl.value  : '',
      ts:          Date.now()
    });

    revCloseDrawers();
    ['rev-listing-title','rev-listing-price','rev-listing-desc','rev-listing-tags'].forEach(function (fid) {
      var el = document.getElementById(fid);
      if (el) { el.value = ''; }
    });
  };

  /* QUEUE CAMPAIGN */
  window.revQueueCampaign = function () {
    var nameEl = document.getElementById('rev-camp-name');
    var name   = nameEl ? nameEl.value : '';
    if (!name || !name.trim()) { _toast('Campaign name is required.'); return; }

    var typeEl   = document.getElementById('rev-camp-type');
    var platEl   = document.getElementById('rev-camp-platform');
    var budgetEl = document.getElementById('rev-camp-budget');

    _orionSubmit({
      id:       'cmp' + Date.now(),
      type:     'launch_campaign',
      risk:     'irreversible',
      title:    name.trim(),
      platform: platEl  ? platEl.value  : '',
      budget:   budgetEl ? budgetEl.value : '0',
      ts:       Date.now()
    });

    revCloseDrawers();
    ['rev-camp-name','rev-camp-start','rev-camp-budget','rev-camp-notes'].forEach(function (fid) {
      var el = document.getElementById(fid);
      if (el) { el.value = ''; }
    });
  };

  /* APPROVE / DECLINE */
  window.revApprove = function (id) {
    var approvals = CommerceStore.getApprovals();
    var item = null;
    for (var i = 0; i < approvals.length; i++) { if (approvals[i].id === id) { item = approvals[i]; break; } }
    if (!item) { return; }

    var updated = approvals.filter(function (a) { return a.id !== id; });
    CommerceStore.saveApprovals(updated);

    var decisions = CommerceStore.getDecisions();
    decisions.unshift({ id: id, decision: 'approved', title: item.title, ts: Date.now() });
    CommerceStore.saveDecisions(decisions);

    CommerceStore.pushLog('CEO', 'Approved: ' + item.title);
    _emit('approval.completed', { id: id, decision: 'approved', department: 'commerce', title: item.title, ts: Date.now() });
    _emit('commerce.product_published', { id: id, title: item.title });

    if (item.type === 'publish_product' && item.productId) {
      var all = CommerceStore.getProducts();
      for (var j = 0; j < all.length; j++) {
        if (all[j].id === item.productId) { all[j].status = 'published'; all[j].progress = 100; break; }
      }
      CommerceStore.saveProducts(all);
    }

    RevSidebar.renderApprovals();
    RevSidebar.renderDecisions();
    RevPipeline.renderAll();
    RevSidebar.pushAlert('green', 'Approved: ' + item.title);
    _toast('Approved — ' + item.title);
  };

  window.revDecline = function (id) {
    var approvals = CommerceStore.getApprovals();
    var item = null;
    for (var i = 0; i < approvals.length; i++) { if (approvals[i].id === id) { item = approvals[i]; break; } }
    if (!item) { return; }

    var updated = approvals.filter(function (a) { return a.id !== id; });
    CommerceStore.saveApprovals(updated);

    var decisions = CommerceStore.getDecisions();
    decisions.unshift({ id: id, decision: 'declined', title: item.title, ts: Date.now() });
    CommerceStore.saveDecisions(decisions);

    CommerceStore.pushLog('CEO', 'Declined: ' + item.title);
    _emit('approval.completed', { id: id, decision: 'declined', department: 'commerce', title: item.title, ts: Date.now() });

    RevSidebar.renderApprovals();
    RevSidebar.renderDecisions();
    RevSidebar.pushAlert('red', 'Declined: ' + item.title);
    _toast('Declined — ' + item.title);
  };

  /* BOOT */
  document.addEventListener('DOMContentLoaded', function () {
    _ensureAgents();
    RevPipeline.renderAll();
    RevTrends.render();
    RevSidebar.renderDecisions();
    RevAgents.start();

    var ovs = document.querySelectorAll('.rev-drawer-ov');
    for (var i = 0; i < ovs.length; i++) {
      (function (ov) {
        ov.addEventListener('click', function (e) { if (e.target === ov) { revCloseDrawers(); } });
      }(ovs[i]));
    }

    CommerceStore.pushLog('RevenueAI', 'Revenue Operations Center loaded');
    _emit('commerce.workspace.ready', { ts: Date.now() });

    if (window.COS && COS.events) {
      try {
        COS.events.on('approval.completed', function (d) {
          if (d.department === 'commerce') { RevSidebar.renderApprovals(); RevSidebar.renderDecisions(); }
        });
      } catch (e) {}
    }
  });
}());
