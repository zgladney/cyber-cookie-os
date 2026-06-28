/* ================================================================
   CyberCookieOS — Agent Presence Module
   Injects visual agent workstation cards into department rooms.
   Reads live state from window.ART + window.COS.
   Load after: cybercookieos.js, agent_runtime.js, output_engine.js, art_room_ui.js
================================================================ */
(function () {
  'use strict';

  // ── DEPT DETECTION ──────────────────────────────────────────────
  var path   = window.location.pathname;
  var deptId = path.indexOf('/hq/')          !== -1 ? 'security'
             : path.indexOf('/housing/')     !== -1 ? 'housing'
             : path.indexOf('/commerce/')    !== -1 ? 'commerce'
             : path.indexOf('/productivity/') !== -1 ? 'productivity'
             : path.indexOf('/finance/')     !== -1 ? 'finance'
             : null;

  if (!deptId || typeof COS === 'undefined') return;

  // ── CONSTANTS ───────────────────────────────────────────────────
  var DEPT_COLORS = {
    security: '#9b6bff', housing: '#c4784a', commerce: '#ff69b4',
    productivity: '#3aa8c8', finance: '#2ecc71',
  };
  var FLAVOR = {
    security:     'THREAT MONITORING STATIONS',
    housing:      'PROPERTY SEARCH STATIONS',
    commerce:     'MARKET INTELLIGENCE STATIONS',
    productivity: 'TASK MANAGEMENT STATIONS',
    finance:      'LEDGER & VAULT STATIONS',
  };

  var color = DEPT_COLORS[deptId] || '#9b6bff';

  // Per-agent runtime state cache
  var _st = {};

  // ── HELPERS ─────────────────────────────────────────────────────

  function getEmployees() {
    var ids = (COS.deptEmployees && COS.deptEmployees[deptId]) || [];
    return ids.map(function (id) { return COS.employees[id]; }).filter(Boolean);
  }

  function resolveImg(src) {
    if (!src) return null;
    // src is absolute like /assets/... — make relative from room depth
    return src.replace(/^\//, '../');
  }

  function buildAvatar(emp) {
    var initial = emp.name.charAt(0).toUpperCase();
    if (emp.hasArt && emp.imgSrc) {
      return (
        '<img class="ap-portrait" src="' + resolveImg(emp.imgSrc) + '" alt="' + emp.name + '" ' +
        'onerror="this.style.display=\'none\';document.getElementById(\'ap-init-' + emp.id + '\').style.display=\'flex\'">' +
        '<div class="ap-initial" id="ap-init-' + emp.id + '" style="display:none">' + initial + '</div>'
      );
    }
    return '<div class="ap-initial" id="ap-init-' + emp.id + '">' + initial + '</div>';
  }

  function buildStation(emp) {
    return (
      '<div class="ap-station" id="ap-station-' + emp.id + '" data-state="idle" data-dept="' + deptId + '" data-empid="' + emp.id + '">' +
        '<div class="ap-scanline"></div>' +
        '<div class="ap-avatarWrap">' +
          '<div class="ap-avatarInner" id="ap-av-' + emp.id + '">' +
            buildAvatar(emp) +
          '</div>' +
          '<div class="ap-stateDot" id="ap-dot-' + emp.id + '"></div>' +
        '</div>' +
        '<div class="ap-info">' +
          '<div class="ap-empName">' + emp.name.toUpperCase() + '</div>' +
          '<div class="ap-empTitle">' + emp.title + '</div>' +
          '<div class="ap-taskLine" id="ap-task-' + emp.id + '">● IDLE</div>' +
          '<div class="ap-barWrap">' +
            '<div class="ap-barFill" id="ap-bar-' + emp.id + '" style="width:0%"></div>' +
          '</div>' +
        '</div>' +
        '<div class="ap-btns">' +
          '<a  class="ap-btn ap-btn-profile" href="../employees/profile.html?id=' + emp.id + '" title="Profile">&#128100;</a>' +
          '<button class="ap-btn ap-btn-run"   data-action="run"   title="Run Dept">&#9654;</button>' +
          '<button class="ap-btn ap-btn-pause" data-action="pause" title="Pause Dept">&#9208;</button>' +
          '<button class="ap-btn ap-btn-stop"  data-action="stop"  title="Stop Dept">&#9209;</button>' +
        '</div>' +
      '</div>'
    );
  }

  function buildPanel(emps) {
    return (
      '<div class="ap-panel" id="ap-panel-' + deptId + '" style="--ap-color:' + color + '">' +
        '<div class="ap-panelHeader">' +
          '<span class="ap-panelTitle">AGENT STATIONS</span>' +
          '<span class="ap-panelFlavor">// ' + FLAVOR[deptId] + ' //</span>' +
        '</div>' +
        '<div class="ap-grid" id="ap-grid-' + deptId + '">' +
          emps.map(buildStation).join('') +
        '</div>' +
      '</div>'
    );
  }

  // ── STATION UPDATERS ────────────────────────────────────────────

  function updateStation(empId, state, taskTitle, pct) {
    var station = document.getElementById('ap-station-' + empId);
    if (!station) return;

    station.setAttribute('data-state', state || 'idle');

    var dot  = document.getElementById('ap-dot-'  + empId);
    var task = document.getElementById('ap-task-' + empId);
    var bar  = document.getElementById('ap-bar-'  + empId);

    if (dot) {
      dot.className = 'ap-stateDot ap-dot-' + (state || 'idle');
    }

    if (task) {
      if (state === 'running' && taskTitle) {
        task.textContent = '▶ ' + taskTitle;
        task.className   = 'ap-taskLine ap-task-running';
      } else if (state === 'paused') {
        task.textContent = '⏸ PAUSED';
        task.className   = 'ap-taskLine ap-task-paused';
      } else if (state === 'error') {
        task.textContent = '⚠ ERROR — recovering...';
        task.className   = 'ap-taskLine ap-task-error';
      } else if (state === 'completed') {
        task.textContent = '✓ ' + (taskTitle || 'Task complete');
        task.className   = 'ap-taskLine ap-task-done';
      } else {
        task.textContent = '● IDLE';
        task.className   = 'ap-taskLine';
      }
    }

    if (bar) {
      bar.style.width = (pct || 0) + '%';
    }
  }

  function resetAll() {
    var emps = getEmployees();
    emps.forEach(function (emp) {
      _st[emp.id] = {};
      updateStation(emp.id, 'idle', null, 0);
    });
  }

  // ── EVENT WIRING ────────────────────────────────────────────────

  function wireEvents() {
    COS.events.on('agent:stateChange', function (e) {
      var emp = COS.employees[e.id];
      if (!emp || emp.dept !== deptId) return;
      var s = _st[e.id] || {};
      s.state = e.s;
      _st[e.id] = s;
      updateStation(e.id, e.s, s.task, s.pct || 0);
    });

    COS.events.on('agent:progress', function (e) {
      var emp = COS.employees[e.id];
      if (!emp || emp.dept !== deptId) return;
      var s = _st[e.id] || {};
      s.pct  = e.pct;
      s.task = e.task || s.task;
      s.state = 'running';
      _st[e.id] = s;
      updateStation(e.id, 'running', s.task, e.pct);
    });

    COS.events.on('dept:stateChange', function (e) {
      if (e.dept !== deptId) return;
      if (e.state === 'idle' || e.state === 'stopped') {
        resetAll();
      }
    });

    COS.events.on('dept:complete', function (e) {
      if (e.dept !== deptId) return;
      resetAll();
    });
  }

  function wireButtons(panel) {
    panel.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-action]');
      if (!btn || typeof ART === 'undefined') return;
      var action = btn.getAttribute('data-action');
      if (action === 'run')   ART.run(deptId);
      if (action === 'pause') ART.pause(deptId);
      if (action === 'stop')  ART.stop(deptId);
    });
  }

  // ── INIT ────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    var wsBody = document.querySelector('.ws-section .ws-body');
    if (!wsBody) return;

    var emps = getEmployees();
    if (!emps.length) return;

    // Insert after exec panel (.ws-exec-panel), before anything else
    var wrapper = document.createElement('div');
    wrapper.innerHTML = buildPanel(emps);
    var panelEl = wrapper.firstElementChild;

    var execPanel = wsBody.querySelector('.ws-exec-panel');
    if (execPanel && execPanel.nextSibling) {
      wsBody.insertBefore(panelEl, execPanel.nextSibling);
    } else {
      wsBody.insertBefore(panelEl, wsBody.children[1] || null);
    }

    wireButtons(panelEl);
    wireEvents();
  });

})();
