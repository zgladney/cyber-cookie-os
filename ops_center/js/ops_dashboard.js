/* CyberCookieOS — Operations Center Dashboard v3.1
   Powered by COS core module (../js/cybercookieos.js).
   This file is the controller/renderer only — all data lives in COS. */

// ── CONSTANTS ────────────────────────────────────────────────────

var DEPT_ORDER    = ['security', 'housing', 'commerce', 'productivity', 'finance'];
var STATUS_URL    = '../data/agent_status.json';
var POLL_MS       = 5000;
var TOTAL_EMPLOYEES = 18;

// Department room configs for the 6-card grid
var ROOM_CONFIGS = [
  { id: 'security',    name: 'SECURITY OPS', desc: '// Protect & Monitor', color: '#9b6bff', room: '../hq/index.html' },
  { id: 'commerce',    name: 'COMMERCE',     desc: '// Create & Profit',   color: '#ff69b4', room: '../commerce/index.html' },
  { id: 'housing',     name: 'HOUSING',      desc: '// Find Your Home',    color: '#c4784a', room: '../housing/index.html' },
  { id: 'productivity',name: 'PRODUCTIVITY', desc: '// Plan & Organize',   color: '#3aa8c8', room: '../productivity/index.html' },
  { id: 'finance',     name: 'FINANCE',      desc: '// Manage & Grow',     color: '#2ecc71', room: '../finance/index.html' },
  { id: 'ops',         name: 'OPS CENTER',   desc: '// Mission Control',   color: '#9cf6ff', room: './index.html' },
];

// ── SIMULATION STATE ─────────────────────────────────────────────

var sim = {
  cpu:       28,
  ram:       44,
  tasks:     317,
  alerts:    2,
  running:   9,
  idle:      7,
  blocked:   2,
  startTime: Date.now(),
};

var deptHealth = { security: 100, housing: 95, commerce: 92, productivity: 98, finance: 97 };

// Per-employee simulated states
var empStates = {};

function initEmpStates() {
  var statusPool = ['running','running','running','running','idle','idle','idle','blocked'];
  var taskPool = {
    athena:       ['Scanning IPv6 threats', 'Classifying suspicious IPs', 'Generating report'],
    nimbus:       ['Monitoring cloud logs', 'Checking service uptime', 'Reviewing metrics'],
    sentinel:     ['Triaging alert queue', 'Coordinating SOC', 'Reviewing incidents'],
    nova:         ['Searching listings', 'Filtering voucher homes', 'Ranking matches'],
    beacon:       ['Comparing prices', 'Monitoring availability', 'Tracking history'],
    atlas:        ['Drafting inquiries', 'Tracking responses', 'Updating contacts'],
    pixel:        ['Analyzing TikTok trends', 'Researching niches', 'Generating report'],
    etsybot:      ['Optimizing listings', 'Writing descriptions', 'Analyzing store'],
    spark:        ['Researching viral clips', 'Tracking hashtags', 'Writing briefs'],
    forge:        ['Managing inventory', 'Tracking production', 'Reviewing orders'],
    calypso:      ['Syncing calendar', 'Scheduling meetings', 'Setting reminders'],
    echo:         ['Processing inbox', 'Drafting replies', 'Summarizing threads'],
    atlas_planner:['Updating timelines', 'Assigning tasks', 'Reviewing blockers'],
    memo:         ['Queuing reminders', 'Tracking follow-ups', 'Sending alerts'],
    greenbean:    ['Generating budget report', 'Reviewing income', 'Analyzing trends'],
    ledger:       ['Tracking bills', 'Auditing subscriptions', 'Confirming payments'],
    penny:        ['Analyzing spending', 'Updating budgets', 'Flagging overages'],
    vault:        ['Tracking savings', 'Projecting goals', 'Reporting milestones'],
  };
  Object.keys(COS.employees).forEach(function (id, i) {
    var status = statusPool[i % statusPool.length];
    var tasks  = taskPool[id] || ['Working'];
    empStates[id] = {
      status:    status,
      task:      tasks[Math.floor(Math.random() * tasks.length)],
      cpu:       5  + Math.random() * 40,
      mem:       64 + Math.random() * 192,
      runtime:   Math.floor(Math.random() * 7200),
      lastActive: new Date(),
      _tasks:    tasks,
    };
    // Persist status so profile pages can read it
    COS.state.set('emp.' + id + '.status', status);
  });
}

// ── GRAPH (canvas) ────────────────────────────────────────────────

var graphHistory = [];
for (var _g = 0; _g < 50; _g++) graphHistory.push(18 + Math.random() * 28);

function drawGraph() {
  var canvas = document.getElementById('oc-sysGraph');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(150,80,255,.07)';
  ctx.lineWidth = 1;
  for (var y = 0; y < H; y += H / 4) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Line
  var step = W / (graphHistory.length - 1);
  ctx.beginPath();
  graphHistory.forEach(function (v, i) {
    var x = i * step, yp = H - (v / 100) * H;
    i === 0 ? ctx.moveTo(x, yp) : ctx.lineTo(x, yp);
  });
  ctx.strokeStyle = '#2ecc71';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#2ecc71';
  ctx.shadowBlur = 4;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Fill under line
  var lastPt = graphHistory.length - 1;
  ctx.lineTo(lastPt * step, H); ctx.lineTo(0, H); ctx.closePath();
  ctx.fillStyle = 'rgba(46,204,113,.06)';
  ctx.fill();
}

// ── CLOCK ─────────────────────────────────────────────────────────

function startClock() {
  function tick() {
    var el = document.getElementById('oc-topClock');
    if (el) el.textContent = new Date().toLocaleString([], {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }
  tick(); setInterval(tick, 1000);
}

// ── UPTIME ────────────────────────────────────────────────────────

function updateUptime() {
  var el = document.getElementById('sys-uptime');
  if (!el) return;
  var secs = Math.floor((Date.now() - sim.startTime) / 1000);
  el.textContent = Math.floor(secs / 3600) + ':' + p2(Math.floor((secs % 3600) / 60)) + ':' + p2(secs % 60);
}

// ── ANIMATED COUNTER ──────────────────────────────────────────────

function countUp(el, from, to, ms) {
  if (!el) return;
  var start = Date.now();
  var ease  = function (t) { return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; };
  var step  = function () {
    var p = Math.min((Date.now() - start) / ms, 1);
    el.textContent = Math.round(from + (to - from) * ease(p)).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ── TOAST ──────────────────────────────────────────────────────────

var _toastTimer = null;
function showToast(msg, colorVar) {
  var t = document.getElementById('oc-toast');
  if (!t) return;
  t.textContent = msg;
  t.style.borderLeftColor = colorVar || '#ff69b4';
  t.classList.add('oc-toast-visible');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function () { t.classList.remove('oc-toast-visible'); }, 2800);
}

// ── INTEGRATIONS PANEL ────────────────────────────────────────────

function buildIntegrations() {
  var list = document.getElementById('oc-intList');
  if (!list) return;
  var labels = { active: 'ACTIVE', disconnected: 'DISCONNECTED', not_configured: 'NOT CONFIGURED', auth_required: 'NEEDS AUTH' };
  var cls    = { active: 'oc-int-active', disconnected: 'oc-int-disconnected', not_configured: 'oc-int-none', auth_required: 'oc-int-auth' };
  COS.integrations.forEach(function (intg) {
    var row = document.createElement('div');
    row.className = 'oc-intRow';
    row.innerHTML =
      '<span class="oc-intName">' + intg.name + '</span>' +
      '<span class="oc-intStatus ' + (cls[intg.status] || 'oc-int-none') + '">' + (labels[intg.status] || intg.status.toUpperCase()) + '</span>';
    list.appendChild(row);
  });
}

// ── DEPT HEALTH ───────────────────────────────────────────────────

function renderDeptHealth() {
  var list = document.getElementById('oc-healthList');
  if (!list) return;
  list.innerHTML = '';
  DEPT_ORDER.forEach(function (deptId) {
    var d   = COS.departments[deptId] || {};
    var pct = Math.round(deptHealth[deptId] || 100);
    var ok  = pct >= 90;
    var row = document.createElement('div');
    row.className = 'oc-healthRow';
    row.innerHTML =
      '<span class="oc-healthIcon">' + (d.icon || '') + '</span>' +
      '<span class="oc-healthName">' + (d.short || deptId.toUpperCase()) + '</span>' +
      '<div class="oc-healthPctWrap">' +
        '<span class="oc-healthPct" style="color:' + (ok ? '#2ecc71' : '#ffdc32') + '">' + pct + '%</span>' +
        '<span class="oc-healthTag' + (ok ? '' : ' alert') + '">' + (ok ? 'HEALTHY' : 'ATTENTION') + '</span>' +
      '</div>';
    list.appendChild(row);
  });
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────

var _notifExpanded = false;

function renderNotifications() {
  var list = document.getElementById('oc-notifList');
  if (!list) return;
  var all = COS.notifications.get(false);
  var shown = _notifExpanded ? all : all.slice(0, 3);
  list.innerHTML = '';
  if (!shown.length) {
    list.innerHTML = '<div style="font-size:8px;color:rgba(200,150,255,.3);padding:6px 0">No new notifications.</div>';
    return;
  }
  shown.forEach(function (n) {
    var row = document.createElement('div');
    row.className = 'oc-notifRow';
    row.innerHTML =
      '<div class="oc-notifDot"></div>' +
      '<span class="oc-notifText">' + n.text + '</span>' +
      '<button class="oc-notifDismiss" data-id="' + n.id + '" title="Dismiss">&times;</button>';
    list.appendChild(row);
  });

  // Dismiss handlers
  list.querySelectorAll('.oc-notifDismiss').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var id = this.dataset.id;
      COS.notifications.dismiss(id);
      COS.activity.log({ agent: 'System', dept: 'ops', msg: 'Notification dismissed.', source: 'user' });
      renderNotifications();
      showToast('Notification dismissed.', '#9b6bff');
    });
  });
}

// ── ACTIVITY FEED ─────────────────────────────────────────────────

var _activityItems = [];  // in-memory for current session

function seedActivity() {
  // Only seed if the activity log is empty (first run / cleared storage)
  if (COS.activity.get(1).length > 0) return;
  var pool = [
    { agent: 'Athena',    dept: 'security',     msg: 'Completed #IPv6 Traffic Sweep' },
    { agent: 'Nova',      dept: 'housing',      msg: 'Found 3 new rental listings' },
    { agent: 'Pixel',     dept: 'commerce',     msg: 'TikTok trend report generated' },
    { agent: 'Calypso',   dept: 'productivity', msg: 'Calendar synced successfully' },
    { agent: 'Greenbean', dept: 'finance',      msg: 'Budget report updated' },
  ];
  pool.forEach(function (item) {
    COS.activity.log({ agent: item.agent, dept: item.dept, msg: item.msg, source: 'sim' });
  });
}

function addActivityEntry(item, animate) {
  var feed = document.getElementById('oc-activityFeed');
  if (!feed) return;

  var color = (COS.departments[item.dept] || {}).color || '#9b6bff';
  var row = document.createElement('div');
  row.className = 'oc-actRow' + (animate ? ' oc-actRow-new' : '');
  row.style.setProperty('--act-color', color);
  var t = new Date(item.ts || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  row.innerHTML =
    '<span class="oc-actTime">' + t + '</span>' +
    '<span class="oc-actAgent">' + (item.agent || 'System') + '</span>' +
    '<span class="oc-actMsg">' + item.msg + '</span>';

  feed.insertBefore(row, feed.firstChild);
  while (feed.children.length > 6) feed.removeChild(feed.lastChild);
}

function refreshActivityFeed() {
  var feed = document.getElementById('oc-activityFeed');
  if (!feed) return;
  feed.innerHTML = '';
  _activityItems.slice(-6).reverse().forEach(function (item) { addActivityEntry(item, false); });
}

// Listen for real events from COS
function wireActivityEvents() {
  COS.events.on('activity:new', function (item) {
    _activityItems.push(item);
    if (_activityItems.length > 50) _activityItems.shift();
    addActivityEntry(item, true);
    // update time display
    var now = new Date();
    setText('stat-time', now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setText('stat-date', now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }));
  });
  COS.events.on('notifications:changed', function () { renderNotifications(); });
}

// ── DEPARTMENT ROOMS ──────────────────────────────────────────────

function buildRooms() {
  var grid = document.getElementById('oc-roomGrid');
  if (!grid) return;
  grid.innerHTML = '';
  ROOM_CONFIGS.forEach(function (r) {
    var card = document.createElement('div');
    card.className = 'oc-roomCard oc-room-' + r.id;
    card.style.setProperty('--rc-color', r.color);
    card.addEventListener('click', function () {
      COS.activity.log({ agent: 'System', dept: r.id === 'ops' ? 'ops' : r.id, msg: r.name + ' room opened.', source: 'user' });
      window.location.href = r.room;
    });
    card.innerHTML =
      '<div class="oc-roomArt"><div class="oc-roomFloor"></div></div>' +
      '<div class="oc-roomInfo">' +
        '<span class="oc-roomName">' + r.name + '</span>' +
        '<span class="oc-roomDesc">' + r.desc + '</span>' +
        '<a class="oc-enterBtn" href="' + r.room + '" onclick="event.stopPropagation()">ENTER ROOM</a>' +
      '</div>';
    grid.appendChild(card);
  });
}

// ── EMPLOYEE DIRECTORY ────────────────────────────────────────────

var _empFilter = { query: '', dept: 'all', sort: 'dept' };

function buildEmployeeDirectory() {
  var grid = document.getElementById('oc-empGrid');
  if (!grid) return;

  // Gather all employees respecting filter
  var allEmps = [];
  DEPT_ORDER.forEach(function (deptId) {
    var ids = COS.deptEmployees[deptId] || [];
    ids.forEach(function (id) {
      var emp  = COS.employees[id];
      var dept = COS.departments[deptId];
      if (!emp) return;
      var q = _empFilter.query.toLowerCase();
      if (q && !emp.name.toLowerCase().includes(q) && !emp.title.toLowerCase().includes(q)) return;
      if (_empFilter.dept !== 'all' && deptId !== _empFilter.dept) return;
      allEmps.push({ id: id, emp: emp, dept: dept, deptId: deptId });
    });
  });

  // Sort
  if (_empFilter.sort === 'name') {
    allEmps.sort(function (a, b) { return a.emp.name.localeCompare(b.emp.name); });
  } else if (_empFilter.sort === 'status') {
    var order = { running: 0, blocked: 1, idle: 2 };
    allEmps.sort(function (a, b) {
      return (order[(empStates[a.id] || {}).status] || 2) - (order[(empStates[b.id] || {}).status] || 2);
    });
  }
  // 'dept' sort is already in dept order

  var noResults = document.getElementById('oc-empNoResults');

  if (!allEmps.length) {
    grid.innerHTML = '';
    if (noResults) noResults.style.display = 'block';
    return;
  }
  if (noResults) noResults.style.display = 'none';

  if (_empFilter.dept !== 'all' || _empFilter.sort !== 'dept') {
    // Flat grid when filtering
    grid.style.display = 'flex';
    grid.style.flexWrap = 'wrap';
    grid.style.gap = '10px';
    grid.innerHTML = '';
    allEmps.forEach(function (item) {
      var card = buildEmpCard(item.id, item.emp, item.dept);
      card.style.width = '160px';
      grid.appendChild(card);
    });
  } else {
    // Default: department columns
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(5, 1fr)';
    grid.style.gap = '14px';
    grid.innerHTML = '';
    DEPT_ORDER.forEach(function (deptId) {
      var dept = COS.departments[deptId];
      var ids  = COS.deptEmployees[deptId] || [];
      var col = document.createElement('div');
      col.className = 'oc-empDept';

      var header = document.createElement('div');
      header.className = 'oc-empDeptHeader';
      header.style.setProperty('--dept-color', dept.color);
      header.style.color = dept.color;
      header.innerHTML = dept.icon + ' ' + dept.short;
      col.appendChild(header);

      ids.forEach(function (id) {
        var emp = COS.employees[id];
        if (emp) col.appendChild(buildEmpCard(id, emp, dept));
      });
      grid.appendChild(col);
    });
  }
}

function buildEmpCard(id, emp, dept) {
  var st    = empStates[id] || { status: 'idle', task: '—', cpu: 0, mem: 64, runtime: 0 };
  var color = dept ? dept.color : '#9b6bff';

  var card = document.createElement('div');
  card.className = 'oc-empCard';
  card.style.setProperty('--dept-color', color);

  // Avatar
  var avatarWrap = document.createElement('div');
  avatarWrap.className = 'oc-empAvatarWrap';

  if (emp.hasArt && emp.imgSrc) {
    var img = document.createElement('img');
    img.className = 'oc-empImg';
    img.src = emp.imgSrc;
    img.alt = emp.name;
    img.loading = 'lazy';
    img.onerror = function () {
      this.style.display = 'none';
      avatarWrap.appendChild(makePlaceholder(emp.name, color));
    };
    avatarWrap.appendChild(img);
  } else {
    avatarWrap.appendChild(makePlaceholder(emp.name, color));
  }
  card.appendChild(avatarWrap);

  // Info
  var info = document.createElement('div');
  info.className = 'oc-empInfo';

  var statusClass = st.status === 'running' ? 'running' : (st.status === 'blocked' ? 'blocked' : 'idle');
  var taskText    = st.status === 'idle' ? 'Waiting for task' : st.task;
  var runtime     = formatRuntime(st.runtime);
  var cpu         = Math.round(st.cpu || 0);

  info.innerHTML =
    '<div class="oc-empName">' + emp.name + '</div>' +
    '<div class="oc-empTitle">' + emp.title + '</div>' +
    '<div class="oc-empStatusRow">' +
      '<div class="oc-empDot ' + statusClass + '"></div>' +
      '<span class="oc-empStatus ' + statusClass + '">' + st.status.toUpperCase() + '</span>' +
    '</div>' +
    '<div class="oc-empTask">' + taskText + '</div>' +
    '<div class="oc-empMeta"><span>CPU ' + cpu + '%</span><span>' + runtime + '</span></div>' +
    '<div class="oc-empBtns">' +
      buildDlBtn(emp, color) +
      '<button class="oc-profileBtn" data-id="' + id + '">PROFILE</button>' +
    '</div>';

  card.appendChild(info);

  // Wire profile button
  var profileBtn = info.querySelector('.oc-profileBtn');
  if (profileBtn) {
    profileBtn.removeAttribute('disabled');
    profileBtn.addEventListener('click', function () {
      COS.activity.log({ agent: emp.name, dept: emp.dept, msg: 'Profile viewed from Ops Center.', source: 'user' });
      showToast('Opening ' + emp.name + '\'s profile…', color);
      setTimeout(function () { window.location.href = '../employees/profile.html?id=' + id; }, 300);
    });
  }

  return card;
}

function buildDlBtn(emp, color) {
  if (!emp.hasArt || !emp.imgSrc) {
    return '<button class="oc-dlBtn" style="opacity:.35;cursor:default;border-color:rgba(255,255,255,.08);color:rgba(255,255,255,.2)" disabled>ARTWORK PENDING</button>';
  }
  return '<button class="oc-dlBtn" data-src="' + emp.imgSrc + '" data-name="' + emp.name + '">DOWNLOAD &#8595;</button>';
}

function makePlaceholder(name, color) {
  var ph = document.createElement('div');
  ph.className = 'oc-empPlaceholder';
  ph.style.setProperty('--dept-color', color);
  ph.setAttribute('data-initial', name.charAt(0));
  return ph;
}

function formatRuntime(secs) {
  if (!secs) return '0:00';
  var h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return h ? h + ':' + p2(m) + ':' + p2(s) : m + ':' + p2(s);
}

// Wire download buttons (event delegation)
function wireDownloads() {
  var grid = document.getElementById('oc-empGrid');
  if (!grid) return;
  grid.addEventListener('click', function (e) {
    var btn = e.target.closest('.oc-dlBtn');
    if (!btn || btn.disabled) return;
    var src  = btn.dataset.src;
    var name = btn.dataset.name;
    if (!src) { showToast('Artwork coming soon for ' + (name || 'this employee') + '.', '#ffdc32'); return; }
    var a = document.createElement('a');
    a.href = src; a.download = name.replace(/\s+/g, '_') + '_avatar.png';
    a.click();
    COS.activity.log({ agent: name, dept: 'ops', msg: 'Avatar downloaded.', source: 'user' });
    showToast(name + ' avatar downloaded!', '#2ecc71');
  });
}

// ── EMPLOYEE SEARCH & FILTER ──────────────────────────────────────

function wireSearch() {
  var input   = document.getElementById('empSearchInput');
  var filters = document.querySelectorAll('.empFilter');
  var sortSel = document.getElementById('empSortSelect');

  if (input) {
    input.addEventListener('input', function () {
      _empFilter.query = this.value.trim();
      buildEmployeeDirectory();
    });
  }

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filters.forEach(function (b) { b.classList.remove('empFilterActive'); });
      this.classList.add('empFilterActive');
      _empFilter.dept = this.dataset.dept;
      buildEmployeeDirectory();
    });
  });

  if (sortSel) {
    sortSel.addEventListener('change', function () {
      _empFilter.sort = this.value;
      buildEmployeeDirectory();
    });
  }
}

// ── VIEW ALL NOTIFICATIONS ────────────────────────────────────────

function wireViewAll() {
  var btn = document.querySelector('.oc-viewAllBtn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    _notifExpanded = !_notifExpanded;
    this.textContent = _notifExpanded ? 'SHOW LESS' : 'VIEW ALL';
    renderNotifications();
  });
}

// ── SIMULATION TICK (every 3s) ────────────────────────────────────

var _actPool = [
  { agent: 'Athena',    dept: 'security',     msg: 'Completed #IPv6 Traffic Sweep' },
  { agent: 'Nova',      dept: 'housing',      msg: 'Found 3 new rental listings' },
  { agent: 'Pixel',     dept: 'commerce',     msg: 'TikTok trend report generated' },
  { agent: 'Calypso',   dept: 'productivity', msg: 'Calendar synced successfully' },
  { agent: 'Greenbean', dept: 'finance',      msg: 'Budget report updated' },
  { agent: 'Nimbus',    dept: 'security',     msg: 'Cloud logs scan complete' },
  { agent: 'EtsyBot',   dept: 'commerce',     msg: 'New Etsy listings discovered' },
  { agent: 'Ledger',    dept: 'finance',      msg: 'Bill payment scheduled' },
  { agent: 'Echo',      dept: 'productivity', msg: 'Email inbox processed' },
  { agent: 'Beacon',    dept: 'housing',      msg: 'Rental comparison updated' },
  { agent: 'Sentinel',  dept: 'security',     msg: 'SOC sweep — no anomalies' },
  { agent: 'Spark',     dept: 'commerce',     msg: 'TikTok viral clip identified' },
  { agent: 'Atlas',     dept: 'housing',      msg: 'Landlord contact drafted' },
  { agent: 'Penny',     dept: 'finance',      msg: 'Budget category flagged' },
  { agent: 'Memo',      dept: 'productivity', msg: 'Reminder queued for 9 AM' },
  { agent: 'Forge',     dept: 'commerce',     msg: 'Production timeline updated' },
  { agent: 'Vault',     dept: 'finance',      msg: 'Savings goal progress logged' },
  { agent: 'Atlas Planner', dept: 'productivity', msg: 'Project timeline updated' },
];

function simTick() {
  // CPU / RAM drift
  sim.cpu = clamp(sim.cpu + (Math.random() - 0.48) * 7, 8, 88);
  sim.ram = clamp(sim.ram + (Math.random() - 0.5)  * 3, 25, 75);

  // Boost when ART departments are running
  if (typeof ART !== 'undefined' && ART.isAnyRunning()) {
    var artRunDepts = ART.DEPTS.filter(function (d) { return ART.getDeptState(d) === 'running'; }).length;
    sim.cpu = clamp(sim.cpu + artRunDepts * 5, 8, 94);
    sim.ram = clamp(sim.ram + artRunDepts * 2, 25, 86);
  }

  graphHistory.push(sim.cpu);
  if (graphHistory.length > 50) graphHistory.shift();
  drawGraph();

  var cpuEl  = document.getElementById('sys-cpu');
  var ramEl  = document.getElementById('sys-ram');
  var cpuBar = document.getElementById('sysbar-cpu');
  var ramBar = document.getElementById('sysbar-ram');
  if (cpuEl)  cpuEl.textContent  = Math.round(sim.cpu) + '%';
  if (ramEl)  ramEl.textContent  = Math.round(sim.ram) + '%';
  if (cpuBar) cpuBar.style.width = Math.round(sim.cpu) + '%';
  if (ramBar) ramBar.style.width = Math.round(sim.ram) + '%';

  // Tasks counter
  if (Math.random() < 0.7) {
    sim.tasks += Math.floor(Math.random() * 3);
    var tasksEl = document.getElementById('stat-tasks');
    if (tasksEl) tasksEl.textContent = sim.tasks.toLocaleString();
  }

  // Running/idle drift
  if (Math.random() < 0.3 && sim.idle > 0)   { sim.running++; sim.idle--; }
  else if (Math.random() < 0.2 && sim.running > 0) { sim.idle++; sim.running--; }
  setText('stat-running', sim.running);
  setText('stat-idle',    sim.idle);
  setText('stat-blocked', sim.blocked);

  // Health drift
  DEPT_ORDER.forEach(function (k) {
    deptHealth[k] = clamp(deptHealth[k] + (Math.random() - 0.5) * 2, 85, 100);
  });
  renderDeptHealth();

  // Employee state drift
  Object.keys(empStates).forEach(function (id) {
    var s = empStates[id];
    s.runtime += 3;
    s.cpu = clamp(s.cpu + (Math.random() - 0.5) * 4, 2, 90);
    if (Math.random() < 0.1) {
      var pool = ['running', 'running', 'idle'];
      s.status = pool[Math.floor(Math.random() * pool.length)];
      COS.state.set('emp.' + id + '.status', s.status);
    }
    if (Math.random() < 0.08) {
      s.task = s._tasks[Math.floor(Math.random() * s._tasks.length)];
    }
    s.lastActive = new Date();
  });

  // Inject activity entry ~40% of ticks
  if (Math.random() < 0.4) {
    var item = _actPool[Math.floor(Math.random() * _actPool.length)];
    COS.activity.log({ agent: item.agent, dept: item.dept, msg: item.msg, source: 'sim' });
  }
}

// ── PERIODIC UI REFRESHES ─────────────────────────────────────────

function driftEmpCards() {
  // Update only status dots and task text — avoid full rebuild
  document.querySelectorAll('.oc-empCard').forEach(function (card) {
    var profileBtn = card.querySelector('.oc-profileBtn');
    if (!profileBtn) return;
    var id = profileBtn.dataset.id;
    var s  = empStates[id];
    if (!s) return;
    // ART controls this employee's card — skip sim drift
    if (typeof ART !== 'undefined' && COS.employees[id]) {
      var dSt = ART.getDeptState(COS.employees[id].dept);
      if (dSt === 'running' || dSt === 'paused') return;
    }
    var dot    = card.querySelector('.oc-empDot');
    var status = card.querySelector('.oc-empStatus');
    var task   = card.querySelector('.oc-empTask');
    var meta   = card.querySelector('.oc-empMeta');
    var sc     = s.status === 'running' ? 'running' : (s.status === 'blocked' ? 'blocked' : 'idle');
    if (dot)    { dot.className    = 'oc-empDot ' + sc; }
    if (status) { status.className = 'oc-empStatus ' + sc; status.textContent = s.status.toUpperCase(); }
    if (task)   { task.textContent = s.status === 'idle' ? 'Waiting for task' : s.task; }
    if (meta) {
      var spans = meta.querySelectorAll('span');
      if (spans[0]) spans[0].textContent = 'CPU ' + Math.round(s.cpu) + '%';
      if (spans[1]) spans[1].textContent = formatRuntime(s.runtime);
    }
  });
}

// ── AGENT STATUS POLL (real JSON if available) ────────────────────

async function pollAgentStatus() {
  try {
    var res  = await fetch(STATUS_URL + '?t=' + Date.now());
    var data = await res.json();
    var agents = data.agents || {};
    Object.keys(agents).forEach(function (agentId) {
      // Try to find matching employee by agent id (field names match)
      var s = agents[agentId];
      // Map agent_id → employee id
      var empId = agentIdToEmpId(agentId);
      if (empId && empStates[empId]) {
        empStates[empId].status = s.status || 'idle';
        empStates[empId].task   = s.current_task || empStates[empId].task;
      }
    });
  } catch (_) { /* no status file — sim data only */ }
}

function agentIdToEmpId(agentId) {
  var map = {
    threat_hunter:      'athena',
    cloud_monitor:      'nimbus',
    soc_analyst:        'sentinel',
    housing_scout:      'nova',
    rental_assistant:   'beacon',
    landlord_contact:   'atlas',
    trend_hunter:       'pixel',
    etsy_manager:       'etsybot',
    tiktok_researcher:  'spark',
    pod_manager:        'forge',
    calendar_assistant: 'calypso',
    email_assistant:    'echo',
    task_manager:       'atlas_planner',
    reminder_assistant: 'memo',
    finance_manager:    'greenbean',
    bill_tracker:       'ledger',
    budget_planner:     'penny',
    savings_tracker:    'vault',
  };
  return map[agentId] || null;
}

// ── AGENT RUNTIME ENGINE INTEGRATION ─────────────────────────────

function wireARTEvents() {
  if (typeof ART === 'undefined') return;

  var runBtn   = document.getElementById('btn-runHQ');
  var pauseBtn = document.getElementById('btn-pauseAll');
  var stopBtn  = document.getElementById('btn-stopAll');
  if (runBtn)   runBtn.addEventListener('click',   function () { ART.runAll();   updateARTStatus(); });
  if (pauseBtn) pauseBtn.addEventListener('click', function () { ART.pauseAll(); updateARTStatus(); });
  if (stopBtn)  stopBtn.addEventListener('click',  function () { ART.stopAll();  updateARTStatus(); });

  COS.events.on('agent:stateChange', function (e) { artUpdateEmpCard(e.id, e.s); });
  COS.events.on('runtime:metrics',   function ()  { updateARTStatus(); });
  COS.events.on('dept:stateChange',  function ()  { updateARTStatus(); });
  COS.events.on('dept:complete',     function ()  { updateARTStatus(); });
  COS.events.on('output:created',    function ()  { updateDeliverablesFeed(); updateReportStats(); });
}

function updateARTStatus() {
  if (typeof ART === 'undefined') return;
  var metrics  = ART.getMetrics();
  var running  = ART.DEPTS.filter(function (d) { return ART.getDeptState(d) === 'running'; }).length;
  var paused   = ART.DEPTS.filter(function (d) { return ART.getDeptState(d) === 'paused'; }).length;
  var active   = running + paused;

  var stateEl = document.getElementById('oc-rt-state');
  if (stateEl) {
    if (running === 5)      { stateEl.textContent = '● ALL SYSTEMS GO'; stateEl.style.color = '#2ecc71'; }
    else if (running > 0)   { stateEl.textContent = '● RUNNING';        stateEl.style.color = '#ffdc32'; }
    else if (paused  > 0)   { stateEl.textContent = '⏸ PAUSED';         stateEl.style.color = '#9cf6ff'; }
    else                    { stateEl.textContent = '● STANDBY';         stateEl.style.color = 'rgba(200,160,255,.4)'; }
  }
  setText('oc-rt-depts', active > 0 ? active + ' dept' + (active !== 1 ? 's' : '') + ' active' : 'All departments idle');
  setText('oc-rt-tasks', metrics.totalCompleted + ' task' + (metrics.totalCompleted !== 1 ? 's' : '') + ' completed');
  setText('oc-rt-errors', metrics.totalErrors + ' error' + (metrics.totalErrors !== 1 ? 's' : ''));

  var runBtn   = document.getElementById('btn-runHQ');
  var pauseBtn = document.getElementById('btn-pauseAll');
  var stopBtn  = document.getElementById('btn-stopAll');
  if (runBtn)   runBtn.disabled   = (running === 5);
  if (pauseBtn) pauseBtn.disabled = (running === 0);
  if (stopBtn)  stopBtn.disabled  = (active  === 0);

  // Keep task counter in sync
  if (metrics.totalCompleted > 0) {
    var newTotal = 317 + metrics.totalCompleted;
    if (newTotal > sim.tasks) {
      sim.tasks = newTotal;
      var el = document.getElementById('stat-tasks');
      if (el) el.textContent = sim.tasks.toLocaleString();
    }
  }

  // Reflect ART running count in big stats
  if (active > 0) {
    var artRunning = 0;
    Object.keys(COS.employees).forEach(function (id) {
      var st = ART.getEmpState(id).state;
      if (st === 'running') artRunning++;
    });
    setText('stat-running', artRunning);
  }
}

function artUpdateEmpCard(empId, s) {
  document.querySelectorAll('.oc-empCard').forEach(function (card) {
    var profileBtn = card.querySelector('.oc-profileBtn');
    if (!profileBtn || profileBtn.dataset.id !== empId) return;
    var dot    = card.querySelector('.oc-empDot');
    var status = card.querySelector('.oc-empStatus');
    var task   = card.querySelector('.oc-empTask');
    var meta   = card.querySelector('.oc-empMeta');
    var st     = s.state || 'idle';
    var sc     = st === 'running' ? 'running' : (st === 'error' ? 'blocked' : 'idle');
    if (dot)    { dot.className = 'oc-empDot ' + sc; }
    if (status) { status.className = 'oc-empStatus ' + sc; status.textContent = st.toUpperCase(); }
    if (task)   {
      task.textContent = s.task
        ? (s.step || s.task) + (s.progress > 0 && s.progress < 100 ? ' (' + s.progress + '%)' : '')
        : (st === 'completed' ? 'Task complete ✓' : 'Waiting for task');
    }
    if (meta) {
      var spans = meta.querySelectorAll('span');
      var est   = empStates[empId];
      if (spans[0]) spans[0].textContent = est ? 'CPU ' + Math.round(est.cpu) + '%' : 'CPU —';
      if (spans[1]) spans[1].textContent = st === 'running' ? '▶ ART ACTIVE' : formatRuntime(est ? est.runtime : 0);
    }
  });
}

// ── DELIVERABLES FEED (Ops Center overview panel) ────────────────

function updateDeliverablesFeed() {
  if (typeof OE === 'undefined') return;
  var feedEl = document.getElementById('oc-delivFeed');
  if (!feedEl) return;
  var recent = OE.getRecent(5);
  if (!recent.length) {
    feedEl.innerHTML = '<div style="font-size:8px;color:rgba(200,160,255,.2);text-align:center;padding:12px">No deliverables yet — run agents to generate outputs.</div>';
    return;
  }
  feedEl.innerHTML = recent.map(function (o) {
    var DEPT_COLORS = { security:'#9b6bff', housing:'#c4784a', commerce:'#ff69b4', productivity:'#3aa8c8', finance:'#2ecc71' };
    var color = DEPT_COLORS[o.dept] || '#9b6bff';
    var diff  = Math.floor((Date.now() - o.ts) / 1000);
    var ago   = diff < 60 ? diff + 's' : diff < 3600 ? Math.floor(diff/60) + 'm' : Math.floor(diff/3600) + 'h';
    return (
      '<div class="oc-delivRow">' +
        '<span class="oc-delivDot" style="background:' + color + ';box-shadow:0 0 5px ' + color + '"></span>' +
        '<span class="oc-delivAgent">' + o.agentName + '</span>' +
        '<span class="oc-delivSummary">' + o.summary + '</span>' +
        '<span class="oc-delivTime">' + ago + '</span>' +
      '</div>'
    );
  }).join('');
}

function updateReportStats() {
  if (typeof OE === 'undefined') return;
  var count    = OE.getTodayCount();
  var topAgent = OE.getTopAgent();
  setText('stat-reports', count);
  setText('stat-topAgent', topAgent ? topAgent.name + ' ×' + topAgent.count : '—');
}

// ── HELPERS ───────────────────────────────────────────────────────

function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function p2(n) { return n < 10 ? '0' + n : '' + n; }

// ── INIT ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {

  // Add toast element
  var toast = document.createElement('div');
  toast.id = 'oc-toast';
  document.body.appendChild(toast);

  // Initialize employee simulation states
  initEmpStates();

  // Seed activity log only if empty (no events wired yet — no duplicates)
  seedActivity();

  // Build all static sections
  startClock();
  buildIntegrations();
  buildRooms();
  buildEmployeeDirectory();
  renderDeptHealth();
  renderNotifications();
  drawGraph();

  // Initial stats (animate counters from 0)
  var totalEl   = document.getElementById('stat-total');
  var runningEl = document.getElementById('stat-running');
  var idleEl    = document.getElementById('stat-idle');
  var blockedEl = document.getElementById('stat-blocked');
  var tasksEl   = document.getElementById('stat-tasks');

  if (totalEl)   countUp(totalEl,   0, TOTAL_EMPLOYEES, 800);
  if (runningEl) countUp(runningEl, 0, sim.running, 600);
  if (idleEl)    countUp(idleEl,    0, sim.idle,    700);
  if (blockedEl) countUp(blockedEl, 0, sim.blocked, 500);
  if (tasksEl)   countUp(tasksEl,   0, sim.tasks,  1200);

  setText('stat-alerts', sim.alerts);
  var now = new Date();
  setText('stat-time', now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  setText('stat-date', now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }));

  // Populate activity feed from storage (single pass, no duplication)
  COS.activity.get(6).slice().reverse().forEach(function (e) {
    _activityItems.push(e);
    addActivityEntry(e, false);
  });

  // Wire interactions
  wireDownloads();
  wireSearch();
  wireViewAll();

  // Restore last-used department filter (must be after wireSearch registers handlers)
  var lastDept = COS.state.get('pref.lastDept');
  if (lastDept && lastDept !== 'all') {
    var f = document.querySelector('.empFilter[data-dept="' + lastDept + '"]');
    if (f) f.click();
  }

  // Wire live events AFTER initial render (prevents duplication on seed)
  wireActivityEvents();

  // Wire ART command buttons and live employee card updates
  wireARTEvents();

  // Initial deliverables feed and report stats (populated from stored OE data)
  updateDeliverablesFeed();
  updateReportStats();

  // Uptime
  setInterval(updateUptime, 1000);
  updateUptime();

  // Sim ticks
  setInterval(simTick, 3000);
  setInterval(driftEmpCards, 5000);
  setInterval(pollAgentStatus, POLL_MS);

  // Save last-used department filter on nav
  document.querySelectorAll('.empFilter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      COS.state.set('pref.lastDept', this.dataset.dept);
    });
  });

  // Track room opens
  document.querySelectorAll('.oc-enterBtn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      COS.state.set('pref.lastRoomOpened', this.href);
    });
  });
});
