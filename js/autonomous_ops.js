/* ================================================================
   CyberCookieOS — Autonomous Operations Engine v1.0
   The company starts working the moment the office opens.
   Departments run routines. Employees think, log, and collaborate.
   Missions are created automatically. The CEO only approves.
   Depends on: COS, MS, KPI, MEM, ORION
================================================================ */
(function (global) {
  'use strict';

  // ── COMPANY WORKDAY PHASE ─────────────────────────────────────

  function _phase() {
    var h = new Date().getHours();
    if (h >= 0  && h < 6)  return 'overnight';
    if (h >= 6  && h < 9)  return 'opening';
    if (h >= 9  && h < 12) return 'morning';
    if (h >= 12 && h < 14) return 'midday';
    if (h >= 14 && h < 18) return 'afternoon';
    if (h >= 18 && h < 22) return 'evening';
    return 'closing';
  }

  function _phaseLabel() {
    var map = {
      overnight: 'OVERNIGHT OPS',
      opening:   'OFFICE OPENING',
      morning:   'MORNING OPERATIONS',
      midday:    'MIDDAY OPERATIONS',
      afternoon: 'AFTERNOON OPERATIONS',
      evening:   'EVENING OPERATIONS',
      closing:   'CLOSING OPERATIONS',
    };
    return map[_phase()] || 'OPERATIONS';
  }

  function _monthYear() {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  function _dayName() {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
  }

  // ── HELPERS ───────────────────────────────────────────────────

  function _pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function _log(agent, dept, msg) {
    if (typeof COS !== 'undefined') {
      COS.activity.log({ agent: agent, dept: dept, msg: msg, source: 'auto' });
    }
  }

  function _isOverdue(routineId) {
    if (typeof ORION === 'undefined') return true;
    return ORION.routines.isOverdue(routineId);
  }

  function _markRun(routineId) {
    if (typeof ORION !== 'undefined') ORION.routines.markRun(routineId);
  }

  // Mission deduplification guard — don't create duplicate career missions
  var _lastCareerMissionTs = 0;
  var _CAREER_COOLDOWN_MS  = 10 * 60 * 1000; // 10 minutes

  // ── DIALOGUE POOLS ─────────────────────────────────────────────
  // Pools of natural-sounding agent messages. Each routine picks randomly.

  var DLG = {
    orion_open: [
      'Running department check-in for ' + _dayName() + '. Company is online.',
      'Office is open. Beginning department status sweep.',
      'Good ' + (new Date().getHours() < 12 ? 'morning' : 'afternoon') + ', everyone. Company operations are live.',
      _dayName() + ' operations commencing. All departments reporting in.',
    ],
    orion_status_ok: [
      'All departments nominal. ' + (typeof MS !== 'undefined' ? (MS.count().pending + ' missions active.') : '0 missions active.'),
      'Company health check complete — no issues detected. Departments are operational.',
      'Status: all systems nominal. Orion standing by for mission coordination.',
    ],
    orion_briefing_ready: [
      'Morning briefing assembled. CEO dashboard updated.',
      'Executive briefing complete. ' + (typeof ORION !== 'undefined' ? ORION.approvals.pending().length : 0) + ' approval(s) awaiting CEO review.',
      'Overnight summary compiled. All department reports collected.',
    ],

    athena_scan_start: [
      'Initiating threat scan — reviewing flagged IP ranges across monitored segments.',
      'Beginning security sweep — checking network perimeter for anomalies.',
      'Overnight scan sequence initiated. Scanning 12 active IP ranges.',
      'Threat Hunter protocol active. Cross-referencing against live threat feeds.',
    ],
    athena_scan_clear: [
      'Scan complete. No critical threats detected. Network posture: stable.',
      'Security sweep finished. 2 low-severity flags logged, no escalation needed.',
      'All clear — overnight scan returned clean. No new indicators of compromise.',
    ],
    athena_scan_threat: [
      'Scan flagged suspicious activity on 185.220.101.x — logged for Sentinel review.',
      'Medium threat detected. IP 45.33.24.8 showing port scan behavior. Escalating.',
      'Anomalous outbound pattern detected. Logging for SOC review. Not critical.',
    ],
    nimbus_health: [
      'Cloud health check complete. All 8 monitored endpoints reporting nominal.',
      'Service uptime at 99.8%. No performance degradation across cloud assets.',
      'Cloud infrastructure healthy. No alerts in queue. Monitoring continues.',
    ],
    sentinel_triage: [
      'SOC alert queue reviewed. 3 alerts cleared, 1 elevated for Athena follow-up.',
      'Triaging overnight queue — 5 alerts processed. Queue clear.',
      'SOC sweep complete. No open incidents. Sentinel standing by.',
    ],

    nova_search_start: [
      'Beginning morning job search — South Jersey · Philadelphia · Remote US.',
      'Scanning career opportunities across 3 regions. Filtering by IT roles.',
      'Morning search initiated. Checking Indeed, LinkedIn, company career pages.',
      'Career scan underway. Filtering for roles matching Zee\'s profile.',
    ],
    nova_to_resuMate: [
      'Passing top match to Resu-Mate for ATS analysis.',
      'Flagging best opportunity — forwarding to Resu-Mate for resume check.',
      'Top match identified. Requesting resume optimization analysis.',
    ],
    resuMate_working: [
      'Running ATS keyword analysis against current resume.',
      'Comparing job requirements against Zee\'s skill profile.',
      'Analyzing job description for ATS compliance gaps.',
    ],
    resuMate_to_penny: [
      'ATS analysis complete. Forwarding salary data to Penny.',
      'Resume match assessed. Asking Penny to evaluate financial impact.',
      'Sending compensation data to Finance for goal alignment check.',
    ],
    penny_eval: [
      'Evaluating salary impact on current budget model.',
      'Checking how this role affects the Ireland savings timeline.',
      'Comparing compensation against current financial goals.',
    ],
    scoutx_update: [
      'Refreshing national IT hiring market rankings — 10-state comparison.',
      'Updating opportunity index. Pulling SOC demand, salary, and COL data.',
      'Market intelligence update running. Comparing state-level hiring trends.',
    ],
    scoutx_result_va: [
      'Virginia leads opportunity index — +38% SOC demand, $72k avg, COL 92. Recommend monitoring DOD-adjacent remote roles.',
      'Top market: Virginia (score 17.4). Maryland close behind at +31% SEC demand. Both outperform NJ significantly.',
    ],

    penny_reconcile: [
      'Running budget reconciliation for ' + _monthYear() + '.',
      'Reviewing category spending vs targets for the current period.',
      'Monthly budget review initiated. Pulling all category actuals.',
    ],
    penny_result_ok: [
      'Budget health: on track. No categories exceeded. Emergency fund at 34% of 6-month goal.',
      'Budget reconciliation complete. Housing $0 / $1,500 reserved. Savings trajectory stable.',
      'All budget categories within tolerance. No alerts. Finance health: strong.',
    ],
    vault_savings: [
      'Savings trajectory analysis complete. On track for 6-month goal by March 2027.',
      'Projecting savings goal completion: 14 months at current rate. Ahead of schedule.',
      'Emergency fund milestone update: 34% complete. Monthly contribution rate: stable.',
    ],
    ledger_bills: [
      '3 recurring payments due within 7 days. No surprises in the bill schedule.',
      'Bill schedule reviewed. All payments on track. No overdue items.',
      'Upcoming bills logged. No new subscriptions detected. Budget impact: planned.',
    ],

    calypso_sync: [
      'Syncing calendar — protecting CEO focus blocks for the week.',
      'Calendar sync complete. 2 deep-work blocks protected. Study session reserved.',
      'Weekly schedule reviewed. No conflicts detected. Focus time secured.',
    ],
    echo_inbox: [
      'Inbox processed — 4 messages reviewed, 1 flagged for CEO attention.',
      'Email sweep complete. No urgent items. 2 follow-up reminders queued.',
      'Inbox cleared. Career-related messages tagged for Nova coordination.',
    ],
    memo_reminders: [
      'Weekly reminders queued. Interview prep reminder set for Tuesday.',
      'Follow-up schedule updated. 2 job applications flagged for 7-day follow-up.',
    ],
  };

  // ── JOB SAMPLES (for autonomous search simulation) ────────────

  var _JOBS = [
    { title: 'Junior SOC Analyst',       company: 'Comcast',           salary: 55000 },
    { title: 'Service Desk Analyst',      company: 'Lockheed Martin',   salary: 52000 },
    { title: 'Remote Junior SOC Analyst', company: 'Secureworks',       salary: 58000 },
    { title: 'Cloud Support Engineer',    company: 'AWS / Amazon',      salary: 65000 },
    { title: 'NOC Technician',            company: 'GTT Communications', salary: 48000 },
    { title: 'Junior Security Analyst',   company: 'Unisys Corporation', salary: 60000 },
    { title: 'IT Support Specialist',     company: 'Camden County Govt', salary: 45000 },
    { title: 'Microsoft 365 Support',     company: 'CDW',               salary: 50000 },
    { title: 'Systems Administrator I',   company: 'Cooper Health',     salary: 58000 },
  ];

  // ── SECURITY ROUTINES ─────────────────────────────────────────

  function _runSecurityScan(startDelay) {
    startDelay = startDelay || 0;

    setTimeout(function () {
      _log('Athena', 'security', _pick(DLG.athena_scan_start));
    }, startDelay);

    setTimeout(function () {
      var threatRoll  = Math.random();
      var resultMsg   = threatRoll > 0.72 ? _pick(DLG.athena_scan_threat) : _pick(DLG.athena_scan_clear);
      _log('Athena', 'security', resultMsg);

      if (typeof KPI !== 'undefined') KPI.increment('security', 'scansCompleted');
      _markRun('security_overnight');

      if (threatRoll > 0.72 && typeof COS !== 'undefined') {
        COS.company.emit('ThreatDetected', {
          severity: 'medium',
          msg: 'Medium threat flagged during overnight security sweep.',
        });
        if (typeof KPI !== 'undefined') KPI.increment('security', 'threatsDetected');
      }
    }, startDelay + 4200);

    setTimeout(function () {
      _log('Nimbus', 'security', _pick(DLG.nimbus_health));
      _markRun('security_morning');
    }, startDelay + 6800);

    setTimeout(function () {
      _log('Sentinel', 'security', _pick(DLG.sentinel_triage));
    }, startDelay + 9000);
  }

  // ── CAREER ROUTINES ───────────────────────────────────────────

  function _runJobSearch(startDelay) {
    startDelay = startDelay || 0;

    // Deduplification: don't fire collaboration chain if one just ran
    var now = Date.now();
    var canFireChain = (now - _lastCareerMissionTs) > _CAREER_COOLDOWN_MS;

    var job      = _JOBS[Math.floor(Math.random() * _JOBS.length)];
    var count    = 11 + Math.floor(Math.random() * 6);
    var match    = 62 + Math.floor(Math.random() * 22);

    setTimeout(function () {
      _log('Nova', 'housing', _pick(DLG.nova_search_start));
    }, startDelay);

    setTimeout(function () {
      _log('Nova', 'housing',
        'Search complete — ' + count + ' opportunities found. Top match: ' +
        job.title + ' at ' + job.company +
        ' ($' + Math.round(job.salary / 1000) + 'k, ' + match + '% skill match).'
      );
      if (typeof KPI !== 'undefined') KPI.increment('career', 'jobsFound', count);
      _markRun('career_morning');

      if (canFireChain && typeof COS !== 'undefined') {
        _lastCareerMissionTs = Date.now();
        COS.company.emit('JobFound', {
          job:       { title: job.title, company: job.company, salary: job.salary, id: 'auto_' + Date.now() },
          count:     count,
          avgSalary: 52000,
          source:    'auto_routine',
        });
      }
    }, startDelay + 4500);

    setTimeout(function () {
      _log('Nova', 'housing', _pick(DLG.nova_to_resuMate));
    }, startDelay + 5800);
  }

  function _runMarketUpdate(startDelay) {
    startDelay = startDelay || 0;
    setTimeout(function () {
      _log('Scout-X', 'housing', _pick(DLG.scoutx_update));
    }, startDelay);
    setTimeout(function () {
      _log('Scout-X', 'housing', _pick(DLG.scoutx_result_va));
      _markRun('career_market');
    }, startDelay + 3800);
  }

  // ── FINANCE ROUTINES ──────────────────────────────────────────

  function _runFinanceRoutine(startDelay) {
    startDelay = startDelay || 0;
    setTimeout(function () {
      _log('Penny', 'finance', _pick(DLG.penny_reconcile));
    }, startDelay);
    setTimeout(function () {
      _log('Penny',  'finance', _pick(DLG.penny_result_ok));
      _log('Vault',  'finance', _pick(DLG.vault_savings));
      _log('Ledger', 'finance', _pick(DLG.ledger_bills));
      _markRun('finance_reconcile');
      if (typeof KPI !== 'undefined') KPI.update('finance', { budgetHealth: 'on track' });
    }, startDelay + 3600);
  }

  // ── PRODUCTIVITY ROUTINES ─────────────────────────────────────

  function _runProductivityRoutine(startDelay) {
    startDelay = startDelay || 0;
    setTimeout(function () {
      _log('Calypso', 'productivity', _pick(DLG.calypso_sync));
    }, startDelay);
    setTimeout(function () {
      _log('Echo', 'productivity', _pick(DLG.echo_inbox));
      _log('Memo', 'productivity', _pick(DLG.memo_reminders));
      _markRun('productivity_plan');
      if (typeof KPI !== 'undefined') KPI.increment('productivity', 'tasksCompleted', 4);
    }, startDelay + 3200);
  }

  // ── ORION COORDINATION SEQUENCE ───────────────────────────────

  function _runOrionSequence(startDelay) {
    startDelay = startDelay || 0;
    setTimeout(function () {
      _log('Orion', 'ops', _pick(DLG.orion_open));
    }, startDelay);
    setTimeout(function () {
      _log('Orion', 'ops', _pick(DLG.orion_status_ok));
    }, startDelay + 2200);
    setTimeout(function () {
      if (typeof ORION !== 'undefined') {
        ORION.buildBriefing();
        ORION.checkHealth();
        _markRun('ops_briefing');
      }
      _log('Orion', 'ops', _pick(DLG.orion_briefing_ready));
      if (typeof COS !== 'undefined') {
        COS.events.emit('company:WorkdayStarted', { phase: _phase(), ts: Date.now() });
      }
    }, startDelay + 5500);
  }

  // ── MAINTENANCE SIMULATION (idle → always working) ────────────
  // When no overdue routines exist, employees do background maintenance.

  var _MAINTENANCE_POOL = [
    { agent: 'Athena',     dept: 'security',     msg: 'Reviewing historical threat intelligence — updating signatures.' },
    { agent: 'Nimbus',     dept: 'security',     msg: 'Cloud metrics archived. Performance baseline updated.' },
    { agent: 'Sentinel',   dept: 'security',     msg: 'SOC documentation updated. Playbooks reviewed.' },
    { agent: 'Nova',       dept: 'housing',      msg: 'Reviewing saved job listings — checking for updates and expirations.' },
    { agent: 'Resu-Mate',  dept: 'housing',      msg: 'Updating ATS keyword database with current market terms.' },
    { agent: 'Scout-X',    dept: 'housing',      msg: 'Background market monitoring — tracking regional salary shifts.' },
    { agent: 'Penny',      dept: 'finance',      msg: 'Reviewing spending patterns — refining budget recommendations.' },
    { agent: 'Vault',      dept: 'finance',      msg: 'Savings trajectory projections refreshed with latest market data.' },
    { agent: 'Ledger',     dept: 'finance',      msg: 'Subscription audit complete — no redundant services detected.' },
    { agent: 'Calypso',    dept: 'productivity', msg: 'Focus block schedule optimized for the week ahead.' },
    { agent: 'Echo',       dept: 'productivity', msg: 'Inbox patterns logged — response time baseline established.' },
    { agent: 'Pixel',      dept: 'commerce',     msg: 'Monitoring Etsy trend data — holographic niche still strong.' },
    { agent: 'Orion',      dept: 'ops',          msg: 'Company KPIs reviewed. All departments within performance targets.' },
    { agent: 'Orion',      dept: 'ops',          msg: 'Mission history archived. No stalled missions detected.' },
    { agent: 'Greenbean',  dept: 'finance',      msg: 'Monthly P&L projection updated. Financial health report generated.' },
    { agent: 'Atlas',      dept: 'housing',      msg: 'Job application contact log reviewed. Follow-up schedule updated.' },
    { agent: 'Memo',       dept: 'productivity', msg: 'Reminder queue optimized. Duplicate alerts merged.' },
  ];

  var _maintIdx = 0;

  function _runMaintenanceTick() {
    var entry = _MAINTENANCE_POOL[_maintIdx % _MAINTENANCE_POOL.length];
    _maintIdx++;
    _log(entry.agent, entry.dept, entry.msg);
  }

  // ── COMPANY STARTUP SEQUENCE ──────────────────────────────────
  // Runs on page load. Checks what is overdue and executes in order
  // with staggered delays so the office "wakes up" naturally.

  var _started = false;

  function startCompanyDay() {
    if (_started) return;
    _started = true;

    if (typeof COS === 'undefined') return;

    var cursor = 500;  // ms cursor for staggered start

    // 1. Orion opens the office
    _runOrionSequence(cursor);
    cursor += 1200;

    // 2. Security dept (if overdue)
    if (_isOverdue('security_overnight') || _isOverdue('security_morning')) {
      _runSecurityScan(cursor);
      cursor += 2400;
    }

    // 3. Career dept — job search (if overdue)
    if (_isOverdue('career_morning')) {
      _runJobSearch(cursor);
      cursor += 2200;
    }

    // 4. Career dept — market update (if overdue)
    if (_isOverdue('career_market')) {
      _runMarketUpdate(cursor + 1800);
    }

    // 5. Finance dept
    if (_isOverdue('finance_reconcile')) {
      _runFinanceRoutine(cursor + 800);
    }

    // 6. Productivity dept
    if (_isOverdue('productivity_plan')) {
      _runProductivityRoutine(cursor + 1600);
    }

    // 7. Maintenance ticks — keep company busy between routines
    var maintStart = Math.max(cursor + 4000, 18000);
    setTimeout(function () {
      _runMaintenanceTick();
      setInterval(_runMaintenanceTick, 45000 + Math.random() * 30000);
    }, maintStart);

    // 8. Periodic routine re-check (every 30 min while page is open)
    setInterval(function () {
      if (_isOverdue('security_overnight')) _runSecurityScan(0);
      if (_isOverdue('career_morning'))     _runJobSearch(2000);
      if (_isOverdue('finance_reconcile'))  _runFinanceRoutine(4500);
      if (_isOverdue('productivity_plan'))  _runProductivityRoutine(6000);
      if (_isOverdue('career_market'))      _runMarketUpdate(8000);
      if (_isOverdue('ops_briefing') && typeof ORION !== 'undefined') {
        ORION.buildBriefing();
        _markRun('ops_briefing');
      }
    }, 30 * 60 * 1000);

    // 9. Publish the current workday phase so the UI can display it
    COS.state.set('company.workday.phase', _phase());
    COS.state.set('company.workday.label', _phaseLabel());
    COS.state.set('company.workday.startTs', Date.now());

    COS.events.emit('company:WorkdayPhase', { phase: _phase(), label: _phaseLabel() });
  }

  // ── OPERATIONAL LEARNING ──────────────────────────────────────

  var LEARNING = {
    record: function (action, decision, dept) {
      if (typeof MEM === 'undefined') return;
      MEM.ops.add('decisions', {
        action:   action,
        decision: decision,
        dept:     dept || 'ops',
        ts:       Date.now(),
      });
    },

    getApprovalRate: function (action) {
      if (typeof MEM === 'undefined') return 0.5;
      var all = MEM.ops.get('decisions').filter(function (d) {
        return !action || d.action.indexOf(action) >= 0;
      });
      if (!all.length) return 0.5;
      var approved = all.filter(function (d) { return d.decision === 'approved'; }).length;
      return Math.round((approved / all.length) * 100);
    },

    getInsights: function () {
      if (typeof MEM === 'undefined') return [];
      var decisions = MEM.ops.get('decisions', 100);
      if (!decisions.length) return [];

      var insights = [];
      var total    = decisions.length;
      var approved = decisions.filter(function (d) { return d.decision === 'approved'; }).length;
      var rejected = decisions.filter(function (d) { return d.decision === 'rejected'; }).length;

      if (total >= 3) {
        insights.push({
          type: 'approval_rate',
          msg:  'CEO approval rate: ' + Math.round((approved / total) * 100) + '% across ' + total + ' decision(s).',
        });
      }

      // Group by dept
      var depts = {};
      decisions.forEach(function (d) {
        depts[d.dept] = depts[d.dept] || { approved: 0, rejected: 0 };
        depts[d.dept][d.decision === 'approved' ? 'approved' : 'rejected']++;
      });
      Object.keys(depts).forEach(function (dept) {
        var r = depts[dept];
        var dTotal = r.approved + r.rejected;
        if (dTotal >= 2 && r.rejected > r.approved) {
          insights.push({ type: 'dept_caution', dept: dept, msg: dept + ' department decisions are frequently rejected — Orion will filter recommendations.' });
        }
      });

      return insights;
    },
  };

  // ── EVENT LISTENERS ───────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    if (typeof COS === 'undefined') return;

    // Record CEO decisions for learning
    COS.events.on('approval:granted', function (item) {
      LEARNING.record(item.action || item.title, 'approved', item.dept);
    });
    COS.events.on('approval:rejected', function (item) {
      LEARNING.record(item.action || item.title, 'rejected', item.dept);
    });

    // Update workday phase display if the element exists
    COS.events.on('company:WorkdayPhase', function (data) {
      var el = document.getElementById('oc-workdayPhase');
      if (el) el.textContent = data.label;
    });

    // Start the company workday after a brief pause
    setTimeout(startCompanyDay, 900);
  });

  // ── PUBLIC API ────────────────────────────────────────────────

  global.AUTO = {
    startCompanyDay:   startCompanyDay,
    phase:             _phase,
    phaseLabel:        _phaseLabel,
    runSecurityScan:   _runSecurityScan,
    runJobSearch:      _runJobSearch,
    runMarketUpdate:   _runMarketUpdate,
    runFinance:        _runFinanceRoutine,
    runProductivity:   _runProductivityRoutine,
    runOrion:          _runOrionSequence,
    learning:          LEARNING,
    version:           '1.0.0',
  };

})(window);
