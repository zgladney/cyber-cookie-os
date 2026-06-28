/* CyberCookieOS — Operations Center Dashboard */

const STATUS_URL   = '../data/agent_status.json';
const POLL_MS      = 5000;

const DEPARTMENTS = [
  {
    id: 'security', name: 'SECURITY OPS', color: '#6B35D5', icon: '🛡',
    agents: [
      { id: 'threat_hunter',  name: 'Threat Hunter'  },
      { id: 'cloud_monitor',  name: 'Cloud Monitor'  },
      { id: 'soc_analyst',    name: 'SOC Analyst'    },
    ]
  },
  {
    id: 'housing', name: 'HOUSING', color: '#C4784A', icon: '🏠',
    agents: [
      { id: 'housing_scout',    name: 'Housing Scout'    },
      { id: 'rental_assistant', name: 'Rental Assistant' },
      { id: 'landlord_contact', name: 'Landlord Contact' },
    ]
  },
  {
    id: 'commerce', name: 'COMMERCE', color: '#FF69B4', icon: '📈',
    agents: [
      { id: 'trend_hunter',     name: 'Trend Hunter'     },
      { id: 'etsy_manager',     name: 'Etsy Manager'     },
      { id: 'tiktok_researcher',name: 'TikTok Researcher'},
      { id: 'pod_manager',      name: 'POD Manager'      },
    ]
  },
  {
    id: 'productivity', name: 'PRODUCTIVITY', color: '#3AA8C8', icon: '📅',
    agents: [
      { id: 'calendar_assistant', name: 'Calendar Asst'    },
      { id: 'email_assistant',    name: 'Email Assistant'  },
      { id: 'task_manager',       name: 'Task Manager'     },
      { id: 'reminder_assistant', name: 'Reminder Asst'    },
    ]
  },
  {
    id: 'finance', name: 'FINANCE', color: '#2ECC71', icon: '💰',
    agents: [
      { id: 'finance_manager', name: 'Finance Manager' },
      { id: 'bill_tracker',    name: 'Bill Tracker'    },
      { id: 'budget_planner',  name: 'Budget Planner'  },
      { id: 'savings_tracker', name: 'Savings Tracker' },
    ]
  },
];

function fmtTime(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (_) { return null; }
}

function statusLabel(s) {
  return { idle: 'IDLE', running: 'RUNNING', blocked: 'BLOCKED', completed: 'DONE', failed: 'FAILED' }[s] || 'IDLE';
}

function buildCard(dept, statuses) {
  const card = document.createElement('div');
  card.className = 'oc-deptCard';
  card.style.setProperty('--dept-color', dept.color);

  // Header
  const header = document.createElement('div');
  header.className = 'oc-deptHeader';
  header.innerHTML = `
    <span class="oc-deptIcon">${dept.icon}</span>
    <span class="oc-deptName">${dept.name}</span>
    <span class="oc-agentCount">${dept.agents.length} AGENTS</span>
  `;
  card.appendChild(header);

  // Agent list
  const list = document.createElement('div');
  list.className = 'oc-agentList';

  for (const ag of dept.agents) {
    const st   = (statuses[ag.id] || {});
    const s    = st.status || 'idle';
    const last = fmtTime(st.last_run);
    const label = statusLabel(s);

    const row = document.createElement('div');
    row.className = 'oc-agentRow';
    row.innerHTML = `
      <div class="oc-dot oc-dot-${s}"></div>
      <span class="oc-agentName">${ag.name}${last ? ' <span style="opacity:.35;font-size:7px">· ' + last + '</span>' : ''}</span>
      <span class="oc-statusBadge oc-badge-${s}">${label}</span>
    `;
    list.appendChild(row);
  }

  card.appendChild(list);
  return card;
}

function updateStatusLine(statuses) {
  const all    = Object.values(statuses);
  const counts = { idle: 0, running: 0, completed: 0, failed: 0, blocked: 0 };
  all.forEach(a => { const s = a.status || 'idle'; counts[s] = (counts[s] || 0) + 1; });
  const total = all.length;

  document.getElementById('oc-statusLine').innerHTML =
    `<span>TOTAL <b>${total}</b></span>` +
    `<span class="oc-stat-idle">IDLE <b>${counts.idle}</b></span>` +
    `<span class="oc-stat-running">RUNNING <b>${counts.running}</b></span>` +
    `<span class="oc-stat-done">DONE <b>${counts.completed}</b></span>` +
    (counts.failed  ? `<span class="oc-stat-fail">FAILED <b>${counts.failed}</b></span>`  : '') +
    (counts.blocked ? `<span class="oc-stat-fail">BLOCKED <b>${counts.blocked}</b></span>` : '');
}

function renderDashboard(statuses) {
  const grid = document.getElementById('oc-grid');
  grid.innerHTML = '';
  for (const dept of DEPARTMENTS) {
    grid.appendChild(buildCard(dept, statuses));
  }
  updateStatusLine(statuses);
}

async function pollStatus() {
  try {
    const res  = await fetch(STATUS_URL + '?t=' + Date.now());
    const data = await res.json();
    renderDashboard(data.agents || {});
    document.getElementById('oc-lastUpdated').textContent =
      new Date().toLocaleTimeString();
  } catch (_) {
    renderDashboard({});
  }
}

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

document.addEventListener('DOMContentLoaded', () => {
  startClock();
  pollStatus();
  setInterval(pollStatus, POLL_MS);
});
