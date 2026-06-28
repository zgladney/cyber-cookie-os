/* ================================================================
   CyberCookieOS — Hallway Hub Controller
   Live data from COS, ART, OE for the HQ hallway.
   Replaces old agent_status.js (which polled a non-existent JSON).
================================================================ */
(function () {
  'use strict';

  var DEPT_IDS = ['security', 'housing', 'commerce', 'productivity', 'finance'];
  var DEPT_COLORS = {
    security: '#9b6bff', housing: '#c4784a', commerce: '#ff69b4',
    productivity: '#3aa8c8', finance: '#2ecc71',
  };

  // Department leads shown on back wall board
  var LEADS = [
    { dept: 'security',    id: 'athena',     icon: '🛡', name: 'ATHENA' },
    { dept: 'housing',     id: 'nova',       icon: '🏠', name: 'NOVA' },
    { dept: 'commerce',    id: 'pixel',      icon: '📈', name: 'PIXEL' },
    { dept: 'productivity',id: 'calypso',    icon: '📅', name: 'CALYPSO' },
    { dept: 'finance',     id: 'greenbean',  icon: '💰', name: 'GREENBEAN' },
  ];

  var STATE_CSS = {
    idle:      'hw-s-idle',
    running:   'hw-s-running',
    paused:    'hw-s-paused',
    error:     'hw-s-blocked',
    blocked:   'hw-s-blocked',
    completed: 'hw-s-completed',
  };

  var _agentStates = {};  // empId → state string
  var _metrics     = { tasksCompleted: 0, errorsTotal: 0 };

  // ── BACK WALL AGENT BOARD ───────────────────────────────────────

  function buildBoard() {
    var board = document.getElementById('hw-agentRows');
    if (!board) return;
    board.innerHTML = LEADS.map(function (lead) {
      var state   = _agentStates[lead.id] || 'idle';
      var css     = STATE_CSS[state] || 'hw-s-idle';
      var label   = state.toUpperCase();
      return (
        '<div class="hw-agentRow" id="hw-row-' + lead.id + '">' +
          '<span class="hw-aIcon">' + lead.icon + '</span>' +
          '<span class="hw-aName">' + lead.name + '</span>' +
          '<span class="hw-aStatus ' + css + '" id="hw-status-' + lead.id + '">● ' + label + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function updateBoardRow(empId, state) {
    var el = document.getElementById('hw-status-' + empId);
    if (!el) return;
    var css   = STATE_CSS[state] || 'hw-s-idle';
    el.className = 'hw-aStatus ' + css;
    el.textContent = '● ' + state.toUpperCase();
  }

  // ── DEPT CARDS LIVE DATA ────────────────────────────────────────

  function getDeptActiveCount(deptId) {
    if (typeof ART === 'undefined') return 0;
    var ids = (window.COS && COS.deptEmployees && COS.deptEmployees[deptId]) || [];
    var count = 0;
    ids.forEach(function (id) {
      var s = ART.getEmpState(id);
      if (s === 'running' || s === 'paused') count++;
    });
    return count;
  }

  function getDeptQueueCount(deptId) {
    if (typeof ART === 'undefined') return 0;
    var q = ART.getQueue(deptId);
    return q ? q.length : 0;
  }

  function getDeptLatestDeliverable(deptId) {
    if (typeof OE === 'undefined') return null;
    var recent = OE.getByDept(deptId);
    return recent.length ? recent[0] : null;
  }

  function updateDeptCard(deptId) {
    var active    = getDeptActiveCount(deptId);
    var queued    = getDeptQueueCount(deptId);
    var latest    = getDeptLatestDeliverable(deptId);

    var activeEl  = document.getElementById('hw-active-' + deptId);
    var queueEl   = document.getElementById('hw-queue-'  + deptId);
    var delivEl   = document.getElementById('hw-dlv-'    + deptId);
    var badgeEl   = document.getElementById('hw-badge-'  + deptId);

    if (activeEl) activeEl.textContent = active + ' active';
    if (queueEl)  queueEl.textContent  = queued + ' queued';
    if (delivEl) {
      if (latest) {
        var diff = Math.floor((Date.now() - latest.ts) / 1000);
        var ago  = diff < 60 ? diff + 's ago' : diff < 3600 ? Math.floor(diff/60) + 'm ago' : Math.floor(diff/3600) + 'h ago';
        delivEl.textContent = latest.agentName + ': ' + latest.summary.slice(0, 36) + (latest.summary.length > 36 ? '…' : '') + ' · ' + ago;
      } else {
        delivEl.textContent = '— No deliverables yet';
      }
    }

    if (badgeEl) {
      var deptState = typeof ART !== 'undefined' ? ART.getDeptState(deptId) : 'idle';
      if (deptState === 'running') {
        badgeEl.className = 'hw-deptBadge hw-badge-running';
        badgeEl.textContent = '● RUNNING';
      } else if (deptState === 'paused') {
        badgeEl.className = 'hw-deptBadge hw-badge-paused';
        badgeEl.textContent = '⏸ PAUSED';
      } else {
        badgeEl.className = 'hw-deptBadge';
        var wingMap = { security:'A', housing:'B', commerce:'C', productivity:'D', finance:'E' };
        badgeEl.textContent = '● WING ' + (wingMap[deptId] || '?');
      }
    }
  }

  function updateAllDeptCards() {
    DEPT_IDS.forEach(updateDeptCard);
  }

  // ── COMMAND STRIP ───────────────────────────────────────────────

  function updateCommandStrip() {
    var stateEl   = document.getElementById('hw-hqState');
    var metaEl    = document.getElementById('hw-hqMeta');
    var cntAgents = document.getElementById('hw-cntAgents');
    var cntTasks  = document.getElementById('hw-cntTasks');
    var cntRpts   = document.getElementById('hw-cntReports');

    var running = 0;
    if (typeof ART !== 'undefined') {
      DEPT_IDS.forEach(function (d) {
        if (ART.getDeptState(d) === 'running') running++;
      });
      var m = ART.getMetrics();
      if (m) _metrics = m;
    }

    var totalActive = 0;
    DEPT_IDS.forEach(function (d) { totalActive += getDeptActiveCount(d); });
    var todayReports = typeof OE !== 'undefined' ? OE.getTodayCount() : 0;

    if (stateEl) {
      if (running > 0) {
        stateEl.textContent = '● HQ ACTIVE — ' + running + ' dept' + (running > 1 ? 's' : '') + ' running';
        stateEl.className = 'hw-hqState hw-hqState-running';
      } else {
        stateEl.textContent = '● HQ STANDBY';
        stateEl.className = 'hw-hqState';
      }
    }

    if (metaEl) {
      metaEl.textContent = totalActive + ' agents active · ' + (_metrics.tasksCompleted || 0) + ' tasks completed · ' + todayReports + ' reports today';
    }

    if (cntAgents) cntAgents.textContent = totalActive;
    if (cntTasks)  cntTasks.textContent  = _metrics.tasksCompleted || 0;
    if (cntRpts)   cntRpts.textContent   = todayReports;
  }

  // ── ACTIVITY TICKER ─────────────────────────────────────────────

  var _tickerItems = [];
  var _tickerIdx   = 0;

  function pushTicker(msg) {
    _tickerItems.unshift(msg);
    if (_tickerItems.length > 30) _tickerItems.pop();
    renderTicker();
  }

  function renderTicker() {
    var track = document.getElementById('hw-tickerTrack');
    if (!track) return;
    var items = _tickerItems.slice(0, 10);
    if (!items.length) return;
    var text = items.join(' ◆ ') + ' ◆ ';
    // Duplicate content for seamless CSS marquee loop
    track.textContent = text + text;
  }

  function seedTicker() {
    var seeds = [
      'CyberCookieOS HQ online',
      'All systems nominal',
      'Awaiting run command',
    ];
    if (typeof COS !== 'undefined') {
      var recent = COS.activity.get().slice(0, 3);
      recent.forEach(function (a) {
        if (a.msg) seeds.push('[' + a.agent + '] ' + a.msg);
      });
    }
    seeds.forEach(function (s) { _tickerItems.push(s); });
    renderTicker();
  }

  // ── EVENT WIRING ────────────────────────────────────────────────

  function wireEvents() {
    if (typeof COS === 'undefined') return;

    COS.events.on('agent:stateChange', function (e) {
      _agentStates[e.id] = e.s;
      updateBoardRow(e.id, e.s);
      updateAllDeptCards();
      updateCommandStrip();
      if (e.s === 'running' && e.task) {
        var emp = COS.employees[e.id];
        if (emp) pushTicker('[' + emp.name + '] started: ' + e.task);
      }
    });

    COS.events.on('dept:stateChange', function (e) {
      updateDeptCard(e.dept);
      updateCommandStrip();
    });

    COS.events.on('runtime:metrics', function () {
      if (typeof ART !== 'undefined') _metrics = ART.getMetrics() || _metrics;
      updateCommandStrip();
    });

    COS.events.on('output:created', function (e) {
      updateAllDeptCards();
      updateCommandStrip();
      if (e.output) pushTicker('[' + e.output.agentName + '] ' + e.output.summary.slice(0, 50));
    });

    COS.events.on('cos:activity', function (e) {
      if (e && e.msg) pushTicker('[' + (e.agent || 'HQ') + '] ' + e.msg);
    });
  }

  function wireRunBtn() {
    var btn = document.getElementById('hw-btnRunHQ');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (typeof ART === 'undefined') return;
      if (ART.isAnyRunning()) {
        ART.stopAll();
        btn.textContent = '▶ RUN HEADQUARTERS';
      } else {
        ART.runAll();
        btn.textContent = '⏹ STOP ALL';
      }
    });

    // Also wire the existing ops button (opsBtn)
    var opsBtn = document.getElementById('hw-opsBtn');
    if (opsBtn) {
      opsBtn.addEventListener('click', function () {
        window.location.href = '../ops_center/index.html';
      });
    }
  }

  // ── CLOCK + STATS BAR ───────────────────────────────────────────

  var _startTime = Date.now();

  function updateClock() {
    var now    = new Date();
    var h      = String(now.getHours()).padStart(2, '0');
    var m      = String(now.getMinutes()).padStart(2, '0');
    var s      = String(now.getSeconds()).padStart(2, '0');
    var el     = document.getElementById('hw-clock');
    if (el) el.textContent = h + ':' + m + ':' + s;

    // Uptime
    var secs   = Math.floor((Date.now() - _startTime) / 1000);
    var uMins  = Math.floor(secs / 60);
    var uHrs   = Math.floor(uMins / 60);
    uMins      = uMins % 60;
    var upEl   = document.getElementById('hw-uptimeStat');
    if (upEl) upEl.textContent = (uHrs > 0 ? uHrs + 'h ' : '') + uMins + ':' + String(secs % 60).padStart(2, '0');

    // Reports count
    var rptEl  = document.getElementById('hw-reportsStat');
    if (rptEl && typeof OE !== 'undefined') rptEl.textContent = OE.getTodayCount();
  }

  // ── INIT ────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    buildBoard();
    updateAllDeptCards();
    updateCommandStrip();
    seedTicker();
    wireEvents();
    wireRunBtn();

    // Clock ticks every second
    updateClock();
    setInterval(updateClock, 1000);

    // Refresh all every 10 seconds
    setInterval(function () {
      updateAllDeptCards();
      updateCommandStrip();
    }, 10000);
  });

})();
