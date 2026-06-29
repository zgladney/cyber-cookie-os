/* ================================================================
   CyberCookieOS — Company Operational Memory v1.0
   Each department maintains its own persistent memory.
   Memory improves recommendations over time.
   Depends on: cybercookieos.js (COS)
================================================================ */
(function (global) {
  'use strict';

  var MEM_LIMIT = 500;

  function deptStore(deptKey) {
    var prefix = 'mem.' + deptKey + '.';
    return {
      add: function (type, entry) {
        if (typeof COS === 'undefined') return;
        var key  = prefix + type;
        var list = COS.state.get(key) || [];
        entry.ts = Date.now();
        list.unshift(entry);
        if (list.length > MEM_LIMIT) list = list.slice(0, MEM_LIMIT);
        COS.state.set(key, list);
      },
      get: function (type, limit) {
        if (typeof COS === 'undefined') return [];
        var list = COS.state.get(prefix + type) || [];
        return limit ? list.slice(0, limit) : list;
      },
      last: function (type) {
        if (typeof COS === 'undefined') return null;
        var list = COS.state.get(prefix + type) || [];
        return list[0] || null;
      },
      count: function (type) {
        if (typeof COS === 'undefined') return 0;
        return (COS.state.get(prefix + type) || []).length;
      },
      clear: function (type) {
        if (typeof COS === 'undefined') return;
        COS.state.set(prefix + type, []);
      },
    };
  }

  /*  Usage examples:
      MEM.security.add('threats', { ip: '10.0.0.1', severity: 'high', type: 'port_scan' });
      MEM.career.add('applications', { company: 'Lockheed', title: 'SOC Analyst', status: 'applied' });
      MEM.finance.add('budgets', { month: '2026-06', category: 'housing', budget: 1500, actual: 1420 });
      MEM.ops.add('approvals', { action: 'submit_application', decision: 'approved', decidedAt: Date.now() });
  */
  var MEM = {
    security:     deptStore('security'),
    career:       deptStore('career'),
    commerce:     deptStore('commerce'),
    finance:      deptStore('finance'),
    productivity: deptStore('productivity'),
    ops:          deptStore('ops'),
  };

  global.MEM = MEM;

})(window);
