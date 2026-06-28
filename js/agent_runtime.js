/* CyberCookieOS — Agent Runtime Engine (ART) v1.0
   Central execution engine for all AI employees.
   Requires: window.COS (cybercookieos.js loaded first)
   Fires events via COS.events — pure engine, zero DOM. */

window.ART = (function () {
  'use strict';

  // ── TASK LIBRARY ─────────────────────────────────────────────────
  var TASK_LIB = {
    security: [
      { type:'threat_scan',      title:'Threat Scan',              agent:'athena',        dur:[10,18], steps:['Initializing scanner…','Scanning network traffic…','Analyzing anomalies…','Compiling threat report…'] },
      { type:'log_review',       title:'Log Review',               agent:'nimbus',        dur:[7,12],  steps:['Loading server logs…','Filtering by severity…','Flagging anomalies…','Review complete'] },
      { type:'cloud_monitor',    title:'Cloud Monitoring',         agent:'nimbus',        dur:[6,10],  steps:['Connecting to cloud…','Checking all endpoints…','Running health checks…','Health check complete'] },
      { type:'incident_review',  title:'Incident Review',          agent:'sentinel',      dur:[8,14],  steps:['Loading open incidents…','Cross-referencing IPs…','Severity assessed…','Report filed'] },
      { type:'gen_sec_report',   title:'Security Report',          agent:'athena',        dur:[6,9],   steps:['Gathering scan data…','Analyzing patterns…','Formatting report…','Report generated'] },
      { type:'flag_suspicious',  title:'Flag Suspicious Activity', agent:'sentinel',      dur:[5,9],   steps:['Scanning activity logs…','Running pattern match…','Alert created'] },
    ],
    housing: [
      { type:'search_listings',       title:'Search Listings',          agent:'nova',    dur:[10,18], steps:['Loading search criteria…','Querying available listings…','Filtering by requirements…','Sorting by match score…'] },
      { type:'compare_rent',          title:'Compare Rent',             agent:'nova',    dur:[6,10],  steps:['Loading listing prices…','Calculating area averages…','Generating comparison chart…'] },
      { type:'check_pets',            title:'Check Pet Policy',         agent:'beacon',  dur:[5,8],   steps:['Reviewing listing terms…','Checking pet policies…','Flagging pet-friendly options…'] },
      { type:'check_voucher',         title:'Check Voucher Support',    agent:'beacon',  dur:[5,8],   steps:['Reviewing listing terms…','Verifying voucher acceptance…','Eligible list updated'] },
      { type:'organize_shortlist',    title:'Organize Shortlist',       agent:'atlas',   dur:[6,9],   steps:['Loading all candidates…','Ranking by user criteria…','Shortlist ready'] },
      { type:'gen_recommendations',   title:'Generate Recommendations', agent:'nova',    dur:[8,13],  steps:['Analyzing preferences…','Matching to criteria…','Ranking results…','Recommendations ready'] },
      { type:'update_tracker',        title:'Update Listing Tracker',   agent:'atlas',   dur:[4,7],   steps:['Loading listing tracker…','Syncing new data…','Tracker updated'] },
    ],
    commerce: [
      { type:'trend_research',   title:'Trend Research',          agent:'pixel',   dur:[8,14],  steps:['Scanning market trends…','Analyzing demand signals…','Ranking opportunities…','Trend report compiled'] },
      { type:'gen_ideas',        title:'Generate Product Ideas',  agent:'spark',   dur:[7,12],  steps:['Loading market data…','Cross-referencing trends…','Generating ideas…','Ideas ranked by potential'] },
      { type:'prep_listing',     title:'Prepare Etsy Listing',   agent:'etsybot', dur:[9,15],  steps:['Loading product details…','Writing description…','Optimizing search tags…','Pricing check…','Listing ready'] },
      { type:'tiktok_trends',    title:'Analyze TikTok Trends',  agent:'spark',   dur:[6,10],  steps:['Scanning TikTok feed…','Analyzing viral content…','Extracting keywords…','Trend report ready'] },
      { type:'prod_queue',       title:'Create Production Queue', agent:'forge',   dur:[5,9],   steps:['Loading pending orders…','Prioritizing by deadline…','Estimating capacity…','Queue created'] },
    ],
    productivity: [
      { type:'calendar_review',  title:'Calendar Review',     agent:'calypso',       dur:[6,9],   steps:['Loading calendar…','Checking for conflicts…','Identifying gaps…','Summary ready'] },
      { type:'email_review',     title:'Email Review',        agent:'echo',          dur:[7,12],  steps:['Scanning inbox…','Categorizing by priority…','Drafting replies…','Priority items flagged'] },
      { type:'gen_reminders',    title:'Generate Reminders',  agent:'memo',          dur:[5,8],   steps:['Checking upcoming deadlines…','Creating reminder entries…','Scheduling notifications…','Reminders set'] },
      { type:'create_tasks',     title:'Create Tasks',        agent:'atlas_planner', dur:[5,8],   steps:['Loading task backlog…','Prioritizing items…','Assigning owners…','Tasks created'] },
      { type:'org_schedule',     title:'Organize Schedule',   agent:'calypso',       dur:[6,10],  steps:['Loading all events…','Resolving time conflicts…','Optimizing slots…','Schedule ready'] },
    ],
    finance: [
      { type:'review_bills',    title:'Review Bills',            agent:'ledger',    dur:[6,10],  steps:['Loading bill tracker…','Checking due dates…','Flagging overdue items…','Bills reviewed'] },
      { type:'calc_budget',     title:'Calculate Budget',        agent:'penny',     dur:[7,12],  steps:['Loading income entries…','Subtracting all expenses…','Applying budget rules…','Budget calculated'] },
      { type:'track_expenses',  title:'Track Expenses',          agent:'greenbean', dur:[6,9],   steps:['Loading expense entries…','Categorizing by type…','Generating insights…','Report updated'] },
      { type:'update_savings',  title:'Update Savings',          agent:'vault',     dur:[5,8],   steps:['Loading savings data…','Calculating growth rate…','Projecting milestones…','Savings goal updated'] },
      { type:'fin_summary',     title:'Financial Summary',       agent:'greenbean', dur:[7,12],  steps:['Gathering all financial data…','Calculating net balance…','Generating charts…','Summary generated'] },
    ],
  };

  var DEPTS = ['security','housing','commerce','productivity','finance'];

  var ERROR_MSGS = [
    'Network timeout — will retry',
    'Listing temporarily unavailable',
    'Rate limit reached — cooling down',
    'Permission required — needs input',
    'Service temporarily unavailable',
    'Connection interrupted — reconnecting',
  ];

  var ERROR_CHANCE     = 0.07;  // 7% chance per progress tick
  var ERROR_RECOVER_MS = 4500;  // auto-recover after 4.5 s

  // ── STATE ────────────────────────────────────────────────────────
  var _emp      = {};  // empId  → { state, task, taskId, progress, step, completedToday, errors, startTime }
  var _deptRun  = {};  // deptId → 'idle'|'running'|'paused'
  var _queues   = {};  // deptId → [task objects]
  var _timers   = {};  // key    → interval/timeout id
  var _metrics  = { totalCompleted: 0, totalErrors: 0, startTime: null, byDept: {} };

  function _init() {
    DEPTS.forEach(function (d) {
      _deptRun[d]  = 'idle';
      _queues[d]   = [];
      _metrics.byDept[d] = { completed: 0, errors: 0 };
    });
    if (typeof COS !== 'undefined' && COS.employees) {
      Object.keys(COS.employees).forEach(function (id) {
        _emp[id] = { state: 'idle', task: null, taskId: null, progress: 0, step: '', completedToday: 0, errors: 0, startTime: null };
      });
    }
  }

  // ── HELPERS ─────────────────────────────────────────────────────
  function _cos()        { return typeof COS !== 'undefined' ? COS : null; }
  function _emit(ev, d)  { var c = _cos(); if (c) c.events.emit(ev, d); }
  function _log(a,dept,m){ var c = _cos(); if (c) c.activity.log({ agent: a, dept: dept || 'ops', msg: m, source: 'runtime' }); }
  function _deptName(id) { var c = _cos(); return c && c.departments && c.departments[id] ? c.departments[id].name : id; }
  function _empName(id)  { var c = _cos(); return c && c.employees && c.employees[id] ? c.employees[id].name : id; }
  function _deptEmps(id) { var c = _cos(); return c && c.deptEmployees ? (c.deptEmployees[id] || []) : []; }

  function _setEmp(id, patch) {
    if (!_emp[id]) _emp[id] = { state: 'idle', task: null, taskId: null, progress: 0, step: '', completedToday: 0, errors: 0, startTime: null };
    Object.assign(_emp[id], patch);
    _emit('agent:stateChange', { id: id, s: _emp[id] });
  }

  function _setDept(id, state) {
    _deptRun[id] = state;
    _emit('dept:stateChange', { id: id, state: state });
  }

  function _clearDeptTimers(deptId) {
    Object.keys(_timers).forEach(function (k) {
      if (k.startsWith(deptId + ':')) {
        clearInterval(_timers[k]);
        clearTimeout(_timers[k]);
        delete _timers[k];
      }
    });
  }

  // ── QUEUE BUILDER ────────────────────────────────────────────────
  function _buildQueue(deptId) {
    var lib      = TASK_LIB[deptId] || [];
    var count    = 3 + Math.floor(Math.random() * 3);  // 3–5 tasks
    var shuffled = lib.slice().sort(function () { return Math.random() - .5; });
    return shuffled.slice(0, Math.min(count, lib.length)).map(function (t, i) {
      var dur = (t.dur[0] + Math.floor(Math.random() * (t.dur[1] - t.dur[0]))) * 1000;
      return { id: t.type + '_' + Date.now() + '_' + i, type: t.type, title: t.title,
               dept: deptId, agent: t.agent, duration: dur, steps: t.steps.slice(),
               status: 'queued', progress: 0, startTime: null, endTime: null };
    });
  }

  // ── SCHEDULER ────────────────────────────────────────────────────
  function _scheduleNext(deptId) {
    if (_deptRun[deptId] !== 'running') return;

    var queue    = _queues[deptId] || [];
    var nextTask = null;
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].status === 'queued') { nextTask = queue[i]; break; }
    }

    if (!nextTask) { _allDone(deptId); return; }

    var agentId = nextTask.agent;
    var aState  = _emp[agentId];
    var avail   = !aState || aState.state === 'idle' || aState.state === 'completed';

    if (!avail) {
      var wk = deptId + ':wait:' + nextTask.id;
      clearTimeout(_timers[wk]);
      _timers[wk] = setTimeout(function () { _scheduleNext(deptId); }, 1800);
      return;
    }

    _executeTask(deptId, nextTask, agentId);
  }

  // ── EXECUTION ────────────────────────────────────────────────────
  function _executeTask(deptId, task, agentId) {
    task.status    = 'running';
    task.startTime = Date.now();

    var stepCount = task.steps.length;
    var tickMs    = Math.max(700, Math.floor(task.duration / (stepCount + 1)));
    var stepIdx   = 0;
    var tk        = deptId + ':' + agentId;

    _setEmp(agentId, { state: 'running', task: task.title, taskId: task.id, progress: 0, step: task.steps[0] || 'Starting…', startTime: Date.now() });
    _emit('dept:queueUpdate', { id: deptId, queue: _queues[deptId] });
    _log(_empName(agentId), deptId, _empName(agentId) + ' started: ' + task.title);

    clearInterval(_timers[tk]);
    _timers[tk] = setInterval(function () {
      if (_deptRun[deptId] === 'paused') return;
      if (_deptRun[deptId] !== 'running') { clearInterval(_timers[tk]); return; }

      if (Math.random() < ERROR_CHANCE) {
        clearInterval(_timers[tk]);
        _handleError(deptId, task, agentId);
        return;
      }

      stepIdx++;
      var pct  = Math.min(10 + Math.round(stepIdx * 85 / stepCount), 95);
      var step = task.steps[Math.min(stepIdx, stepCount - 1)];
      task.progress = pct;

      _setEmp(agentId, { progress: pct, step: step });
      _emit('agent:progress', { id: agentId, progress: pct, step: step, task: task.title, dept: deptId });

      if (stepIdx >= stepCount) {
        clearInterval(_timers[tk]);
        setTimeout(function () { _completeTask(deptId, task, agentId); }, Math.floor(tickMs * 0.5));
      }
    }, tickMs);
  }

  function _completeTask(deptId, task, agentId) {
    task.status   = 'completed';
    task.endTime  = Date.now();
    task.progress = 100;

    var prev = _emp[agentId] || {};
    _setEmp(agentId, { state: 'completed', progress: 100, step: 'Complete ✓', completedToday: (prev.completedToday || 0) + 1 });

    _metrics.totalCompleted++;
    _metrics.byDept[deptId].completed++;

    _log(_empName(agentId), deptId, _empName(agentId) + ' completed: ' + task.title);
    _emit('agent:taskComplete',  { id: agentId, task: task, dept: deptId });
    _emit('dept:queueUpdate',    { id: deptId,  queue: _queues[deptId] });
    _emit('runtime:metrics',     { metrics: _metrics });

    setTimeout(function () {
      if (_deptRun[deptId] !== 'running') return;
      _setEmp(agentId, { state: 'idle', task: null, taskId: null, progress: 0, step: '' });
      _scheduleNext(deptId);
    }, 1200);
  }

  function _handleError(deptId, task, agentId) {
    var errMsg = ERROR_MSGS[Math.floor(Math.random() * ERROR_MSGS.length)];

    _setEmp(agentId, { state: 'error', step: '⚠ ' + errMsg });
    _metrics.totalErrors++;
    _metrics.byDept[deptId].errors++;

    _log(_empName(agentId), deptId, _empName(agentId) + ' — ' + errMsg);
    var c = _cos();
    if (c) c.notifications.add(_empName(agentId) + ': ' + errMsg, 'alert');
    _emit('runtime:metrics', { metrics: _metrics });

    setTimeout(function () {
      if (_deptRun[deptId] !== 'running') return;
      _log(_empName(agentId), deptId, _empName(agentId) + ' recovered — retrying: ' + task.title);
      task.status    = 'queued';
      task.progress  = 0;
      task.startTime = null;
      _setEmp(agentId, { state: 'idle', task: null, progress: 0, step: '' });
      _scheduleNext(deptId);
    }, ERROR_RECOVER_MS);
  }

  function _allDone(deptId) {
    _setDept(deptId, 'idle');
    var done = _metrics.byDept[deptId].completed;
    _log(_deptName(deptId), deptId, _deptName(deptId) + ' — all tasks finished. ' + done + ' completed this run.');
    _emit('dept:complete', { id: deptId, metrics: _metrics.byDept[deptId] });
    // Return any remaining 'completed' agents to idle
    _deptEmps(deptId).forEach(function (id) {
      if (_emp[id] && (_emp[id].state === 'completed' || _emp[id].state === 'waiting')) {
        _setEmp(id, { state: 'idle', task: null, progress: 0, step: '' });
      }
    });
  }

  // ── PUBLIC API ───────────────────────────────────────────────────

  function run(deptId) {
    var cur = _deptRun[deptId];
    if (cur === 'running') return;
    if (cur === 'paused') {
      // Resume: restore state, restart scheduler
      _setDept(deptId, 'running');
      _deptEmps(deptId).forEach(function (id) {
        if (_emp[id] && _emp[id].state === 'paused') _setEmp(id, { state: 'idle' });
      });
      _log(_deptName(deptId), deptId, _deptName(deptId) + ' resumed.');
      _scheduleNext(deptId);
      return;
    }
    // Fresh start
    _queues[deptId] = _buildQueue(deptId);
    _setDept(deptId, 'running');
    _emit('dept:queueUpdate', { id: deptId, queue: _queues[deptId] });
    _log(_deptName(deptId), deptId, _deptName(deptId) + ' started — ' + _queues[deptId].length + ' tasks queued.');
    _scheduleNext(deptId);
  }

  function pause(deptId) {
    if (_deptRun[deptId] !== 'running') return;
    _setDept(deptId, 'paused');
    _deptEmps(deptId).forEach(function (id) {
      if (_emp[id] && _emp[id].state === 'running') _setEmp(id, { state: 'paused' });
    });
    _log(_deptName(deptId), deptId, _deptName(deptId) + ' paused.');
  }

  function stop(deptId) {
    _clearDeptTimers(deptId);
    _setDept(deptId, 'idle');
    _deptEmps(deptId).forEach(function (id) {
      _setEmp(id, { state: 'idle', task: null, taskId: null, progress: 0, step: '' });
    });
    _queues[deptId] = [];
    _emit('dept:queueUpdate', { id: deptId, queue: [] });
    _log(_deptName(deptId), deptId, _deptName(deptId) + ' stopped — all agents returned to idle.');
  }

  function runAll() {
    _metrics.startTime = Date.now();
    _log('CyberCookieOS', 'ops', '▶ RUN HEADQUARTERS — all departments starting.');
    DEPTS.forEach(function (d, i) { setTimeout(function () { run(d); }, i * 380); });
  }

  function pauseAll() {
    DEPTS.forEach(function (d) { if (_deptRun[d] === 'running') pause(d); });
    _log('CyberCookieOS', 'ops', '⏸ All departments paused.');
  }

  function stopAll() {
    DEPTS.forEach(function (d) { stop(d); });
    _log('CyberCookieOS', 'ops', '⏹ All departments stopped.');
  }

  function isAnyRunning() {
    return DEPTS.some(function (d) { return _deptRun[d] === 'running' || _deptRun[d] === 'paused'; });
  }

  function getEmpState(id)    { return _emp[id] || { state: 'idle', task: null, progress: 0, step: '', completedToday: 0, errors: 0 }; }
  function getDeptState(id)   { return _deptRun[id] || 'idle'; }
  function getQueue(id)       { return _queues[id] || []; }
  function getMetrics()       { return _metrics; }

  // Initialize immediately (COS already loaded)
  _init();

  return {
    init:         _init,
    run:          run,
    pause:        pause,
    stop:         stop,
    runAll:       runAll,
    pauseAll:     pauseAll,
    stopAll:      stopAll,
    getEmpState:  getEmpState,
    getDeptState: getDeptState,
    getQueue:     getQueue,
    getMetrics:   getMetrics,
    isAnyRunning: isAnyRunning,
    DEPTS:        DEPTS,
  };

})();
