/* ================================================================
   CyberCookieOS — Hallway Hub Controller  v2.0 (Phase 11)
   Wires COS, ART, OE, AE event streams to the hallway UI.

   Bug fixes vs v1:
   - ART emits e.s as state OBJECT {state,task,…}, not a string.
     All comparisons now use e.s.state and e.s.task.
   - getDeptActiveCount: ART.getEmpState returns object, not string.
   - cntRpts element id is hw-cntRpts (not hw-cntReports).

   New in Phase 11:
   - AE Housing Mission: panel overlay + console feed updates
   - Command console #hw-consoleWrap: shows live task log
   - RUN HQ button also triggers AE.runHousingMission()
   - Sprite state classes: hw-sprite-running / working / complete
   - Agent count: dynamic from COS.employees (18 registered)
================================================================ */
(function () {
  'use strict';

  var DEPT_IDS = ['security', 'housing', 'commerce', 'productivity', 'finance'];

  var LEADS = [
    { dept: 'security',     id: 'athena',    icon: '🛡', name: 'ATHENA' },
    { dept: 'housing',      id: 'nova',      icon: '🏠', name: 'NOVA' },
    { dept: 'commerce',     id: 'pixel',     icon: '📈', name: 'PIXEL' },
    { dept: 'productivity', id: 'calypso',   icon: '📅', name: 'CALYPSO' },
    { dept: 'finance',      id: 'greenbean', icon: '💰', name: 'GREENBEAN' },
  ];

  // Sprite-id to agent-id mapping for state animations
  var SPRITE_AGENTS = {
    'hw-sp-athena':    'athena',
    'hw-sp-nimbus':    'nimbus',
    'hw-sp-sentinel':  'sentinel',
    'hw-sp-nova':      'nova',
    'hw-sp-beacon':    'beacon',
    'hw-sp-pixel':     'pixel',
    'hw-sp-spark':     'spark',
    'hw-sp-calypso':   'calypso',
    'hw-sp-echo':      'echo',
    'hw-sp-greenbean': 'greenbean',
    'hw-sp-penny':     'penny',
    'hw-sp-ledger':    'ledger',
  };

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
  var _consoleLog  = [];  // recent console entries

  // ── BACK WALL AGENT BOARD ───────────────────────────────────────

  function buildBoard() {
    var board = document.getElementById('hw-agentRows');
    if (!board) return;
    board.innerHTML = LEADS.map(function (lead) {
      var s     = _agentStates[lead.id] || 'idle';
      var css   = STATE_CSS[s] || 'hw-s-idle';
      return (
        '<div class="hw-agentRow" id="hw-row-' + lead.id + '">' +
          '<span class="hw-aIcon">' + lead.icon + '</span>' +
          '<span class="hw-aName">' + lead.name + '</span>' +
          '<span class="hw-aStatus ' + css + '" id="hw-status-' + lead.id + '">● ' + s.toUpperCase() + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function updateBoardRow(empId, stateStr) {
    var el = document.getElementById('hw-status-' + empId);
    if (!el) return;
    var css = STATE_CSS[stateStr] || 'hw-s-idle';
    el.className   = 'hw-aStatus ' + css;
    el.textContent = '● ' + (stateStr || 'idle').toUpperCase();
  }

  // ── SPRITE STATE ANIMATIONS ─────────────────────────────────────

  function updateSprites() {
    var spIds = Object.keys(SPRITE_AGENTS);
    spIds.forEach(function (spId) {
      var agentId = SPRITE_AGENTS[spId];
      var el      = document.getElementById(spId);
      if (!el) return;
      var s = _agentStates[agentId] || 'idle';
      el.classList.remove('hw-sprite-running', 'hw-sprite-working', 'hw-sprite-complete');
      if (s === 'running')   el.classList.add('hw-sprite-running');
      if (s === 'paused')    el.classList.add('hw-sprite-working');
      if (s === 'completed') el.classList.add('hw-sprite-complete');
    });
  }

  // ── DEPT CARDS ──────────────────────────────────────────────────

  function getDeptActiveCount(deptId) {
    if (typeof ART === 'undefined') return 0;
    var ids = (typeof COS !== 'undefined' && COS.deptEmployees && COS.deptEmployees[deptId]) || [];
    var count = 0;
    ids.forEach(function (id) {
      var emp = ART.getEmpState(id);
      var s   = (emp && typeof emp === 'object') ? emp.state : emp;
      if (s === 'running' || s === 'paused') count++;
    });
    return count;
  }

  function updateDeptCard(deptId) {
    var active  = getDeptActiveCount(deptId);
    var queued  = typeof ART !== 'undefined' ? (ART.getQueue(deptId) || []).length : 0;
    var latest  = typeof OE  !== 'undefined' ? (OE.getByDept(deptId)[0] || null) : null;

    var activeEl = document.getElementById('hw-active-' + deptId);
    var queueEl  = document.getElementById('hw-queue-'  + deptId);
    var delivEl  = document.getElementById('hw-dlv-'    + deptId);
    var badgeEl  = document.getElementById('hw-badge-'  + deptId);

    if (activeEl) activeEl.textContent = active + ' active';
    if (queueEl)  queueEl.textContent  = queued + ' queued';
    if (delivEl) {
      if (latest) {
        var diff = Math.floor((Date.now() - latest.ts) / 1000);
        var ago  = diff < 60 ? diff + 's ago' : diff < 3600 ? Math.floor(diff / 60) + 'm ago' : Math.floor(diff / 3600) + 'h ago';
        delivEl.textContent = latest.agentName + ': ' + latest.summary.slice(0, 36) + (latest.summary.length > 36 ? '…' : '') + ' · ' + ago;
      } else {
        delivEl.textContent = '— No deliverables yet';
      }
    }
    if (badgeEl) {
      var deptState = typeof ART !== 'undefined' ? ART.getDeptState(deptId) : 'idle';
      var wingMap   = { security: 'A', housing: 'B', commerce: 'C', productivity: 'D', finance: 'E' };
      if (deptState === 'running') {
        badgeEl.className   = 'hw-wingBadge hw-badge-running';
        badgeEl.textContent = '● WING ' + (wingMap[deptId] || '?') + ' RUNNING';
      } else if (deptState === 'paused') {
        badgeEl.className   = 'hw-wingBadge hw-badge-paused';
        badgeEl.textContent = '⏸ WING ' + (wingMap[deptId] || '?') + ' PAUSED';
      } else {
        badgeEl.className   = 'hw-wingBadge';
        badgeEl.textContent = '● WING ' + (wingMap[deptId] || '?');
      }
    }
  }

  function updateAllDeptCards() { DEPT_IDS.forEach(updateDeptCard); }

  // ── COMMAND STRIP ───────────────────────────────────────────────

  function updateCommandStrip() {
    var stateEl   = document.getElementById('hw-hqState');
    var metaEl    = document.getElementById('hw-hqMeta');
    var cntAgents = document.getElementById('hw-cntAgents');
    var cntTasks  = document.getElementById('hw-cntTasks');
    var cntRpts   = document.getElementById('hw-cntRpts');  // fixed: was hw-cntReports

    var running = 0;
    if (typeof ART !== 'undefined') {
      DEPT_IDS.forEach(function (d) { if (ART.getDeptState(d) === 'running') running++; });
      var m = ART.getMetrics();
      if (m) _metrics = m;
    }

    var aeRunning    = typeof AE !== 'undefined' && AE.isRunning();
    var totalActive  = 0;
    DEPT_IDS.forEach(function (d) { totalActive += getDeptActiveCount(d); });
    var todayReports = typeof OE !== 'undefined' ? OE.getTodayCount() : 0;

    if (stateEl) {
      if (running > 0 || aeRunning) {
        var parts = [];
        if (running > 0) parts.push(running + ' dept' + (running > 1 ? 's' : '') + ' running');
        if (aeRunning) {
          var ae   = AE.getState();
          var pct  = ae.totalPhases > 0 ? Math.round((ae.completed.length / ae.totalPhases) * 100) : 0;
          parts.push('Housing Mission ' + pct + '%');
        }
        stateEl.textContent = '● HQ ACTIVE — ' + parts.join(' · ');
        stateEl.className   = 'hw-hqState hw-hqState-running';
      } else {
        stateEl.textContent = '● HQ STANDBY';
        stateEl.className   = 'hw-hqState';
      }
    }

    if (metaEl) {
      metaEl.textContent = totalActive + ' agents active · ' + (_metrics.tasksCompleted || 0) + ' tasks completed · ' + todayReports + ' reports today';
    }
    if (cntAgents) cntAgents.textContent = totalActive;
    if (cntTasks)  cntTasks.textContent  = _metrics.tasksCompleted || 0;
    if (cntRpts)   cntRpts.textContent   = todayReports;

    // Update agent count badge (18 registered agents)
    var onlineEl = document.getElementById('hw-onlineCount');
    if (onlineEl && typeof COS !== 'undefined' && COS.employees) {
      onlineEl.textContent = Object.keys(COS.employees).length;
    }
  }

  // ── ACTIVITY TICKER ─────────────────────────────────────────────

  var _tickerItems = [];

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
    track.textContent = text + text;
  }

  function seedTicker() {
    var seeds = ['CyberCookieOS HQ online', 'All systems nominal', 'Awaiting run command'];
    if (typeof COS !== 'undefined') {
      var recent = COS.activity.get().slice(0, 3);
      recent.forEach(function (a) { if (a.msg) seeds.push('[' + a.agent + '] ' + a.msg); });
    }
    seeds.forEach(function (s) { _tickerItems.push(s); });
    renderTicker();
  }

  // ── COMMAND CONSOLE ─────────────────────────────────────────────

  var _MAX_CONSOLE = 80;

  function _ts() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' +
           String(d.getMinutes()).padStart(2, '0') + ':' +
           String(d.getSeconds()).padStart(2, '0');
  }

  function pushConsole(msg, cls) {
    _consoleLog.push({ ts: _ts(), msg: msg, cls: cls || '' });
    if (_consoleLog.length > _MAX_CONSOLE) _consoleLog.shift();
    renderConsole();

    var wrap = document.getElementById('hw-consoleWrap');
    if (wrap) wrap.style.display = 'block';
  }

  function renderConsole() {
    var feed = document.getElementById('hw-consoleFeed');
    if (!feed) return;
    var slice = _consoleLog.slice(-20);
    feed.innerHTML = slice.map(function (e) {
      return '<div class="hw-cLine' + (e.cls ? ' ' + e.cls : '') + '">' +
             '<span class="hw-cTs">' + e.ts + '</span> ' +
             _esc(e.msg) + '</div>';
    }).join('');
    feed.scrollTop = feed.scrollHeight;
  }

  function _esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── HOUSING MISSION OVERLAY ─────────────────────────────────────

  function updateMissionOverlay() {
    var overlay = document.getElementById('hw-missionOverlay');
    var phases  = document.getElementById('hw-missionPhases');
    if (!overlay || !phases || typeof AE === 'undefined') return;

    var ae = AE.getState();

    if (!ae.running && ae.phase === -1 && ae.completed.length === 0) {
      overlay.style.display = 'none';
      return;
    }

    overlay.style.display = 'block';
    phases.innerHTML = AE.WORKFLOW.map(function (step, i) {
      var done    = ae.completed.indexOf(i) !== -1;
      var active  = ae.phase === i && ae.running;
      var pdata   = ae.agentProgress[step.agent] || {};
      var cls     = done ? 'hw-mphase-done' : (active ? 'hw-mphase-active' : 'hw-mphase-pending');
      var icon    = done ? '✓' : (active ? '▶' : '○');
      var detail  = active && pdata.step ? pdata.step.slice(0, 38) : '';
      var pct     = active && pdata.pct ? pdata.pct : (done ? 100 : 0);
      return (
        '<div class="hw-mphase ' + cls + '" style="--ph-color:' + step.color + '">' +
          '<span class="hw-mphaseIcon">' + icon + '</span>' +
          '<span class="hw-mphaseName">' + step.label.toUpperCase() + '</span>' +
          (active ? '<span class="hw-mphasePct">' + pct + '%</span>' : '') +
          (detail  ? '<div class="hw-mphaseStep">' + _esc(detail) + '</div>' : '') +
        '</div>'
      );
    }).join('');
  }

  // ── LIVE SIGNAGE — kiosks + wing status from COS data ────────────

  function updateSignage() {
    // Floor kiosks
    var mEl = document.getElementById('hw-k-missions');
    var aEl = document.getElementById('hw-k-approvals');
    if (mEl && typeof MS !== 'undefined') {
      var cnt = MS.count();
      mEl.textContent = cnt.pending || 0;
    }
    if (aEl && typeof ORION !== 'undefined') {
      aEl.textContent = ORION.approvals.pending().length;
    }

    // Wing status labels
    if (typeof KPI !== 'undefined') {
      var kpi = KPI.all();

      var wsSec = document.getElementById('hw-wstatus-security');
      if (wsSec && kpi.security) {
        var k = kpi.security;
        if ((k.criticalAlerts || 0) > 0) {
          wsSec.textContent = '⚠ CRITICAL — ' + k.criticalAlerts + ' ALERTS';
          wsSec.style.color = 'rgba(255,80,80,.85)';
        } else if ((k.threatsDetected || 0) > 0) {
          wsSec.textContent = '🛡 ' + k.threatsDetected + ' THREATS LOGGED · MONITORING';
          wsSec.style.color = 'rgba(247,201,72,.75)';
        } else if ((k.scansCompleted || 0) > 0) {
          wsSec.textContent = '🛡 ' + k.scansCompleted + ' SCANS · PERIMETER CLEAN';
          wsSec.style.color = '';
        }
      }

      var wsHouse = document.getElementById('hw-wstatus-housing');
      if (wsHouse && kpi.career) {
        var c = kpi.career;
        if ((c.jobsFound || 0) > 0) {
          wsHouse.textContent = '💼 ' + c.jobsFound + ' JOBS FOUND TODAY';
          wsHouse.style.color = 'rgba(255,200,60,.8)';
        }
      }

      var wsComm = document.getElementById('hw-wstatus-commerce');
      if (wsComm && kpi.commerce) {
        wsComm.textContent = '🛍 ' + (kpi.commerce.trends || 0) + ' TRENDS MONITORED';
      }

      var wsProd = document.getElementById('hw-wstatus-productivity');
      if (wsProd && kpi.productivity) {
        var p = kpi.productivity;
        if ((p.tasksCompleted || 0) > 0) {
          wsProd.textContent = '📅 ' + p.tasksCompleted + ' TASKS COMPLETE';
          wsProd.style.color = 'rgba(58,168,200,.8)';
        }
      }

      var wsFin = document.getElementById('hw-wstatus-finance');
      if (wsFin && kpi.finance) {
        var f = kpi.finance;
        wsFin.textContent = '💰 BUDGET: ' + (f.budgetHealth || 'REVIEWING').toUpperCase();
        wsFin.style.color = f.budgetHealth === 'on track' ? 'rgba(46,204,113,.75)' : '';
      }
    }
  }

  // ── AMBIENT ANNOUNCEMENTS — rotate text in back wall ticker ───────

  var _ANN_POOL = [
    'Career Intelligence scanning South Jersey · Philadelphia · Remote US ◆ ' +
      'Security perimeter active · no critical threats detected ◆ ' +
      'Finance reconciliation complete · budget health nominal ◆ ' +
      'Orion assembling executive briefing ◆ ',
    'Nova identified new job opportunities · cross-department analysis in progress ◆ ' +
      'Athena overnight scan complete · all clear ◆ ' +
      'Penny reviewing budget targets for this period ◆ ' +
      'Mission Control awaiting CEO direction ◆ ',
    'Scout-X market update: Virginia leads +38% SOC demand · $72k average ◆ ' +
      'Calypso protected 2 focus blocks for the week ◆ ' +
      'Resu-Mate ATS analysis complete · recommendations ready ◆ ' +
      'Company health: nominal · 18 agents active ◆ ',
    'Security Ops: Nimbus confirmed cloud health · 99.8% uptime ◆ ' +
      'Career Intel: Resu-Mate resume optimization queued ◆ ' +
      'Finance: Vault savings projection updated · on track ◆ ' +
      'Orion: morning briefing assembled · CEO review pending ◆ ',
  ];
  var _annIdx = 0;

  function _rotateAnnouncement() {
    _annIdx = (_annIdx + 1) % _ANN_POOL.length;
    var el = document.getElementById('hw-annText');
    if (!el) return;

    // Inject live data if available
    var text = _ANN_POOL[_annIdx];
    if (typeof KPI !== 'undefined') {
      var kpi = KPI.all();
      if (kpi.career && kpi.career.jobsFound > 0) {
        text = 'Nova: ' + kpi.career.jobsFound + ' opportunities found today ◆ ' + text;
      }
      if (kpi.security && kpi.security.scansCompleted > 0) {
        text = 'Athena: ' + kpi.security.scansCompleted + ' scan(s) complete ◆ ' + text;
      }
    }
    if (typeof ORION !== 'undefined') {
      var pending = ORION.approvals.pending().length;
      if (pending > 0) {
        text = '⚠ ' + pending + ' decision' + (pending !== 1 ? 's' : '') + ' awaiting CEO approval ◆ ' + text;
      }
    }
    el.textContent = text;
    // Re-trigger animation by cloning
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }

  // ── EVENT WIRING ────────────────────────────────────────────────

  function wireEvents() {
    if (typeof COS === 'undefined') return;

    // ART agent state changes — e.s is the FULL state OBJECT {state, task, progress, …}
    COS.events.on('agent:stateChange', function (e) {
      var stateObj = e.s;
      var stateStr = (stateObj && typeof stateObj === 'object') ? stateObj.state : stateObj;
      _agentStates[e.id] = stateStr || 'idle';
      updateBoardRow(e.id, _agentStates[e.id]);
      updateAllDeptCards();
      updateCommandStrip();
      updateSprites();
      if (stateStr === 'running' && stateObj && stateObj.task) {
        var emp = COS.employees[e.id];
        if (emp) pushTicker('[' + emp.name + '] started: ' + stateObj.task);
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
      if (e.output) {
        pushTicker('[' + e.output.agentName + '] ' + e.output.summary.slice(0, 50));
        if (e.output.taskType === 'housing_mission') {
          pushConsole('🏠 ' + e.output.summary, 'hw-cLine-success');
        }
      }
    });

    COS.events.on('cos:activity', function (e) {
      if (e && e.msg) pushTicker('[' + (e.agent || 'HQ') + '] ' + e.msg);
    });

    // Company Intelligence events → update live signage
    COS.events.on('kpi:updated', function () { updateSignage(); });
    COS.events.on('approval:added',    function () { updateSignage(); });
    COS.events.on('approval:granted',  function () { updateSignage(); });
    COS.events.on('approval:rejected', function () { updateSignage(); });
    COS.events.on('mission:created',   function () { updateSignage(); });
    COS.events.on('mission:completed', function () { updateSignage(); });

    // ── AE Housing Mission events ──────────────────────────────────

    COS.events.on('ae:missionStart', function (e) {
      pushConsole('🏠 Housing Mission started [' + e.missionId + ']', 'hw-cLine-mission');
      pushConsole('  Workflow: Nova → Penny → Calypso → Nimbus → Report Center', 'hw-cLine-dim');
      updateMissionOverlay();
      updateCommandStrip();

      var label = document.getElementById('hw-consoleMission');
      if (label) label.textContent = '// HOUSING MISSION ACTIVE';
    });

    COS.events.on('ae:phaseStart', function (e) {
      pushConsole('▶ Phase ' + (e.phase + 1) + '/' + e.total + ' — [' + (e.agent || '').toUpperCase() + '] ' + e.label, 'hw-cLine-phase');
      updateMissionOverlay();
      updateCommandStrip();
    });

    COS.events.on('ae:agentTask', function (e) {
      var s = e.state || {};
      if (s.status === 'running' && s.step) {
        var line = '  [' + (e.agent || '').toUpperCase() + '] ' + (s.pct || 0) + '% — ' + s.step;
        // Update existing last line if same agent to avoid flooding
        if (_consoleLog.length && _consoleLog[_consoleLog.length - 1].msg.indexOf('[' + (e.agent || '').toUpperCase() + ']') === 2) {
          _consoleLog[_consoleLog.length - 1].msg = line;
          _consoleLog[_consoleLog.length - 1].ts  = _ts();
          renderConsole();
        } else {
          pushConsole(line, 'hw-cLine-step');
        }
      }
      updateMissionOverlay();
    });

    COS.events.on('ae:phaseComplete', function (e) {
      pushConsole('✓ [' + (e.agent || '').toUpperCase() + '] Phase ' + (e.phase + 1) + ' complete — mission ' + e.missionPct + '% done', 'hw-cLine-ok');
      updateMissionOverlay();
      updateCommandStrip();
    });

    COS.events.on('ae:missionComplete', function (e) {
      pushConsole('🏁 Housing Mission Complete — ' + e.duration + 's · ' + e.properties + ' listings ready for review', 'hw-cLine-success');
      setTimeout(function () {
        var overlay = document.getElementById('hw-missionOverlay');
        if (overlay) overlay.style.display = 'none';
        var btn = document.getElementById('hw-btnRunHQ');
        if (btn) btn.textContent = '▶ RUN HEADQUARTERS';
        var label = document.getElementById('hw-consoleMission');
        if (label) label.textContent = '';
        updateCommandStrip();
      }, 3000);
    });

    COS.events.on('ae:missionStopped', function () {
      pushConsole('⏹ Housing Mission stopped.', 'hw-cLine-dim');
      setTimeout(function () {
        var overlay = document.getElementById('hw-missionOverlay');
        if (overlay) overlay.style.display = 'none';
        var label = document.getElementById('hw-consoleMission');
        if (label) label.textContent = '';
      }, 800);
      updateCommandStrip();
    });
  }

  // ── RUN HQ BUTTON ───────────────────────────────────────────────

  function wireRunBtn() {
    var btn = document.getElementById('hw-btnRunHQ');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var artRunning = typeof ART !== 'undefined' && ART.isAnyRunning();
      var aeRunning  = typeof AE  !== 'undefined' && AE.isRunning();
      var anyRunning = artRunning || aeRunning;

      if (anyRunning) {
        if (typeof ART !== 'undefined') ART.stopAll();
        if (typeof AE  !== 'undefined') AE.stopMission();
        btn.textContent = '▶ RUN HEADQUARTERS';
      } else {
        if (typeof ART !== 'undefined') ART.runAll();
        if (typeof AE  !== 'undefined') AE.runHousingMission();
        btn.textContent = '⏹ STOP ALL';
      }
    });

    var opsBtn = document.getElementById('hw-opsBtn');
    if (opsBtn) {
      opsBtn.addEventListener('click', function () {
        if (typeof navigateTo === 'function') {
          navigateTo('../ops_center/index.html');
        } else {
          window.location.href = '../ops_center/index.html';
        }
      });
    }

    // Console clear button
    var clrBtn = document.getElementById('hw-consoleClear');
    if (clrBtn) {
      clrBtn.addEventListener('click', function () {
        _consoleLog = [];
        renderConsole();
        var wrap = document.getElementById('hw-consoleWrap');
        if (wrap) wrap.style.display = 'none';
      });
    }
  }

  // ── CLOCK + STATS BAR ───────────────────────────────────────────

  var _startTime = Date.now();

  function updateClock() {
    var now   = new Date();
    var h     = String(now.getHours()).padStart(2, '0');
    var m     = String(now.getMinutes()).padStart(2, '0');
    var s     = String(now.getSeconds()).padStart(2, '0');
    var el    = document.getElementById('hw-clock');
    if (el) el.textContent = h + ':' + m + ':' + s;

    var secs  = Math.floor((Date.now() - _startTime) / 1000);
    var uMins = Math.floor(secs / 60);
    var uHrs  = Math.floor(uMins / 60);
    uMins     = uMins % 60;
    var upEl  = document.getElementById('hw-uptimeStat');
    if (upEl) upEl.textContent = (uHrs > 0 ? uHrs + 'h ' : '') + uMins + ':' + String(secs % 60).padStart(2, '0');

    var rptEl = document.getElementById('hw-reportsStat');
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

    updateClock();
    setInterval(updateClock, 1000);

    // Live signage — initial + periodic
    updateSignage();
    setInterval(updateSignage, 15000);

    // Announcement rotation
    setInterval(_rotateAnnouncement, 34000);

    setInterval(function () {
      updateAllDeptCards();
      updateCommandStrip();
      if (typeof AE !== 'undefined' && AE.isRunning()) updateMissionOverlay();
    }, 10000);
  });

})();
