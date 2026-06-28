/* CyberCookieOS — Agent Runtime UI (Department Rooms)
   Detects the current dept, injects execution panel, wires buttons, listens to ART events.
   Requires: COS, ART (both loaded before this file) */

(function () {
  'use strict';

  if (typeof ART === 'undefined' || typeof COS === 'undefined') return;

  // ── DETECT DEPARTMENT ─────────────────────────────────────────────
  var PATH_MAP = {
    '/hq':           'security',
    '/housing':      'housing',
    '/commerce':     'commerce',
    '/productivity': 'productivity',
    '/finance':      'finance',
  };

  var path   = window.location.pathname;
  var deptId = null;
  Object.keys(PATH_MAP).forEach(function (k) {
    if (path.indexOf(k) !== -1) deptId = PATH_MAP[k];
  });
  if (!deptId) return;

  var dept      = COS.departments[deptId] || {};
  var deptColor = dept.color || '#9b6bff';
  var agents    = COS.deptEmployees[deptId] || [];
  var p         = deptId;

  // ── PANEL HTML ───────────────────────────────────────────────────
  function buildPanelHTML() {
    return (
      '<div class="ws-exec-panel" id="' + p + '-execPanel" style="--exec-color:' + deptColor + '">' +

        '<div class="ws-exec-header">' +
          '<span class="ws-exec-title">EXECUTION PANEL</span>' +
          '<div class="ws-exec-ctrlBtns">' +
            '<button class="ws-btn ws-exec-run"   data-dept="' + p + '">▶ RUN DEPT</button>' +
            '<button class="ws-btn ws-exec-pause" data-dept="' + p + '" disabled>⏸ PAUSE</button>' +
            '<button class="ws-btn ws-exec-stop"  data-dept="' + p + '" disabled>⏹ STOP</button>' +
          '</div>' +
        '</div>' +

        '<div class="ws-exec-statusRow">' +
          '<span class="ws-exec-stateBadge ws-exec-state-idle" id="' + p + '-execState">IDLE</span>' +
          '<span class="ws-exec-metaText" id="' + p + '-execMeta">Press RUN DEPT to start all agents</span>' +
        '</div>' +

        '<div class="ws-exec-agentList" id="' + p + '-execAgents"></div>' +

        '<div class="ws-exec-statsRow">' +
          '<span class="ws-exec-statBox"><span id="' + p + '-execDone">0</span><span class="ws-exec-statLabel">DONE</span></span>' +
          '<span class="ws-exec-statBox"><span id="' + p + '-execErrors">0</span><span class="ws-exec-statLabel">ERRORS</span></span>' +
          '<span class="ws-exec-statBox"><span id="' + p + '-execPending">0</span><span class="ws-exec-statLabel">QUEUED</span></span>' +
        '</div>' +

      '</div>'
    );
  }

  function buildAgentRows() {
    var container = document.getElementById(p + '-execAgents');
    if (!container) return;
    container.innerHTML = '';
    agents.forEach(function (empId) {
      var emp = COS.employees[empId] || {};
      var row = document.createElement('div');
      row.className = 'ws-exec-agentRow';
      row.id        = 'art-row-' + empId;
      row.innerHTML =
        '<span class="ws-exec-dot ws-exec-dot-idle" id="art-dot-' + empId + '"></span>' +
        '<span class="ws-exec-agentName">' + (emp.name || empId) + '</span>' +
        '<span class="ws-exec-taskText" id="art-task-' + empId + '">—</span>' +
        '<div class="ws-exec-barWrap">' +
          '<div class="ws-exec-bar" id="art-bar-' + empId + '" style="width:0%"></div>' +
        '</div>' +
        '<span class="ws-exec-pct" id="art-pct-' + empId + '">0%</span>';
      container.appendChild(row);
    });
  }

  // ── RENDER HELPERS ────────────────────────────────────────────────
  function updateAgentRow(empId, s) {
    var dotEl  = document.getElementById('art-dot-' + empId);
    var taskEl = document.getElementById('art-task-' + empId);
    var barEl  = document.getElementById('art-bar-' + empId);
    var pctEl  = document.getElementById('art-pct-' + empId);
    if (!dotEl) return;

    var st = s.state || 'idle';
    dotEl.className = 'ws-exec-dot ws-exec-dot-' + st;

    if (taskEl) {
      if (s.task) {
        taskEl.textContent = s.step || s.task;
      } else {
        taskEl.textContent = st === 'idle' ? '—' : st === 'completed' ? '✓ Done' : st;
      }
    }
    if (barEl) barEl.style.width = (s.progress || 0) + '%';
    if (pctEl) pctEl.textContent = (s.progress || 0) + '%';
  }

  function updatePanel() {
    var stateEl  = document.getElementById(p + '-execState');
    var metaEl   = document.getElementById(p + '-execMeta');
    var doneEl   = document.getElementById(p + '-execDone');
    var errEl    = document.getElementById(p + '-execErrors');
    var pendEl   = document.getElementById(p + '-execPending');
    var dState   = ART.getDeptState(deptId);
    var metrics  = ART.getMetrics().byDept[deptId] || {};
    var queue    = ART.getQueue(deptId);
    var queuedCt = queue.filter(function (t) { return t.status === 'queued'; }).length;
    var runCt    = queue.filter(function (t) { return t.status === 'running'; }).length;

    if (stateEl) {
      stateEl.textContent = dState.toUpperCase();
      stateEl.className   = 'ws-exec-stateBadge ws-exec-state-' + dState;
    }
    if (metaEl) {
      if (dState === 'running') {
        metaEl.textContent = runCt + ' agent' + (runCt !== 1 ? 's' : '') + ' active · ' + queuedCt + ' task' + (queuedCt !== 1 ? 's' : '') + ' queued';
      } else if (dState === 'paused') {
        metaEl.textContent = 'Paused — ' + queuedCt + ' task' + (queuedCt !== 1 ? 's' : '') + ' remaining';
      } else {
        metaEl.textContent = dState === 'idle' && (metrics.completed || 0) > 0
          ? 'Completed ' + metrics.completed + ' task' + (metrics.completed !== 1 ? 's' : '') + ' this run'
          : 'Press RUN DEPT to start all agents';
      }
    }
    if (doneEl) doneEl.textContent = metrics.completed || 0;
    if (errEl)  errEl.textContent  = metrics.errors    || 0;
    if (pendEl) pendEl.textContent = queuedCt;

    // Button states
    var runBtn   = document.querySelector('.ws-exec-run[data-dept="' + deptId + '"]');
    var pauseBtn = document.querySelector('.ws-exec-pause[data-dept="' + deptId + '"]');
    var stopBtn  = document.querySelector('.ws-exec-stop[data-dept="' + deptId + '"]');
    if (runBtn)   { runBtn.disabled   = (dState === 'running'); runBtn.textContent = dState === 'paused' ? '▶ RESUME' : '▶ RUN DEPT'; }
    if (pauseBtn)   pauseBtn.disabled = (dState !== 'running');
    if (stopBtn)    stopBtn.disabled  = (dState === 'idle');
  }

  // ── EVENT WIRING ─────────────────────────────────────────────────
  function wirePanelButtons() {
    var panel = document.getElementById(p + '-execPanel');
    if (!panel) return;
    panel.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-dept]');
      if (!btn || btn.disabled) return;
      if (btn.classList.contains('ws-exec-run'))   ART.run(deptId);
      if (btn.classList.contains('ws-exec-pause')) ART.pause(deptId);
      if (btn.classList.contains('ws-exec-stop'))  ART.stop(deptId);
      updatePanel();
    });
  }

  function wireEvents() {
    COS.events.on('agent:stateChange', function (e) {
      if (agents.indexOf(e.id) === -1) return;
      updateAgentRow(e.id, e.s);
    });
    COS.events.on('agent:progress', function (e) {
      if (agents.indexOf(e.id) === -1) return;
      updateAgentRow(e.id, ART.getEmpState(e.id));
    });
    COS.events.on('dept:stateChange', function (e) {
      if (e.id !== deptId) return;
      updatePanel();
    });
    COS.events.on('dept:queueUpdate', function (e) {
      if (e.id !== deptId) return;
      updatePanel();
    });
    COS.events.on('dept:complete', function (e) {
      if (e.id !== deptId) return;
      updatePanel();
      agents.forEach(function (id) { updateAgentRow(id, ART.getEmpState(id)); });
    });
    COS.events.on('runtime:metrics', function () {
      updatePanel();
    });
    // Deliverables panel: re-render when new output arrives for this dept
    COS.events.on('output:created', function (e) {
      if (e.output && e.output.dept === deptId) renderDeliverables();
    });
  }

  // ── DELIVERABLES PANEL ───────────────────────────────────────────
  var TYPE_LABELS = {
    property_recommendations: 'Property Recs',  rent_comparison: 'Rent Analysis',
    pet_friendly_shortlist:   'Pet Shortlist',   voucher_eligible_list: 'Voucher List',
    ranked_shortlist:         'Ranked List',     recommendation: 'Recommendation',
    tracker_update:           'Tracker Update',  threat_report: 'Threat Report',
    log_review_report:        'Log Review',      cloud_health_report: 'Cloud Health',
    incident_report:          'Incident',        security_summary: 'Sec Summary',
    flagged_event:            'Flagged Event',   trend_report: 'Trend Report',
    product_ideas:            'Product Ideas',   etsy_listing_draft: 'Etsy Draft',
    tiktok_trend_report:      'TikTok Trends',   production_queue: 'Prod Queue',
    calendar_summary:         'Calendar',        email_triage_report: 'Email Triage',
    reminder_cards:           'Reminders',       task_list: 'Task List',
    optimized_schedule:       'Schedule',        bill_review: 'Bill Review',
    budget_report:            'Budget',          expense_report: 'Expenses',
    savings_update:           'Savings',         financial_summary: 'Fin Summary',
  };

  function buildDeliverablesPanel() {
    return (
      '<div class="ws-deliverables" id="' + p + '-deliverables" style="--exec-color:' + deptColor + '">' +
        '<div class="ws-dlv-header">' +
          '<span class="ws-dlv-title">RECENT DELIVERABLES</span>' +
          '<a href="../reports/index.html" class="ws-dlv-viewAll">VIEW ALL &#8594;</a>' +
        '</div>' +
        '<div id="' + p + '-dlvList" class="ws-dlv-list">' +
          '<div class="ws-dlv-empty">No outputs yet — run agents to generate deliverables.</div>' +
        '</div>' +
      '</div>'
    );
  }

  function timeAgo(ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60)    return diff + 's ago';
    if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return new Date(ts).toLocaleDateString();
  }

  function renderDeliverables() {
    if (typeof OE === 'undefined') return;
    var listEl = document.getElementById(p + '-dlvList');
    if (!listEl) return;
    var outputs = OE.getByDept(deptId).slice(0, 6);
    if (!outputs.length) {
      listEl.innerHTML = '<div class="ws-dlv-empty">No outputs yet — run agents to generate deliverables.</div>';
      return;
    }
    listEl.innerHTML = outputs.map(function (o) {
      var typeLabel = TYPE_LABELS[o.outputType] || o.outputType;
      return (
        '<div class="ws-dlv-item">' +
          '<div class="ws-dlv-itemTop">' +
            '<span class="ws-dlv-agent">' + o.agentName + '</span>' +
            '<span class="ws-dlv-type">' + typeLabel + '</span>' +
            '<span class="ws-dlv-time">' + timeAgo(o.ts) + '</span>' +
          '</div>' +
          '<div class="ws-dlv-summary">' + o.summary + '</div>' +
        '</div>'
      );
    }).join('');
  }

  // ── INIT ─────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var wsBody = document.querySelector('.ws-section .ws-body');
    if (!wsBody) return;

    // Execution panel (top)
    var wrapper = document.createElement('div');
    wrapper.innerHTML = buildPanelHTML();
    wsBody.insertBefore(wrapper.firstElementChild, wsBody.firstChild);

    // Deliverables panel (appended last, after workspace tools and agent presence)
    var dlvWrapper = document.createElement('div');
    dlvWrapper.innerHTML = buildDeliverablesPanel();
    wsBody.appendChild(dlvWrapper.firstElementChild);

    buildAgentRows();
    updatePanel();
    wirePanelButtons();
    wireEvents();
    renderDeliverables();
  });

})();
