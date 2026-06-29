/* ================================================================
   CyberCookieOS — Company KPI Engine v1.0
   Departments publish performance metrics. Mission Control reads them.
   Depends on: cybercookieos.js (COS)
================================================================ */
(function (global) {
  'use strict';

  var DEFAULTS = {
    security:     { scansCompleted: 0, threatsDetected: 0, criticalAlerts: 0, avgResponseMs: 0, lastScan: null },
    career:       { jobsFound: 0, applications: 0, interviews: 0, offers: 0, avgAtsScore: 0, savedJobs: 0 },
    commerce:     { productsCreated: 0, revenue: 0, trends: 0, conversionPct: 0 },
    finance:      { savingsRate: 0, budgetHealth: 'unknown', cashFlow: 0, emergencyFundMos: 0 },
    productivity: { tasksCompleted: 0, focusHours: 0, deadlinesMet: 0, missedDeadlines: 0 },
    ops:          { missionsCreated: 0, missionsCompleted: 0, approvalsQueued: 0, approvalsGranted: 0, approvalsRejected: 0 },
  };

  function _key(dept) { return 'kpi.' + dept; }

  var KPI = {

    update: function (dept, metrics) {
      if (typeof COS === 'undefined') return;
      var current = COS.state.get(_key(dept)) || Object.assign({}, DEFAULTS[dept] || {});
      var keys = Object.keys(metrics);
      for (var i = 0; i < keys.length; i++) { current[keys[i]] = metrics[keys[i]]; }
      current._updated = Date.now();
      COS.state.set(_key(dept), current);
      COS.events.emit('kpi:updated', { dept: dept, metrics: current });
    },

    increment: function (dept, key, amount) {
      if (typeof COS === 'undefined') return;
      var current = COS.state.get(_key(dept)) || Object.assign({}, DEFAULTS[dept] || {});
      current[key] = (current[key] || 0) + (amount || 1);
      current._updated = Date.now();
      COS.state.set(_key(dept), current);
      COS.events.emit('kpi:updated', { dept: dept, metrics: current });
    },

    get: function (dept) {
      if (typeof COS === 'undefined') return Object.assign({}, DEFAULTS[dept] || {});
      return COS.state.get(_key(dept)) || Object.assign({}, DEFAULTS[dept] || {});
    },

    all: function () {
      var result = {};
      var depts  = Object.keys(DEFAULTS);
      for (var i = 0; i < depts.length; i++) { result[depts[i]] = KPI.get(depts[i]); }
      return result;
    },

    reset: function (dept) {
      if (typeof COS === 'undefined') return;
      COS.state.set(_key(dept), Object.assign({}, DEFAULTS[dept] || {}));
      COS.events.emit('kpi:updated', { dept: dept, metrics: KPI.get(dept) });
    },

    resetAll: function () {
      var depts = Object.keys(DEFAULTS);
      for (var i = 0; i < depts.length; i++) { KPI.reset(depts[i]); }
    },

    DEPTS: Object.keys(DEFAULTS),
  };

  global.KPI = KPI;

})(window);
