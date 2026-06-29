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
    var greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    var kpiAll         = typeof KPI !== 'undefined' ? KPI.all() : {};
    var pendingApps    = approvals.pending();
    var routineStatus  = routines.getStatus();
    var overdueList    = routineStatus.filter(function (r) { return r.overdue; });
    var missionCount   = typeof MS !== 'undefined' ? MS.count() : { complete: 0, pending: 0 };

    var items = [];

    if (kpiAll.security) {
      var k = kpiAll.security;
      var secMsg = 'Security: ' + (k.scansCompleted || 0) + ' scan(s) completed.';
      if (k.threatsDetected > 0) secMsg += ' ' + k.threatsDetected + ' threats detected.';
      else if (k.scansCompleted > 0) secMsg += ' No threats found.';
      items.push({ dept: 'security', msg: secMsg, icon: '🛡' });
    }
    if (kpiAll.career && kpiAll.career.jobsFound > 0) {
      var c    = kpiAll.career;
      var carMsg = 'Career: ' + c.jobsFound + ' new job' + (c.jobsFound !== 1 ? 's' : '') + ' found.';
      if (c.applications > 0) carMsg += ' ' + c.applications + ' applications prepared.';
      if (c.avgAtsScore  > 0) carMsg += ' Best ATS score: ' + c.avgAtsScore + '%.';
      items.push({ dept: 'career', msg: carMsg, icon: '💼' });
    }
    if (kpiAll.commerce && kpiAll.commerce.trends > 0) {
      items.push({ dept: 'commerce', msg: 'Commerce: ' + kpiAll.commerce.trends + ' trend opportunities identified.', icon: '🛍' });
    }
    if (kpiAll.finance) {
      var f    = kpiAll.finance;
      var finMsg = 'Finance: budget health ' + (f.budgetHealth || 'not yet evaluated') + '.';
      items.push({ dept: 'finance', msg: finMsg, icon: '💰' });
    }
    if (missionCount.complete > 0) {
      items.push({ dept: 'ops', msg: 'Missions: ' + missionCount.complete + ' completed, ' + missionCount.pending + ' active.', icon: '🎯' });
    }
    if (overdueList.length > 0) {
      items.push({ dept: 'ops', msg: 'Overdue routines: ' + overdueList.map(function (r) { return r.title; }).join(', ') + '.', icon: '⚠' });
    }
    if (items.length === 0) {
      items.push({ dept: 'ops', msg: 'All departments operational. Standing by.', icon: '✓' });
    }

    var briefing = {
      greeting:      greeting + ', Zee.',
      generated:     Date.now(),
      items:         items,
      approvalCount: pendingApps.length,
      approvals:     pendingApps.slice(0, 4),
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
