/* CyberCookieOS — Hallway Agent Status Board */

const AGENT_STATUS_URL = '../data/agent_status.json';
const POLL_INTERVAL_MS = 5000;

const STATUS_META = {
  idle:      { label: 'IDLE',      cssClass: 'hw-s-idle'      },
  running:   { label: 'RUNNING',   cssClass: 'hw-s-running'   },
  blocked:   { label: 'BLOCKED',   cssClass: 'hw-s-blocked'   },
  completed: { label: 'COMPLETED', cssClass: 'hw-s-completed' },
  failed:    { label: 'FAILED',    cssClass: 'hw-s-failed'    },
};

const AGENT_META = [
  { id: 'threat_hunter',     icon: '🛡', name: 'THREAT HUNTER'    },
  { id: 'housing_scout',     icon: '🏠', name: 'HOUSING SCOUT'    },
  { id: 'trend_hunter',      icon: '📈', name: 'TREND HUNTER'     },
  { id: 'calendar_assistant',icon: '📅', name: 'CALENDAR ASST'    },
  { id: 'cloud_monitor',     icon: '☁', name: 'CLOUD MONITOR'    },
];

function fmtTime(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mn = String(d.getMinutes()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd} ${hh}:${mn}`;
  } catch (_) {
    return isoStr.slice(0, 16);
  }
}

function renderBoard(agentStatuses) {
  const board = document.getElementById('hw-agentRows');
  if (!board) return;

  board.innerHTML = '';

  for (const meta of AGENT_META) {
    const st   = (agentStatuses && agentStatuses[meta.id]) || {};
    const sKey = st.status || 'idle';
    const sInfo = STATUS_META[sKey] || STATUS_META.idle;
    const lastRun = fmtTime(st.last_run);

    const row = document.createElement('div');
    row.className = 'hw-agentRow';
    row.innerHTML = `
      <span class="hw-aIcon">${meta.icon}</span>
      <span class="hw-aName">${meta.name}</span>
      <span class="hw-aStatus ${sInfo.cssClass}">● ${sInfo.label}</span>
      <span class="hw-aTime">${lastRun}</span>
    `;
    board.appendChild(row);
  }
}

async function pollStatus() {
  try {
    const res  = await fetch(AGENT_STATUS_URL + '?t=' + Date.now());
    const data = await res.json();
    renderBoard(data.agents || {});
  } catch (_) {
    // If file can't be fetched, render with idle defaults
    renderBoard({});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  pollStatus();
  setInterval(pollStatus, POLL_INTERVAL_MS);
});
