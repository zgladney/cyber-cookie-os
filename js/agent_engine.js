/* CyberCookieOS — Agent Engine (AE) v1.0
   Cross-agent sequential workflow engine.
   Requires: COS (cybercookieos.js), OE (output_engine.js)
   Load AFTER cybercookieos.js and output_engine.js.

   Events emitted via COS.events:
     ae:missionStart    { missionId, workflow[] }
     ae:phaseStart      { phase, total, agent, dept, label, color }
     ae:agentTask       { agent, state:{task,step,pct,status} }
     ae:phaseComplete   { phase, agent, dept, completed, total, missionPct }
     ae:missionComplete { missionId, duration, properties }
     ae:missionStopped  {}
*/
window.AE = (function () {
  'use strict';

  // ── HOUSING MISSION WORKFLOW ──────────────────────────────────────
  // Sequential pipeline: Nova → Penny → Calypso → Nimbus → Report Center

  var WORKFLOW = [
    {
      agent: 'nova', dept: 'housing', label: 'Housing Scout', color: '#c4784a',
      tasks: [
        { title: "Load Zee's Search Profile", dur: 5000,
          steps: ["Loading Zee's preferences…", "Cities: Willingboro · Mt Laurel · Marlton · Southampton", "Budget cap $2,100/mo · 2BR+ · voucher-friendly", "Profile loaded — search ready"] },
        { title: 'Run Housing Scout', dur: 9000,
          steps: ['Initializing browser agent…', 'Scanning AffordableHousing.com…', 'Scanning Craigslist Burlington County…', 'Processing raw results…', 'Scout complete'] },
        { title: 'Filter Voucher-Friendly Listings', dur: 6000,
          steps: ['Loading scout results…', 'Filtering voucher-accepting properties…', 'Ranking by match score…', 'Voucher shortlist ready'] },
      ],
      reportTask: { type: 'gen_recommendations', title: 'Housing Shortlist Report' },
    },
    {
      agent: 'penny', dept: 'finance', label: 'Budget Planner', color: '#2ecc71',
      tasks: [
        { title: 'Read Budget', dur: 5000,
          steps: ['Loading current budget data…', 'Calculating monthly income…', 'Reviewing expense categories…', 'Budget snapshot ready'] },
        { title: 'Check Housing Affordability', dur: 7000,
          steps: ["Loading Nova's property shortlist…", 'Comparing rent vs available budget…', 'Calculating surplus at each price point…', 'Flagging over-budget properties…', 'Affordability analysis complete'] },
        { title: 'Generate Finance Report', dur: 5000,
          steps: ['Compiling budget data…', 'Building affordability breakdown…', 'Writing recommendations…', 'Finance report ready'] },
      ],
    },
    {
      agent: 'calypso', dept: 'productivity', label: 'Calendar Assistant', color: '#3aa8c8',
      tasks: [
        { title: 'Check Calendar Connection', dur: 4000,
          steps: ['Checking Google Calendar status…', 'Google Calendar: not connected — using placeholder', 'Loading availability template…', 'Calendar check complete (simulated)'] },
        { title: 'Suggest Viewing Times', dur: 6000,
          steps: ["Loading Nova's shortlist…", 'Checking available time slots…', 'Matching to landlord contact windows…', 'Viewing time suggestions ready'] },
      ],
    },
    {
      agent: 'nimbus', dept: 'security', label: 'Cloud Monitor', color: '#9b6bff',
      tasks: [
        { title: 'Review Listing Links for Fraud', dur: 7000,
          steps: ['Loading all housing listing URLs…', 'Checking URL patterns for suspicious signs…', 'Validating domain legitimacy…', 'Cross-referencing known fraud URLs…', 'Link review complete'] },
        { title: 'Generate Security Report', dur: 4000,
          steps: ['Compiling link scan results…', 'Flagging suspicious listings…', 'Writing security summary…', 'Security report ready'] },
      ],
    },
  ];

  // ── STATE ────────────────────────────────────────────────────────
  var _state = {
    running:      false,
    phase:        -1,
    startTs:      null,
    missionId:    null,
    completed:    [],
    agentProgress: {},
  };
  var _timers = {};

  // ── HELPERS ──────────────────────────────────────────────────────
  function _cos()             { return (typeof COS !== 'undefined') ? COS : null; }
  function _emit(ev, d)       { var c = _cos(); if (c) c.events.emit(ev, d); }
  function _notify(msg, pri)  { var c = _cos(); if (c) c.notifications.add(msg, pri || 'normal'); }
  function _log(a, dept, msg) { var c = _cos(); if (c) c.activity.log({ agent: a, dept: dept, msg: msg, source: 'workflow' }); }

  function _empName(id) {
    var c = _cos();
    return (c && c.employees && c.employees[id]) ? c.employees[id].name : id;
  }

  function _setProgress(agent, patch) {
    if (!_state.agentProgress[agent]) {
      _state.agentProgress[agent] = { task: '', step: '', pct: 0, status: 'idle' };
    }
    var p = _state.agentProgress[agent];
    var keys = Object.keys(patch);
    for (var i = 0; i < keys.length; i++) { p[keys[i]] = patch[keys[i]]; }
    _emit('ae:agentTask', { agent: agent, state: { task: p.task, step: p.step, pct: p.pct, status: p.status } });
  }

  // ── PHASE EXECUTION ──────────────────────────────────────────────
  function _runPhase(phaseIdx) {
    if (!_state.running) return;
    if (phaseIdx >= WORKFLOW.length) { _completeMission(); return; }

    var phase = WORKFLOW[phaseIdx];
    _state.phase = phaseIdx;

    _emit('ae:phaseStart', { phase: phaseIdx, total: WORKFLOW.length, agent: phase.agent, dept: phase.dept, label: phase.label, color: phase.color });
    _notify('[Phase ' + (phaseIdx + 1) + '/' + WORKFLOW.length + '] ' + _empName(phase.agent) + ' starting…', 'normal');
    _log(_empName(phase.agent), phase.dept, 'Mission Phase ' + (phaseIdx + 1) + ': ' + phase.label);

    _setProgress(phase.agent, { status: 'running', pct: 0, task: phase.tasks[0].title, step: 'Starting…' });
    _runTaskSeq(phase, 0, phaseIdx);
  }

  function _runTaskSeq(phase, taskIdx, phaseIdx) {
    if (!_state.running) return;

    if (taskIdx >= phase.tasks.length) {
      if (phase.reportTask && typeof OE !== 'undefined') {
        OE.generate(phase.reportTask, phase.agent, phase.dept);
      }
      _phaseComplete(phaseIdx);
      return;
    }

    var task   = phase.tasks[taskIdx];
    var steps  = task.steps || ['Working…'];
    var stepMs = Math.max(500, Math.floor(task.dur / steps.length));
    var si     = 0;

    _setProgress(phase.agent, { task: task.title, step: steps[0], pct: 5, status: 'running' });
    _log(_empName(phase.agent), phase.dept, _empName(phase.agent) + ': ' + task.title);

    var key = 'p' + phaseIdx + 't' + taskIdx;
    clearInterval(_timers[key]);
    _timers[key] = setInterval(function () {
      if (!_state.running) { clearInterval(_timers[key]); return; }
      si++;
      var pct  = Math.min(5 + Math.round(si * 90 / steps.length), 95);
      var step = steps[Math.min(si, steps.length - 1)];
      _setProgress(phase.agent, { pct: pct, step: step });

      if (si >= steps.length) {
        clearInterval(_timers[key]);
        _setProgress(phase.agent, { pct: 100, step: '✓ Complete', status: 'complete' });
        setTimeout(function () { _runTaskSeq(phase, taskIdx + 1, phaseIdx); }, 600);
      }
    }, stepMs);
  }

  function _phaseComplete(phaseIdx) {
    var phase = WORKFLOW[phaseIdx];
    _state.completed.push(phaseIdx);
    var pct = Math.round((_state.completed.length / WORKFLOW.length) * 100);

    _setProgress(phase.agent, { status: 'complete', pct: 100, step: 'Phase complete ✓' });
    _emit('ae:phaseComplete', { phase: phaseIdx, agent: phase.agent, dept: phase.dept, completed: _state.completed.length, total: WORKFLOW.length, missionPct: pct });
    _notify('✓ ' + _empName(phase.agent) + ' done — mission ' + pct + '% complete', 'normal');

    var gapKey = 'gap' + phaseIdx;
    _timers[gapKey] = setTimeout(function () {
      if (!_state.running) return;
      _setProgress(phase.agent, { status: 'idle' });
      _runPhase(phaseIdx + 1);
    }, 1500);
  }

  function _completeMission() {
    _state.running = false;
    var dur       = Math.round((Date.now() - _state.startTs) / 1000);
    var propCount = 3 + Math.floor(Math.random() * 5);
    var mid       = _state.missionId;

    _notify('🏠 Housing Mission Complete! Nova · Penny · Calypso · Nimbus — all 4 phases finished.', 'high');
    _log('CyberCookieOS', 'ops', '🏁 Housing Mission Complete — 4 agents · ' + dur + 's · ' + propCount + ' listings cleared');

    // Write final mission report into OE output store
    var c = _cos();
    if (c) {
      var report = {
        id:         'ae_' + mid,
        dept:       'housing',
        agent:      'nova',
        agentName:  'Nova',
        taskType:   'housing_mission',
        taskTitle:  'Housing Mission Complete',
        outputType: 'housing_mission_report',
        ts:         Date.now(),
        summary:    'Housing Mission — Nova found ' + propCount + ' listings, Penny verified affordability, Calypso scheduled viewings, Nimbus cleared all links.',
        status:     'active',
        metadata:   {
          phases:     WORKFLOW.length,
          agents:     WORKFLOW.map(function (p) { return _empName(p.agent); }),
          duration:   dur,
          properties: propCount,
        },
      };
      var outputs = c.state.get('oe.outputs') || [];
      outputs.push(report);
      c.state.set('oe.outputs', outputs.slice(-300));
      c.events.emit('output:created', { output: report });
    }

    _emit('ae:missionComplete', { missionId: mid, duration: dur, properties: propCount });
    _state.phase = -1;
    _state.missionId = null;
  }

  // ── PUBLIC API ───────────────────────────────────────────────────

  function runHousingMission() {
    if (_state.running) return;
    _state.running      = true;
    _state.phase        = 0;
    _state.startTs      = Date.now();
    _state.completed    = [];
    _state.agentProgress = {};
    _state.missionId    = 'm' + Date.now();

    _notify('🏠 Housing Mission launched — Nova · Penny · Calypso · Nimbus deploying', 'high');
    _log('CyberCookieOS', 'ops', '🏠 Housing Mission started — 4-agent sequential workflow');
    _emit('ae:missionStart', {
      missionId: _state.missionId,
      workflow: WORKFLOW.map(function (p) { return { agent: p.agent, dept: p.dept, label: p.label, color: p.color }; }),
    });
    _runPhase(0);
  }

  function stopMission() {
    if (!_state.running) return;
    _state.running = false;
    var keys = Object.keys(_timers);
    for (var i = 0; i < keys.length; i++) {
      clearInterval(_timers[keys[i]]);
      clearTimeout(_timers[keys[i]]);
    }
    _timers = {};
    WORKFLOW.forEach(function (p) { _setProgress(p.agent, { status: 'idle', pct: 0, step: '', task: '' }); });
    _emit('ae:missionStopped', {});
    _log('CyberCookieOS', 'ops', 'Housing Mission stopped manually');
    _notify('Housing Mission stopped.', 'normal');
    _state.phase = -1;
    _state.missionId = null;
  }

  function getState() {
    return {
      running:       _state.running,
      phase:         _state.phase,
      completed:     _state.completed.slice(),
      totalPhases:   WORKFLOW.length,
      missionId:     _state.missionId,
      agentProgress: _state.agentProgress,
    };
  }

  function isRunning() { return _state.running; }

  return {
    runHousingMission: runHousingMission,
    stopMission:       stopMission,
    getState:          getState,
    isRunning:         isRunning,
    WORKFLOW:          WORKFLOW,
  };
})();
