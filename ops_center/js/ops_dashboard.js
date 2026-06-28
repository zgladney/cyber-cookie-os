/* CyberCookieOS — Operations Center v3 Dashboard */

// ── DATA ─────────────────────────────────────────────────────────

const DEPARTMENTS = [
  {
    id: 'security', name: 'SECURITY OPS', desc: 'Protect & Monitor',
    color: '#9b6bff', rgb: '155,107,255', icon: '🛡',
    room: '../hq/index.html',
    employees: [
      { id: 'threat_hunter', name: 'Athena',   title: 'Senior Threat Hunter',       img: '../assets/employees/athena/Athena (agent 001).png' },
      { id: 'cloud_monitor', name: 'Nimbus',   title: 'Cloud Monitor',               img: '../assets/employees/nimbus/Nimbus (agent 003).png' },
      { id: 'soc_analyst',   name: 'Sentinel', title: 'SOC Analyst',                 img: '../assets/employees/sentinel/Sentinel (agent 004).png' },
    ]
  },
  {
    id: 'housing', name: 'HOUSING', desc: 'Find Your Next Home',
    color: '#c4784a', rgb: '196,120,74', icon: '🏠',
    room: '../housing/index.html',
    employees: [
      { id: 'housing_scout',    name: 'Nova',   title: 'Housing Scout',            img: '../assets/employees/nova/Housing Scout Nova (agent 002).png' },
      { id: 'rental_assistant', name: 'Beacon', title: 'Rental Assistant',         img: null },
      { id: 'landlord_contact', name: 'Atlas',  title: 'Landlord Contact Specialist', img: '../assets/employees/atlas/Atlas (agent 005).png' },
    ]
  },
  {
    id: 'commerce', name: 'COMMERCE', desc: 'Create & Profit',
    color: '#ff69b4', rgb: '255,105,180', icon: '🛍',
    room: '../commerce/index.html',
    employees: [
      { id: 'trend_hunter',      name: 'Pixel',   title: 'Trend Hunter',        img: null },
      { id: 'etsy_manager',      name: 'EtsyBot', title: 'Etsy Manager',         img: null },
      { id: 'tiktok_researcher', name: 'Spark',   title: 'TikTok Researcher',    img: null },
      { id: 'pod_manager',       name: 'Forge',   title: 'POD Manager',          img: null },
    ]
  },
  {
    id: 'productivity', name: 'PRODUCTIVITY', desc: 'Plan & Organize',
    color: '#3aa8c8', rgb: '58,168,200', icon: '📅',
    room: '../productivity/index.html',
    employees: [
      { id: 'calendar_assistant', name: 'Calypso',      title: 'Calendar Assistant', img: null },
      { id: 'email_assistant',    name: 'Echo',          title: 'Email Assistant',    img: null },
      { id: 'task_manager',       name: 'Atlas Planner', title: 'Task Manager',       img: null },
      { id: 'reminder_assistant', name: 'Memo',          title: 'Reminder Assistant', img: null },
    ]
  },
  {
    id: 'finance', name: 'FINANCE', desc: 'Manage & Grow',
    color: '#2ecc71', rgb: '46,204,113', icon: '💰',
    room: '../finance/index.html',
    employees: [
      { id: 'finance_manager', name: 'Greenbean', title: 'Finance Manager', img: null },
      { id: 'bill_tracker',    name: 'Ledger',    title: 'Bill Tracker',    img: null },
      { id: 'budget_planner',  name: 'Penny',     title: 'Budget Planner',  img: null },
      { id: 'savings_tracker', name: 'Vault',     title: 'Savings Tracker', img: null },
    ]
  },
];

const DEPT_HEALTH = {
  security: { pct: 100, label: 'HEALTHY' },
  housing:  { pct: 95,  label: 'HEALTHY' },
  commerce: { pct: 92,  label: 'HEALTHY' },
  productivity: { pct: 98, label: 'HEALTHY' },
  finance:  { pct: 97,  label: 'HEALTHY' },
};

const NOTIFICATIONS = [
  'Athena detected a suspicious IP — 203.45.12.8 flagged.',
  'Nova found 3 new rental listings in Burlington County.',
  'Pixel discovered a trending Etsy niche: holographic stickers.',
  'Calypso synchronized the calendar for the week.',
  'Greenbean updated the monthly budget overview.',
  'Ledger flagged a subscription renewal due in 3 days.',
  '2 Cloud monitor alerts resolved by Nimbus.',
  'Sentinel completed overnight SOC sweep — all clear.',
];

const ACTIVITY_POOL = [
  { agent: 'Athena',    dept: 'security',    msg: 'Completed #IPv6 Traffic Sweep' },
  { agent: 'Nova',      dept: 'housing',     msg: 'Found 3 new rental listings' },
  { agent: 'Pixel',     dept: 'commerce',    msg: 'TikTok trend report generated' },
  { agent: 'Calypso',   dept: 'productivity',msg: 'Calendar synced successfully' },
  { agent: 'Greenbean', dept: 'finance',     msg: 'Budget report updated' },
  { agent: 'Nimbus',    dept: 'security',    msg: 'Cloud logs scan complete' },
  { agent: 'EtsyBot',   dept: 'commerce',    msg: 'New Etsy listings discovered' },
  { agent: 'Ledger',    dept: 'finance',     msg: 'Bill payment scheduled' },
  { agent: 'Echo',      dept: 'productivity',msg: 'Email inbox processed' },
  { agent: 'Beacon',    dept: 'housing',     msg: 'Rental comparison updated' },
  { agent: 'Sentinel',  dept: 'security',    msg: 'SOC sweep — no anomalies' },
  { agent: 'Spark',     dept: 'commerce',    msg: 'TikTok viral clip identified' },
  { agent: 'Atlas',     dept: 'housing',     msg: 'Landlord contact drafted' },
  { agent: 'Penny',     dept: 'finance',     msg: 'Budget category flagged' },
  { agent: 'Memo',      dept: 'productivity',msg: 'Reminder queued for 9 AM' },
];

// ── SIM STATE ────────────────────────────────────────────────────

const sim = {
  cpu:        28,
  ram:        44,
  tasks:      317,
  alerts:     2,
  running:    9,
  idle:       4,
  blocked:    2,
  startTime:  Date.now(),
};

const TOTAL_EMP = DEPARTMENTS.reduce(function(s, d) { return s + d.employees.length; }, 0);

// Graph history — 50 CPU samples
const graphHistory = [];
for (var i = 0; i < 50; i++) graphHistory.push(20 + Math.random() * 25);

// Activity feed (most recent 5)
const activityLog = [];
(function seedActivity() {
  var now = Date.now();
  var copy = ACTIVITY_POOL.slice();
  for (var i = copy.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
  }
  for (var k = 0; k < 5; k++) {
    var item = copy[k];
    var dt = new Date(now - (5 - k) * 60000 * (Math.random() * 3 + 1));
    activityLog.push({ agent: item.agent, dept: item.dept, msg: item.msg, time: dt });
  }
})();

// ── COLOR MAP ────────────────────────────────────────────────────

var deptColorMap = {};
DEPARTMENTS.forEach(function(d) { deptColorMap[d.id] = d.color; });

// ── CLOCK ────────────────────────────────────────────────────────

function startClock() {
  function tick() {
    var el = document.getElementById('oc-topClock');
    if (!el) return;
    el.textContent = new Date().toLocaleString([], {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
  tick();
  setInterval(tick, 1000);
}

// ── UPTIME ───────────────────────────────────────────────────────

function updateUptime() {
  var el = document.getElementById('sys-uptime');
  if (!el) return;
  var secs = Math.floor((Date.now() - sim.startTime) / 1000);
  var h = Math.floor(secs / 3600);
  var m = Math.floor((secs % 3600) / 60);
  var s = secs % 60;
  el.textContent = h + ':' + pad2(m) + ':' + pad2(s);
}

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

// ── SYSTEM GRAPH ─────────────────────────────────────────────────

function drawGraph() {
  var canvas = document.getElementById('oc-sysGraph');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Subtle grid
  ctx.strokeStyle = 'rgba(150,80,255,.08)';
  ctx.lineWidth = 1;
  for (var y = 0; y < H; y += H / 4) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Line
  var step = W / (graphHistory.length - 1);
  ctx.beginPath();
  graphHistory.forEach(function(v, i) {
    var x = i * step;
    var yp = H - (v / 100) * H;
    if (i === 0) ctx.moveTo(x, yp); else ctx.lineTo(x, yp);
  });
  ctx.strokeStyle = '#2ecc71';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#2ecc71';
  ctx.shadowBlur = 5;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Fill
  var lastX = (graphHistory.length - 1) * step;
  var lastY = H - (graphHistory[graphHistory.length - 1] / 100) * H;
  ctx.lineTo(lastX, H); ctx.lineTo(0, H); ctx.closePath();
  ctx.fillStyle = 'rgba(46,204,113,.07)';
  ctx.fill();
}

// ── SIM TICK (every 3s) ──────────────────────────────────────────

function simTick() {
  // CPU drift
  sim.cpu = clamp(sim.cpu + (Math.random() - 0.48) * 7, 8, 88);
  sim.ram = clamp(sim.ram + (Math.random() - 0.5)  * 3, 25, 75);

  // Push graph
  graphHistory.push(sim.cpu);
  if (graphHistory.length > 50) graphHistory.shift();
  drawGraph();

  // Update bars
  var cpuEl = document.getElementById('sys-cpu');
  var ramEl = document.getElementById('sys-ram');
  var cpuBar = document.getElementById('sysbar-cpu');
  var ramBar = document.getElementById('sysbar-ram');
  if (cpuEl)  cpuEl.textContent  = Math.round(sim.cpu) + '%';
  if (ramEl)  ramEl.textContent  = Math.round(sim.ram) + '%';
  if (cpuBar) cpuBar.style.width = Math.round(sim.cpu) + '%';
  if (ramBar) ramBar.style.width = Math.round(sim.ram) + '%';

  // Drift tasks
  if (Math.random() < 0.7) {
    sim.tasks += Math.floor(Math.random() * 3);
    setText('stat-tasks', sim.tasks.toLocaleString());
  }

  // Drift running/idle
  var total = sim.running + sim.idle + sim.blocked;
  if (Math.random() < 0.35 && sim.idle > 0) {
    sim.running++; sim.idle--;
  } else if (Math.random() < 0.25 && sim.running > 0) {
    sim.idle++; sim.running--;
  }
  setText('stat-running', sim.running);
  setText('stat-idle',    sim.idle);
  setText('stat-blocked', sim.blocked);

  // Health drift
  Object.keys(DEPT_HEALTH).forEach(function(k) {
    DEPT_HEALTH[k].pct = clamp(DEPT_HEALTH[k].pct + (Math.random() - 0.5) * 2, 85, 100);
  });
  renderDeptHealth();

  // Occasionally inject new activity
  if (Math.random() < 0.4) injectActivity();

  // Update last-updated time
  setText('stat-time', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  setText('stat-date', new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }));
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── ACTIVITY FEED ────────────────────────────────────────────────

function injectActivity() {
  var item = ACTIVITY_POOL[Math.floor(Math.random() * ACTIVITY_POOL.length)];
  activityLog.push({ agent: item.agent, dept: item.dept, msg: item.msg, time: new Date() });
  if (activityLog.length > 8) activityLog.shift();
  renderActivityFeed();
}

function renderActivityFeed() {
  var feed = document.getElementById('oc-activityFeed');
  if (!feed) return;
  feed.innerHTML = '';
  var items = activityLog.slice(-5).reverse();
  items.forEach(function(item) {
    var color = deptColorMap[item.dept] || '#9b6bff';
    var row = document.createElement('div');
    row.className = 'oc-actRow';
    row.style.setProperty('--act-color', color);
    var t = item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    row.innerHTML =
      '<span class="oc-actTime">' + t + '</span>' +
      '<span class="oc-actAgent">' + item.agent + '</span>' +
      '<span class="oc-actMsg">' + item.msg + '</span>';
    feed.appendChild(row);
  });
}

// ── DEPT HEALTH ──────────────────────────────────────────────────

function renderDeptHealth() {
  var list = document.getElementById('oc-healthList');
  if (!list) return;
  list.innerHTML = '';
  DEPARTMENTS.forEach(function(d) {
    var h = DEPT_HEALTH[d.id] || { pct: 100, label: 'HEALTHY' };
    var pct = Math.round(h.pct);
    var isAlert = pct < 90;
    var row = document.createElement('div');
    row.className = 'oc-healthRow';
    row.innerHTML =
      '<span class="oc-healthIcon">' + d.icon + '</span>' +
      '<span class="oc-healthName">' + d.name + '</span>' +
      '<div class="oc-healthPctWrap">' +
        '<span class="oc-healthPct" style="color:' + (isAlert ? '#ffdc32' : '#2ecc71') + '">' + pct + '%</span>' +
        '<span class="oc-healthTag' + (isAlert ? ' alert' : '') + '">' + (isAlert ? 'ATTENTION' : 'HEALTHY') + '</span>' +
      '</div>';
    list.appendChild(row);
  });
}

// ── NOTIFICATIONS ────────────────────────────────────────────────

var notifCount = 0;

function renderNotifications() {
  var list = document.getElementById('oc-notifList');
  if (!list) return;
  list.innerHTML = '';
  var shown = NOTIFICATIONS.slice(notifCount, notifCount + 3);
  if (shown.length === 0) { notifCount = 0; shown = NOTIFICATIONS.slice(0, 3); }
  shown.forEach(function(txt) {
    var row = document.createElement('div');
    row.className = 'oc-notifRow';
    row.innerHTML = '<div class="oc-notifDot"></div><span class="oc-notifText">' + txt + '</span>';
    list.appendChild(row);
  });
}

function rotateNotifications() {
  notifCount = (notifCount + 1) % NOTIFICATIONS.length;
  renderNotifications();
}

// ── DEPARTMENT ROOMS ─────────────────────────────────────────────

var ROOMS = [
  { id: 'security',    name: 'SECURITY OPS', desc: '// Protect & Monitor', color: '#9b6bff', room: '../hq/index.html',           char: '🕵' },
  { id: 'commerce',    name: 'COMMERCE',     desc: '// Create & Profit',   color: '#ff69b4', room: '../commerce/index.html',    char: '🛍' },
  { id: 'housing',     name: 'HOUSING',      desc: '// Find Your Home',    color: '#c4784a', room: '../housing/index.html',     char: '🏠' },
  { id: 'productivity',name: 'PRODUCTIVITY', desc: '// Plan & Organize',   color: '#3aa8c8', room: '../productivity/index.html',char: '📅' },
  { id: 'finance',     name: 'FINANCE',      desc: '// Manage & Grow',     color: '#2ecc71', room: '../finance/index.html',     char: '💰' },
  { id: 'ops',         name: 'OPS CENTER',   desc: '// Mission Control',   color: '#9cf6ff', room: './index.html',              char: '🏛' },
];

function buildRooms() {
  var grid = document.getElementById('oc-roomGrid');
  if (!grid) return;
  grid.innerHTML = '';
  ROOMS.forEach(function(r) {
    var card = document.createElement('div');
    card.className = 'oc-roomCard oc-room-' + r.id;
    card.style.setProperty('--rc-color', r.color);
    card.onclick = function() { window.location.href = r.room; };
    card.innerHTML =
      '<div class="oc-roomArt">' +
        '<div class="oc-roomFloor"></div>' +
        '<div class="oc-roomChar">' + r.char + '</div>' +
      '</div>' +
      '<div class="oc-roomInfo">' +
        '<span class="oc-roomName">' + r.name + '</span>' +
        '<span class="oc-roomDesc">' + r.desc + '</span>' +
        '<a class="oc-enterBtn" href="' + r.room + '">ENTER ROOM</a>' +
      '</div>';
    grid.appendChild(card);
  });
}

// ── EMPLOYEE DIRECTORY ────────────────────────────────────────────

var EMP_STATUS_POOL = ['running', 'running', 'running', 'idle', 'idle', 'idle', 'running', 'idle', 'running', 'idle'];
var empStatusMap = {};

function initEmpStatuses() {
  DEPARTMENTS.forEach(function(d) {
    d.employees.forEach(function(e, i) {
      empStatusMap[e.id] = EMP_STATUS_POOL[(d.employees.indexOf(e) + d.id.length) % EMP_STATUS_POOL.length];
    });
  });
}

function buildEmployeeDirectory() {
  var grid = document.getElementById('oc-empGrid');
  if (!grid) return;
  grid.innerHTML = '';
  DEPARTMENTS.forEach(function(d) {
    var col = document.createElement('div');
    col.className = 'oc-empDept';

    var header = document.createElement('div');
    header.className = 'oc-empDeptHeader';
    header.style.setProperty('--dept-color', d.color);
    header.style.setProperty('color', d.color);
    header.innerHTML = d.icon + ' ' + d.name;
    col.appendChild(header);

    d.employees.forEach(function(emp) {
      var status = empStatusMap[emp.id] || 'idle';
      var card = document.createElement('div');
      card.className = 'oc-empCard';
      card.style.setProperty('--dept-color', d.color);

      var avatarWrap = document.createElement('div');
      avatarWrap.className = 'oc-empAvatarWrap';

      if (emp.img) {
        var img = document.createElement('img');
        img.className = 'oc-empImg';
        img.src = emp.img;
        img.alt = emp.name;
        img.onerror = function() {
          this.style.display = 'none';
          avatarWrap.appendChild(makePlaceholder(emp.name, d.color));
        };
        avatarWrap.appendChild(img);
      } else {
        avatarWrap.appendChild(makePlaceholder(emp.name, d.color));
      }

      card.appendChild(avatarWrap);

      var info = document.createElement('div');
      info.className = 'oc-empInfo';
      info.innerHTML =
        '<div class="oc-empName">' + emp.name + '</div>' +
        '<div class="oc-empTitle">' + emp.title + '</div>' +
        '<div class="oc-empStatusRow">' +
          '<div class="oc-empDot ' + status + '"></div>' +
          '<span class="oc-empStatus ' + status + '">' + status.toUpperCase() + '</span>' +
        '</div>' +
        '<div class="oc-empBtns">' +
          '<button class="oc-dlBtn" onclick="downloadAvatar(\'' + (emp.img || '') + '\', \'' + emp.name + '\')">DOWNLOAD &#8595;</button>' +
          '<button class="oc-profileBtn" disabled title="Coming soon">PROFILE</button>' +
        '</div>';
      card.appendChild(info);

      col.appendChild(card);
    });

    grid.appendChild(col);
  });
}

function makePlaceholder(name, color) {
  var ph = document.createElement('div');
  ph.className = 'oc-empPlaceholder';
  ph.style.setProperty('--dept-color', color);
  ph.setAttribute('data-initial', name.charAt(0));
  return ph;
}

function downloadAvatar(src, name) {
  if (!src) { alert(name + '\'s avatar artwork is coming soon!'); return; }
  var a = document.createElement('a');
  a.href = src;
  a.download = name.replace(/\s+/g, '_') + '_avatar.png';
  a.click();
}

function driftEmpStatuses() {
  DEPARTMENTS.forEach(function(d) {
    d.employees.forEach(function(e) {
      if (Math.random() < 0.15) {
        var states = ['running', 'idle'];
        empStatusMap[e.id] = states[Math.floor(Math.random() * states.length)];
      }
    });
  });
  // Re-render employee status dots without full rebuild
  var dots  = document.querySelectorAll('.oc-empDot');
  var texts = document.querySelectorAll('.oc-empStatus');
  var allEmps = [];
  DEPARTMENTS.forEach(function(d) { d.employees.forEach(function(e) { allEmps.push(e); }); });
  allEmps.forEach(function(e, idx) {
    var s = empStatusMap[e.id] || 'idle';
    if (dots[idx])  { dots[idx].className  = 'oc-empDot ' + s; }
    if (texts[idx]) { texts[idx].className = 'oc-empStatus ' + s; texts[idx].textContent = s.toUpperCase(); }
  });
}

// ── HELPERS ──────────────────────────────────────────────────────

function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── INIT ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  startClock();
  initEmpStatuses();

  // Static renders
  buildRooms();
  buildEmployeeDirectory();
  renderActivityFeed();
  renderDeptHealth();
  renderNotifications();
  drawGraph();

  // Initial stat display
  setText('stat-total',   TOTAL_EMP);
  setText('stat-running', sim.running);
  setText('stat-idle',    sim.idle);
  setText('stat-blocked', sim.blocked);
  setText('stat-tasks',   sim.tasks.toLocaleString());
  setText('stat-alerts',  sim.alerts);
  setText('stat-time',    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  setText('stat-date',    new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }));

  // Uptime tick
  setInterval(updateUptime, 1000);
  updateUptime();

  // Sim ticks
  setInterval(simTick, 3000);
  setInterval(rotateNotifications, 10000);
  setInterval(driftEmpStatuses, 8000);

  // View All button toggle
  var viewAllBtn = document.querySelector('.oc-viewAllBtn');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', function() {
      var list = document.getElementById('oc-notifList');
      if (!list) return;
      if (this.dataset.expanded === '1') {
        this.dataset.expanded = '';
        this.textContent = 'VIEW ALL';
        renderNotifications();
      } else {
        this.dataset.expanded = '1';
        this.textContent = 'SHOW LESS';
        list.innerHTML = '';
        NOTIFICATIONS.forEach(function(txt) {
          var row = document.createElement('div');
          row.className = 'oc-notifRow';
          row.innerHTML = '<div class="oc-notifDot"></div><span class="oc-notifText">' + txt + '</span>';
          list.appendChild(row);
        });
      }
    });
  }
});
