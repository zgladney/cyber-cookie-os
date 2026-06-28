/* CyberCookieOS — Operations Center Dashboard v3 */

const STATUS_URL = '../data/agent_status.json';
const POLL_MS    = 5000;

const DEPARTMENTS = [
  {
    id: 'security', name: 'SECURITY OPS', color: '#6B35D5', icon: '🛡', room: '../hq/index.html',
    employees: [
      { id: 'threat_hunter',  name: 'Athena',    title: 'Threat Hunter'  },
      { id: 'cloud_monitor',  name: 'Nimbus',    title: 'Cloud Monitor'  },
      { id: 'soc_analyst',    name: 'Sentinel',  title: 'SOC Analyst'    },
    ]
  },
  {
    id: 'housing', name: 'HOUSING', color: '#C4784A', icon: '🏠', room: '../housing/index.html',
    employees: [
      { id: 'housing_scout',    name: 'Nova',    title: 'Housing Scout'    },
      { id: 'rental_assistant', name: 'Beacon',  title: 'Rental Assistant' },
      { id: 'landlord_contact', name: 'Atlas',   title: 'Landlord Contact' },
    ]
  },
  {
    id: 'commerce', name: 'COMMERCE', color: '#FF69B4', icon: '🛍', room: '../commerce/index.html',
    employees: [
      { id: 'trend_hunter',      name: 'Pixel',   title: 'Trend Hunter'     },
      { id: 'etsy_manager',      name: 'EtsyBot', title: 'Etsy Manager'     },
      { id: 'tiktok_researcher', name: 'Spark',   title: 'TikTok Research'  },
      { id: 'pod_manager',       name: 'Forge',   title: 'POD Manager'      },
    ]
  },
  {
    id: 'productivity', name: 'PRODUCTIVITY', color: '#3AA8C8', icon: '📅', room: '../productivity/index.html',
    employees: [
      { id: 'calendar_assistant', name: 'Calypso',     title: 'Calendar Asst'  },
      { id: 'email_assistant',    name: 'Echo',         title: 'Email Asst'     },
      { id: 'task_manager',       name: 'Atlas P.',     title: 'Task Manager'   },
      { id: 'reminder_assistant', name: 'Memo',         title: 'Reminder Asst'  },
    ]
  },
  {
    id: 'finance', name: 'FINANCE', color: '#2ECC71', icon: '💰', room: '../finance/index.html',
    employees: [
      { id: 'finance_manager', name: 'Greenbean', title: 'Finance Mgr'    },
      { id: 'bill_tracker',    name: 'Ledger',    title: 'Bill Tracker'   },
      { id: 'budget_planner',  name: 'Penny',     title: 'Budget Planner' },
      { id: 'savings_tracker', name: 'Vault',     title: 'Savings Tracker'},
    ]
  },
];

// ── NOTIFICATIONS QUEUE ──────────────────────────────────────

const NOTIFICATIONS = [
  'All systems nominal. CyberCookieOS operational.',
  'Housing Scout — Nova is monitoring Burlington Co, NJ.',
  'Security Ops — Athena is watching for threats.',
  'Commerce — Pixel tracking trending products.',
  'Finance — Greenbean maintaining budget overview.',
  'Productivity — Calypso keeping the schedule.',
  'Polling agent status every 5 seconds.',
];

let notifIdx = 0;

function rotateNotification() {
  const el = document.getElementById('oc-notifText');
  if (!el) return;
  notifIdx = (notifIdx + 1) % NOTIFICATIONS.length;
  el.style.opacity = '0';
  setTimeout(function () {
    el.textContent = NOTIFICATIONS[notifIdx];
    el.style.opacity = '1';
  }, 300);
}

// ── HELPERS ──────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (_) { return null; }
}

function statusLabel(s) {
  return { idle: 'IDLE', running: 'RUNNING', blocked: 'BLOCKED', completed: 'DONE', failed: 'FAILED' }[s] || 'IDLE';
}

// ── BUILD DEPARTMENT CARD ────────────────────────────────────

function buildCard(dept, statuses) {
  const card = document.createElement('div');
  card.className = 'oc-deptCard';
  card.style.setProperty('--dept-color', dept.color);

  // Clickable header → department room
  const header = document.createElement('div');
  header.className = 'oc-deptHeader';
  header.style.cursor = 'pointer';
  header.title = 'Open ' + dept.name + ' room';
  header.onclick = function () { window.location.href = dept.room; };
  header.innerHTML = `
    <span class="oc-deptIcon">${dept.icon}</span>
    <span class="oc-deptName">${dept.name}</span>
    <span class="oc-agentCount">${dept.employees.length} EMPLOYEES</span>
  `;
  card.appendChild(header);

  // Dept health summary
  const empStats = { running: 0, idle: 0, blocked: 0, completed: 0 };
  dept.employees.forEach(function (emp) {
    const s = (statuses[emp.id] || {}).status || 'idle';
    empStats[s] = (empStats[s] || 0) + 1;
  });

  const summary = document.createElement('div');
  summary.className = 'oc-deptSummary';
  summary.innerHTML =
    `<span class="oc-sum-idle">IDLE <b>${empStats.idle}</b></span>` +
    (empStats.running   ? `<span class="oc-sum-running">RUN <b>${empStats.running}</b></span>` : '') +
    (empStats.blocked   ? `<span class="oc-sum-blocked">BLK <b>${empStats.blocked}</b></span>` : '') +
    (empStats.completed ? `<span class="oc-sum-done">DONE <b>${empStats.completed}</b></span>` : '');
  card.appendChild(summary);

  // Employee list
  const list = document.createElement('div');
  list.className = 'oc-agentList';

  for (const emp of dept.employees) {
    const st    = statuses[emp.id] || {};
    const s     = st.status || 'idle';
    const last  = fmtTime(st.last_run);
    const label = statusLabel(s);
    const task  = st.current_task || '';

    const row = document.createElement('div');
    row.className = 'oc-agentRow';
    row.title = task || emp.title;
    row.innerHTML = `
      <div class="oc-dot oc-dot-${s}"></div>
      <span class="oc-empName">${emp.name}</span>
      <span class="oc-empTitle">${emp.title}</span>
      <span class="oc-statusBadge oc-badge-${s}">${label}</span>
      ${last ? `<span class="oc-lastTime">${last}</span>` : ''}
    `;
    list.appendChild(row);
  }

  card.appendChild(list);

  // Enter room link
  const roomLink = document.createElement('a');
  roomLink.className = 'oc-roomLink';
  roomLink.href = dept.room;
  roomLink.textContent = 'ENTER ' + dept.name + ' ROOM →';
  card.appendChild(roomLink);

  return card;
}

// ── MISSION CONTROL BAR ──────────────────────────────────────

function updateMissionBar(statuses) {
  const all    = Object.values(statuses);
  const counts = { idle: 0, running: 0, completed: 0, failed: 0, blocked: 0 };
  all.forEach(function (a) {
    const s = a.status || 'idle';
    counts[s] = (counts[s] || 0) + 1;
  });

  setText('mc-total',     all.length);
  setText('mc-running',   counts.running);
  setText('mc-idle',      counts.idle);
  setText('mc-blocked',   counts.blocked);
  setText('mc-completed', counts.completed);
  setText('mc-alerts',    counts.blocked + counts.failed);

  const health = document.getElementById('mc-health');
  if (health) {
    if (counts.blocked > 0 || counts.failed > 0) {
      health.textContent = 'ALERT';
      health.className = 'oc-mVal oc-health-alert';
    } else if (counts.running > 0) {
      health.textContent = 'ACTIVE';
      health.className = 'oc-mVal oc-health-active';
    } else {
      health.textContent = 'OK';
      health.className = 'oc-mVal oc-health-ok';
    }
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── RENDER ───────────────────────────────────────────────────

function renderDashboard(statuses) {
  const grid = document.getElementById('oc-grid');
  grid.innerHTML = '';
  for (const dept of DEPARTMENTS) {
    grid.appendChild(buildCard(dept, statuses));
  }
  updateMissionBar(statuses);
}

// ── POLL ─────────────────────────────────────────────────────

async function pollStatus() {
  try {
    const res  = await fetch(STATUS_URL + '?t=' + Date.now());
    const data = await res.json();
    renderDashboard(data.agents || {});
    const now = new Date().toLocaleTimeString();
    setText('oc-lastUpdated', now);
    setText('oc-footerTime',  now);
  } catch (_) {
    renderDashboard({});
    setText('oc-lastUpdated', 'ERROR');
  }
}

// ── CLOCK ────────────────────────────────────────────────────

function startClock() {
  const el = document.getElementById('oc-clock');
  function tick() {
    el.textContent = new Date().toLocaleString([], {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
  tick();
  setInterval(tick, 1000);
}

// ── INIT ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  startClock();
  pollStatus();
  setInterval(pollStatus, POLL_MS);
  setInterval(rotateNotification, 8000);
});
