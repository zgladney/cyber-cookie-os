/* ================================================================
   CyberCookieOS — Orion v1.0 — Chief Operations Officer
   Coordinates departments. Builds morning briefings.
   Manages the CEO approval queue. Monitors company health.
   Orchestrates cross-department collaboration chains.
   Depends on: COS, MS, KPI, MEM
================================================================ */
(function (global) {
  'use strict';

  var APPROVAL_KEY = 'orion.approvals';
  var BRIEFING_KEY = 'orion.briefing';
  var ROUTINES_KEY = 'orion.routines';

  // ── ROUTINE DEFINITIONS ───────────────────────────────────────

  var ROUTINE_DEFS = [
    { id: 'security_overnight',  dept: 'security',     agent: 'Athena',    title: 'Overnight Threat Scan',         intervalH: 8  },
    { id: 'security_morning',    dept: 'security',     agent: 'Nimbus',    title: 'Morning Health Check',          intervalH: 24 },
    { id: 'career_morning',      dept: 'housing',      agent: 'Nova',      title: 'Morning Job Search',            intervalH: 24 },
    { id: 'career_market',       dept: 'housing',      agent: 'Scout-X',   title: 'Market Intelligence Update',    intervalH: 48 },
    { id: 'commerce_trends',     dept: 'commerce',     agent: 'Pixel',     title: 'Trend Analysis',                intervalH: 12 },
    { id: 'finance_reconcile',   dept: 'finance',      agent: 'Penny',     title: 'Budget Reconciliation',         intervalH: 24 },
    { id: 'productivity_plan',   dept: 'productivity', agent: 'Calypso',   title: 'Daily Planning',                intervalH: 24 },
    { id: 'ops_briefing',        dept: 'ops',          agent: 'Orion',     title: 'Executive Briefing',            intervalH: 24 },
  ];

  // ── APPROVAL QUEUE ────────────────────────────────────────────

  var approvals = {
    _load: function () {
      return typeof COS !== 'undefined' ? (COS.state.get(APPROVAL_KEY) || []) : [];
    },
    _save: function (list) {
      if (typeof COS !== 'undefined') COS.state.set(APPROVAL_KEY, list);
    },

    add: function (item) {
      var list   = approvals._load();
      item.id     = 'APR-' + Date.now();
      item.status = 'pending';
      item.ts     = Date.now();
      list.unshift(item);
      if (list.length > 50) list = list.slice(0, 50);
      approvals._save(list);

      if (typeof KPI !== 'undefined') KPI.increment('ops', 'approvalsQueued');
      if (typeof COS !== 'undefined') {
        COS.events.emit('approval:added', item);
        COS.events.emit('company:CEOApprovalRequested', { id: item.id, title: item.title, dept: item.dept });
        COS.notifications.add('CEO approval required: ' + item.title, 'high');
        COS.activity.log({ agent: 'Orion', dept: 'ops', msg: 'Approval queued: ' + item.title, source: 'orion' });
      }

      if (typeof MEM !== 'undefined') {
        MEM.ops.add('approvals', { action: item.action || item.title, status: 'pending', dept: item.dept });
      }

      return item;
    },

    grant: function (id) {
      var list = approvals._load();
      var item = null;
      for (var i = 0; i < list.length; i++) { if (list[i].id === id) { item = list[i]; break; } }
      if (!item) return;
      item.status    = 'approved';
      item.decidedAt = Date.now();
      approvals._save(list);

      if (typeof KPI !== 'undefined') KPI.increment('ops', 'approvalsGranted');
      if (typeof COS !== 'undefined') {
        COS.events.emit('approval:granted', item);
        COS.activity.log({ agent: 'CEO', dept: 'ops', msg: 'Approved: ' + item.title, source: 'user' });
      }
      if (typeof MEM !== 'undefined') {
        MEM.ops.add('approvals', { action: item.title, status: 'approved', dept: item.dept, decidedAt: item.decidedAt });
      }
      if (item.missionId && typeof MS !== 'undefined') {
        MS.complete(item.missionId, 'CEO approved: ' + item.title);
      }
    },

    reject: function (id, reason) {
      var list = approvals._load();
      var item = null;
      for (var i = 0; i < list.length; i++) { if (list[i].id === id) { item = list[i]; break; } }
      if (!item) return;
      item.status    = 'rejected';
      item.decidedAt = Date.now();
      item.reason    = reason || '';
      approvals._save(list);

      if (typeof KPI !== 'undefined') KPI.increment('ops', 'approvalsRejected');
      if (typeof COS !== 'undefined') {
        COS.events.emit('approval:rejected', item);
        COS.activity.log({ agent: 'CEO', dept: 'ops', msg: 'Rejected: ' + item.title, source: 'user' });
      }
      if (typeof MEM !== 'undefined') {
        MEM.ops.add('approvals', { action: item.title, status: 'rejected', dept: item.dept, reason: reason });
      }
      if (item.missionId && typeof MS !== 'undefined') {
        MS.reject(item.missionId, 'CEO rejected: ' + reason);
      }
    },

    pending: function () {
      return approvals._load().filter(function (a) { return a.status === 'pending'; });
    },

    all: function () {
      return approvals._load();
    },
  };

  // ── DAILY ROUTINES ────────────────────────────────────────────

  var routines = {
    getLastRun: function (routineId) {
      var rts = typeof COS !== 'undefined' ? (COS.state.get(ROUTINES_KEY) || {}) : {};
      return rts[routineId] || null;
    },

    markRun: function (routineId) {
      if (typeof COS === 'undefined') return;
      var rts      = COS.state.get(ROUTINES_KEY) || {};
      rts[routineId] = Date.now();
      COS.state.set(ROUTINES_KEY, rts);
    },

    isOverdue: function (routineId) {
      var def = null;
      for (var i = 0; i < ROUTINE_DEFS.length; i++) {
        if (ROUTINE_DEFS[i].id === routineId) { def = ROUTINE_DEFS[i]; break; }
      }
      if (!def) return false;
      var lastRun = routines.getLastRun(routineId);
      if (!lastRun) return true;
      return (Date.now() - lastRun) > (def.intervalH * 3600000);
    },

    getStatus: function () {
      return ROUTINE_DEFS.map(function (def) {
        var lastRun = routines.getLastRun(def.id);
        var overdue = routines.isOverdue(def.id);
        return {
          id:      def.id,
          title:   def.title,
          dept:    def.dept,
          agent:   def.agent,
          intervalH: def.intervalH,
          lastRun: lastRun,
          overdue: overdue,
          status:  overdue ? 'overdue' : 'ok',
        };
      });
    },

    defs: ROUTINE_DEFS,
  };

  // ── CROSS-DEPARTMENT COLLABORATION CHAIN ──────────────────────
  // Nova finds a job → Resu-Mate + Penny + Scout-X all evaluate in parallel
  // → Orion assembles recommendation → CEO approval queued

  function runCareerCollabChain(missionId, job) {
    if (!missionId || !job || typeof COS === 'undefined') return;

    var results = {};

    MS.update(missionId, 'collaboration', 'Starting cross-department analysis...');

    // Resu-Mate: ATS match analysis (1.4s)
    setTimeout(function () {
      var match = 0;
      if (typeof window.cicJobMatch === 'function') {
        match = window.cicJobMatch(job);
      } else {
        // Estimate based on skills overlap
        var commonSkills = ['Windows 10', 'Office 365', 'Active Directory', 'Customer Service', 'Documentation'];
        var hits = (job.skills || []).filter(function (s) { return commonSkills.indexOf(s) >= 0; }).length;
        match = Math.round((hits / Math.max(job.skills ? job.skills.length : 1, 1)) * 100);
      }
      results.resuMate = { match: match };
      COS.events.emit('company:ResumeAnalyzed', { missionId: missionId, match: match, job: job.title });
      COS.activity.log({ agent: 'Resu-Mate', dept: 'housing', msg: 'ATS analysis complete: ' + match + '% match for ' + job.title, source: 'collab' });
      if (typeof KPI !== 'undefined') KPI.update('career', { avgAtsScore: match });
    }, 1400);

    // Penny: financial impact (2.6s)
    setTimeout(function () {
      var currentEst   = 42000;
      var delta        = (job.salary || 0) - currentEst;
      var monthlyDelta = Math.round(delta / 12);
      var impact       = delta > 5000 ? 'positive' : delta > 0 ? 'neutral' : 'below-target';
      results.penny    = { impact: impact, monthlyDelta: monthlyDelta };
      COS.events.emit('company:FinanceEvaluated', { missionId: missionId, impact: impact, monthlyDelta: monthlyDelta });
      COS.activity.log({ agent: 'Penny', dept: 'finance', msg: 'Financial impact: ' + impact + ' (+$' + monthlyDelta + '/mo)', source: 'collab' });
    }, 2600);

    // Scout-X: geographic analysis (4.2s)
    setTimeout(function () {
      var topMarket  = 'Virginia (+38% SOC, $72k avg)';
      results.scoutX = { topMarket: topMarket };
      COS.events.emit('company:GeoAnalyzed', { missionId: missionId, topMarket: topMarket });
      COS.activity.log({ agent: 'Scout-X', dept: 'housing', msg: 'Best hiring market: ' + topMarket, source: 'collab' });
    }, 4200);

    // Orion assembles final recommendation (6.0s)
    setTimeout(function () {
      if (typeof MS === 'undefined') return;
      MS.update(missionId, 'recommendation_ready', 'Cross-department analysis complete.');

      var matchStr  = results.resuMate ? results.resuMate.match + '% ATS' : 'unknown ATS';
      var finStr    = results.penny    ? results.penny.impact + ' (+$' + results.penny.monthlyDelta + '/mo)' : 'unknown';
      var geoStr    = results.scoutX   ? results.scoutX.topMarket : 'unknown';
      var summary   = job.title + ' @ ' + job.company + ' | ' + matchStr + ' | Finance: ' + finStr + ' | Top market: ' + geoStr;

      MS.update(missionId, 'ceo_approval', summary);

      approvals.add({
        title:           'Apply — ' + job.title + ' at ' + job.company,
        dept:            'career',
        missionId:       missionId,
        action:          'submit_application',
        summary:         summary,
        impact:          'Submitting a job application requires CEO authorization.',
        recommendations: [
          'Resu-Mate: ' + matchStr,
          'Penny: Financial impact ' + finStr,
          'Scout-X: ' + geoStr,
        ],
        data: { job: job },
      });

      if (typeof KPI !== 'undefined') {
        KPI.increment('ops', 'missionsCompleted');
        KPI.increment('career', 'applications');
      }
    }, 6000);
  }

  // ── MORNING BRIEFING ──────────────────────────────────────────

  function buildBriefing() {
    if (typeof COS === 'undefined') return null;

    var now     = new Date();
    var hour    = now.getHours();
    var dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    var dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    var greeting;
    if (hour < 5)        greeting = 'Working late';
    else if (hour < 12)  greeting = 'Good morning';
    else if (hour < 17)  greeting = 'Good afternoon';
    else if (hour < 21)  greeting = 'Good evening';
    else                 greeting = 'Still at it';

    var kpiAll        = typeof KPI !== 'undefined' ? KPI.all() : {};
    var pendingApps   = approvals.pending();
    var routineStatus = routines.getStatus();
    var overdueList   = routineStatus.filter(function (r) { return r.overdue; });
    var okRoutines    = routineStatus.filter(function (r) { return !r.overdue; });
    var missionCount  = typeof MS !== 'undefined' ? MS.count() : { complete: 0, pending: 0 };
    var allMissions   = typeof MS !== 'undefined' ? MS.list(5) : [];
    var health        = checkHealth();

    var items       = [];
    var insights    = [];
    var focusItems  = [];

    // ── SECURITY REPORT ──────────────────────────────
    var k = kpiAll.security || {};
    if ((k.scansCompleted || 0) > 0) {
      var secDetail = (k.scansCompleted || 0) + ' threat scan' + (k.scansCompleted !== 1 ? 's' : '') + ' completed.';
      if ((k.threatsDetected || 0) > 0) {
        secDetail += ' ' + k.threatsDetected + ' threat' + (k.threatsDetected !== 1 ? 's' : '') + ' logged.';
        if ((k.criticalAlerts || 0) > 0) secDetail += ' ' + k.criticalAlerts + ' CRITICAL — review required.';
      } else {
        secDetail += ' Network posture: clean.';
      }
      items.push({ dept: 'security', msg: secDetail, icon: '🛡', priority: (k.criticalAlerts || 0) > 0 ? 'high' : 'normal' });
      if ((k.criticalAlerts || 0) > 0) focusItems.push('Critical security alert requires CEO review');
    } else {
      items.push({ dept: 'security', msg: 'Security perimeter active. No scans completed yet today.', icon: '🛡', priority: 'low' });
    }

    // ── CAREER REPORT ────────────────────────────────
    var c = kpiAll.career || {};
    if ((c.jobsFound || 0) > 0) {
      var carDetail = (c.jobsFound || 0) + ' new opportunit' + (c.jobsFound !== 1 ? 'ies' : 'y') + ' identified.';
      if ((c.applications || 0) > 0) carDetail += ' ' + c.applications + ' application' + (c.applications !== 1 ? 's' : '') + ' prepared for CEO approval.';
      if ((c.savedJobs || 0) > 0)    carDetail += ' ' + c.savedJobs + ' saved for follow-up.';
      items.push({ dept: 'career', msg: carDetail, icon: '💼', priority: (c.applications || 0) > 0 ? 'high' : 'normal' });
      if ((c.applications || 0) > 0) focusItems.push('Career application ready for CEO approval');
    } else {
      items.push({ dept: 'career', msg: 'Career Intelligence standing by. Job search scheduled.', icon: '💼', priority: 'low' });
    }

    // ── FINANCE REPORT ───────────────────────────────
    var f = kpiAll.finance || {};
    var finDetail = 'Budget health: ' + (f.budgetHealth || 'review pending') + '.';
    if ((f.savingsRate || 0) > 0) finDetail += ' Savings rate: ' + f.savingsRate + '%.';
    if (f.emergencyFundMos > 0)   finDetail += ' Emergency fund: ' + f.emergencyFundMos + ' months covered.';
    items.push({ dept: 'finance', msg: finDetail, icon: '💰', priority: f.budgetHealth === 'at risk' ? 'high' : 'low' });

    // ── PRODUCTIVITY REPORT ──────────────────────────
    var p = kpiAll.productivity || {};
    if ((p.tasksCompleted || 0) > 0 || (p.focusHours || 0) > 0) {
      var prodDetail = '';
      if ((p.tasksCompleted || 0) > 0) prodDetail += (p.tasksCompleted || 0) + ' tasks completed.';
      if ((p.focusHours    || 0) > 0) prodDetail += ' ' + p.focusHours + 'h focus time logged.';
      if ((p.deadlinesMet  || 0) > 0) prodDetail += ' ' + p.deadlinesMet + ' deadlines met.';
      items.push({ dept: 'productivity', msg: prodDetail.trim() || 'Productivity department operational.', icon: '⏱', priority: 'low' });
    }

    // ── MISSION REPORT ───────────────────────────────
    if (missionCount.complete > 0 || missionCount.pending > 0) {
      var msnDetail = missionCount.pending + ' mission' + (missionCount.pending !== 1 ? 's' : '') + ' active';
      if (missionCount.complete > 0) msnDetail += ', ' + missionCount.complete + ' complete';
      if (pendingApps.length > 0) msnDetail += '. ' + pendingApps.length + ' awaiting CEO approval.';
      else msnDetail += '.';
      items.push({ dept: 'ops', msg: msnDetail, icon: '🎯', priority: pendingApps.length > 0 ? 'high' : 'normal' });
    }

    // ── OVERDUE ALERT ────────────────────────────────
    if (overdueList.length > 0) {
      var overdueNames = overdueList.slice(0, 3).map(function (r) { return r.title; });
      var overdueMsg = overdueNames.join(' · ');
      if (overdueList.length > 3) overdueMsg += ' + ' + (overdueList.length - 3) + ' more';
      items.push({ dept: 'ops', msg: 'Overdue: ' + overdueMsg + '.', icon: '⚠', priority: 'high' });
    }

    if (items.length === 0) {
      items.push({ dept: 'ops', msg: 'All departments operational. Company ready for CEO direction.', icon: '✓', priority: 'low' });
    }

    // ── EXECUTIVE INSIGHTS ───────────────────────────
    var totalScans = (k.scansCompleted || 0);
    if (totalScans >= 3) {
      insights.push({ type: 'security', msg: 'Security posture is active — ' + totalScans + ' scans run. Athena has consistent coverage.' });
    }
    if ((c.jobsFound || 0) >= 5) {
      insights.push({ type: 'career', msg: 'Job pipeline is healthy with ' + c.jobsFound + ' opportunities. Career Intelligence performing well.' });
    }
    if (pendingApps.length === 0 && missionCount.complete > 2) {
      insights.push({ type: 'ops', msg: 'Approval queue is clear. Company is executing efficiently.' });
    }
    if (typeof AUTO !== 'undefined' && AUTO.learning) {
      var aiInsights = AUTO.learning.getInsights();
      aiInsights.forEach(function (i) { insights.push(i); });
    }

    // ── CEO FOCUS RECOMMENDATION ─────────────────────
    var focus = focusItems.length > 0
      ? focusItems[0]
      : (pendingApps.length > 0
          ? pendingApps.length + ' decision' + (pendingApps.length !== 1 ? 's' : '') + ' waiting in the approval queue'
          : 'All clear — ' + (okRoutines.length) + ' routines on schedule');

    var briefing = {
      greeting:      greeting + ', Zee.',
      date:          dayName + ' · ' + dateStr,
      generated:     Date.now(),
      phase:         typeof AUTO !== 'undefined' ? AUTO.phaseLabel() : 'OPERATIONS',
      health:        health.health,
      items:         items,
      insights:      insights,
      focus:         focus,
      approvalCount: pendingApps.length,
      approvals:     pendingApps.slice(0, 4),
      routinesOk:    okRoutines.length,
      routinesOverdue: overdueList.length,
      missionsActive:  missionCount.pending,
      missionsComplete: missionCount.complete,
    };

    COS.state.set(BRIEFING_KEY, briefing);
    COS.events.emit('company:DailyBriefingReady', briefing);
    routines.markRun('ops_briefing');

    return briefing;
  }

  function getBriefing() {
    if (typeof COS === 'undefined') return null;
    return COS.state.get(BRIEFING_KEY);
  }

  // ── COMPANY HEALTH ────────────────────────────────────────────

  function checkHealth() {
    if (typeof COS === 'undefined') return { health: 'unknown', issues: [] };

    var health  = 'green';
    var issues  = [];

    var kpiSec = typeof KPI !== 'undefined' ? KPI.get('security') : {};
    if (kpiSec.criticalAlerts > 0) { health = 'red';    issues.push(kpiSec.criticalAlerts + ' critical security alerts'); }

    var pendingCount = approvals.pending().length;
    if (pendingCount >= 5) { if (health === 'green') health = 'yellow'; issues.push(pendingCount + ' decisions awaiting CEO approval'); }

    var routineStatus = routines.getStatus();
    var overdueCount  = routineStatus.filter(function (r) { return r.overdue; }).length;
    if (overdueCount >= 3) { if (health === 'green') health = 'yellow'; issues.push(overdueCount + ' routine tasks overdue'); }

    var h = { health: health, issues: issues, ts: Date.now() };
    COS.events.emit('company:CompanyHealthChanged', h);
    return h;
  }

  // ── EVENT WIRING ──────────────────────────────────────────────

  function _wireEvents() {
    if (typeof COS === 'undefined') return;

    // Job found → start career collaboration chain
    COS.events.on('company:JobFound', function (data) {
      if (!data || !data.job || typeof MS === 'undefined') return;
      var mission = MS.create({
        title:        'Career: ' + data.job.title + ' at ' + data.job.company,
        dept:         'housing',
        owner:        'Nova',
        participants: ['Nova', 'Resu-Mate', 'Penny', 'Scout-X', 'Orion'],
        priority:     (data.job.salary || 0) > 55000 ? 'high' : 'normal',
        note:         'Auto-triggered by Nova job discovery',
        data:         { job: data.job },
      });
      if (typeof KPI !== 'undefined') KPI.increment('ops', 'missionsCreated');
      runCareerCollabChain(mission.id, data.job);
    });

    // Threat detected → KPI + critical alert approval
    COS.events.on('company:ThreatDetected', function (data) {
      if (typeof KPI !== 'undefined') {
        KPI.increment('security', 'threatsDetected');
        if (data && data.severity === 'critical') {
          KPI.increment('security', 'criticalAlerts');
          approvals.add({
            title:           'Critical Security Threat — Immediate Response Required',
            dept:            'security',
            action:          'respond_to_threat',
            summary:         data.msg || 'Critical threat detected by Athena.',
            impact:          'A critical security threat requires immediate CEO authorization to respond.',
            recommendations: ['Athena: ' + (data.msg || 'Immediate response recommended')],
            data:            data,
          });
        }
      }
    });

    // Activity events → KPI increments + routine tracking
    COS.events.on('cos:activity', function (e) {
      if (!e) return;
      if (e.agent === 'Athena' && e.msg && e.msg.indexOf('Scan complete') !== -1) {
        if (typeof KPI !== 'undefined') KPI.increment('security', 'scansCompleted');
        routines.markRun('security_overnight');
        routines.markRun('security_morning');
      }
      if (e.agent === 'Nova' && e.source === 'search') {
        if (typeof KPI !== 'undefined') KPI.increment('career', 'jobsFound');
        routines.markRun('career_morning');
      }
      if (e.agent === 'Pixel' || e.agent === 'Spark') {
        if (typeof KPI !== 'undefined') KPI.increment('commerce', 'trends');
        routines.markRun('commerce_trends');
      }
      if ((e.agent === 'Penny' || e.agent === 'Greenbean') && e.source !== 'collab') {
        routines.markRun('finance_reconcile');
      }
      if (e.agent === 'Calypso') {
        routines.markRun('productivity_plan');
      }
    });

    // KPI changes → refresh health
    COS.events.on('kpi:updated', function () {
      checkHealth();
    });
  }

  // ── INIT ──────────────────────────────────────────────────────

  function init() {
    _wireEvents();
    buildBriefing();
    checkHealth();
    setInterval(checkHealth, 120000);
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (typeof COS !== 'undefined') init();
  });

  // ── PUBLIC API ────────────────────────────────────────────────

  global.ORION = {
    approvals:        approvals,
    routines:         routines,
    buildBriefing:    buildBriefing,
    getBriefing:      getBriefing,
    checkHealth:      checkHealth,
    runCareerCollab:  runCareerCollabChain,
    version:          '1.0.0',
  };

})(window);
