/* CyberCookieOS — Security Workspace
   Threat / Event Log with severity filter, manual notes, mark reviewed, edit */

(function () {
  'use strict';

  var STORE = 'ws.security.threats';

  var DEFAULTS = [
    { id: 'th1', event: 'Suspicious IP detected — 203.45.12.8 flagged during scan', severity: 'high',   source: 'Athena / IPv6 Scan',     status: 'new',      ts: Date.now() - 7200000 },
    { id: 'th2', event: 'Failed login attempt — 5 attempts in 60 seconds',           severity: 'medium', source: 'Nimbus / Auth Monitor',   status: 'reviewed', ts: Date.now() - 3600000 },
    { id: 'th3', event: 'Cloud service health check failed — us-east-1',             severity: 'low',    source: 'Nimbus / Cloud Monitor',  status: 'reviewed', ts: Date.now() - 1800000 },
    { id: 'th4', event: 'Unusual outbound traffic spike — 480 MB in 2 minutes',      severity: 'high',   source: 'Athena / Traffic Watch',  status: 'new',      ts: Date.now() - 900000  },
    { id: 'th5', event: 'SOC sweep completed — no active incidents',                  severity: 'info',   source: 'Sentinel / SOC Ops',     status: 'reviewed', ts: Date.now() - 300000  },
  ];

  var _filter    = 'all';
  var _editingId = null;

  function load()      { return COS.state.get(STORE) || DEFAULTS.map(function (t) { return Object.assign({}, t); }); }
  function save(list)  { COS.state.set(STORE, list); }

  function fmtTime(ts) {
    return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render() {
    var list     = load();
    var filtered = _filter === 'all' ? list : list.filter(function (t) { return t.severity === _filter; });
    var tbody    = document.getElementById('hq-threatBody');
    if (!tbody) return;

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="ws-empty">No entries match this filter.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    filtered.forEach(function (t) {
      var tr = document.createElement('tr');
      var reviewBtn = t.status !== 'reviewed'
        ? '<button class="ws-btn ws-btn-sm ws-btn-success" data-action="review" data-id="' + t.id + '" title="Mark Reviewed">✓</button>'
        : '';
      tr.innerHTML =
        '<td style="white-space:nowrap;font-size:7px;color:rgba(200,160,255,.3)">' + fmtTime(t.ts) + '</td>' +
        '<td style="max-width:240px">' + esc(t.event) + '</td>' +
        '<td><span class="ws-sev ws-sev-' + t.severity + '">' + t.severity.toUpperCase() + '</span></td>' +
        '<td style="font-size:7px;color:rgba(200,160,255,.4)">' + esc(t.source) + '</td>' +
        '<td><span class="ws-badge ws-badge-' + t.status + '">' + t.status.toUpperCase() + '</span></td>' +
        '<td><div style="display:flex;gap:4px">' + reviewBtn +
          '<button class="ws-btn ws-btn-sm ws-btn-ghost" data-action="edit" data-id="' + t.id + '" title="Edit">✏</button>' +
          '<button class="ws-btn ws-btn-sm ws-btn-danger" data-action="delete" data-id="' + t.id + '" title="Delete">✕</button>' +
        '</div></td>';
      tbody.appendChild(tr);
    });
  }

  function wireFilters() {
    document.querySelectorAll('#hq-workspace .ws-filter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#hq-workspace .ws-filter').forEach(function (b) { b.classList.remove('ws-filterActive'); });
        this.classList.add('ws-filterActive');
        _filter = this.dataset.sev;
        render();
      });
    });
  }

  function populateForm(item) {
    setValue('hq-noteEvent',  item.event    || '');
    setValue('hq-noteSev',    item.severity || 'medium');
    setValue('hq-noteSource', item.source   || '');
    var btn = document.getElementById('hq-addNote');
    if (btn) btn.textContent = '✓ UPDATE ENTRY';
    document.getElementById('hq-formPanel').scrollIntoView({ behavior: 'smooth' });
  }

  function clearForm() {
    setValue('hq-noteEvent', '');
    setValue('hq-noteSource', '');
    setValue('hq-noteSev', 'medium');
    _editingId = null;
    var btn = document.getElementById('hq-addNote');
    if (btn) btn.textContent = '+ ADD ENTRY';
  }

  function wireAddForm() {
    var addBtn = document.getElementById('hq-addNote');
    if (!addBtn) return;
    addBtn.addEventListener('click', function () {
      var eventEl   = document.getElementById('hq-noteEvent');
      var sevEl     = document.getElementById('hq-noteSev');
      var sourceEl  = document.getElementById('hq-noteSource');
      var eventText = (eventEl.value || '').trim();
      if (!eventText) {
        eventEl.focus();
        eventEl.classList.add('ws-input-error');
        setTimeout(function () { eventEl.classList.remove('ws-input-error'); }, 1000);
        return;
      }

      var list = load();

      if (_editingId) {
        var entry = list.find(function (t) { return t.id === _editingId; });
        if (entry) {
          entry.event    = eventText;
          entry.severity = sevEl.value;
          entry.source   = (sourceEl.value || '').trim() || 'Manual Entry';
          save(list);
          COS.activity.log({ agent: 'Sentinel', dept: 'security', msg: 'Security entry updated: ' + eventText.slice(0, 60), source: 'user' });
        }
      } else {
        var newEntry = {
          id:       'th' + Date.now(),
          event:    eventText,
          severity: sevEl.value,
          source:   (sourceEl.value || '').trim() || 'Manual Entry',
          status:   'new',
          ts:       Date.now(),
        };
        list.unshift(newEntry);
        save(list);
        COS.activity.log({ agent: 'Sentinel', dept: 'security', msg: 'Security note added: ' + eventText.slice(0, 60), source: 'user' });
        COS.notifications.add('New security note: ' + eventText.slice(0, 50), 'normal');
      }

      clearForm();
      render();
    });

    var cancelBtn = document.getElementById('hq-cancelEdit');
    if (cancelBtn) cancelBtn.addEventListener('click', clearForm);
  }

  function wireTable() {
    var tbody = document.getElementById('hq-threatBody');
    if (!tbody) return;
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var id     = btn.dataset.id;
      var action = btn.dataset.action;
      var list   = load();

      if (action === 'review') {
        var entry = list.find(function (t) { return t.id === id; });
        if (entry) {
          entry.status = 'reviewed';
          save(list);
          COS.activity.log({ agent: 'Sentinel', dept: 'security', msg: 'Threat marked reviewed: ' + entry.event.slice(0, 50), source: 'user' });
          render();
        }
      } else if (action === 'edit') {
        var item = list.find(function (t) { return t.id === id; });
        if (item) {
          _editingId = id;
          populateForm(item);
        }
      } else if (action === 'delete') {
        list = list.filter(function (t) { return t.id !== id; });
        save(list);
        COS.activity.log({ agent: 'Sentinel', dept: 'security', msg: 'Security entry deleted.', source: 'user' });
        render();
      }
    });
  }

  function setValue(id, val) { var el = document.getElementById(id); if (el) el.value = val; }

  document.addEventListener('DOMContentLoaded', function () {
    render();
    wireFilters();
    wireAddForm();
    wireTable();
  });

})();

/* ================================================================
   THREAT HUNTER — IP SCAN CONSOLE
================================================================ */
(function () {
  'use strict';

  var SCAN_STORE = 'hq.scan.history';
  var _scanning  = false;

  var THREAT_PROFILES = {
    low:      { label:'LOW',      color:'#2ecc71', score:'12/100', glyph:'✓' },
    medium:   { label:'MEDIUM',   color:'#ffdc32', score:'45/100', glyph:'⚡' },
    high:     { label:'HIGH',     color:'#ff8c42', score:'68/100', glyph:'⚠' },
    critical: { label:'CRITICAL', color:'#ff5050', score:'91/100', glyph:'🚨' },
    clean:    { label:'CLEAN',    color:'#2ecc71', score:'3/100',  glyph:'✓' },
  };

  var SCAN_STEPS = [
    'Initializing scanner…',
    'Resolving hostname…',
    'Checking geolocation…',
    'Port enumeration…',
    'Running threat signature match…',
    'Cross-referencing threat feeds…',
    'Checking blacklist databases…',
    'Analyzing traffic patterns…',
    'Generating threat score…',
    'Compiling report…',
  ];

  var KNOWN_THREATS = {
    '203.45.12.8':  'critical',
    '192.168.1.1':  'clean',
    '10.0.0.1':     'clean',
    '185.220.101.':  'high',
    '45.33.':        'medium',
  };

  function detectThreatLevel(ip) {
    for (var prefix in KNOWN_THREATS) {
      if (ip.startsWith(prefix)) return KNOWN_THREATS[prefix];
    }
    var levels = ['clean','low','low','low','medium','medium','high','critical'];
    var sum    = ip.split('').reduce(function (s, c) { return s + c.charCodeAt(0); }, 0);
    return levels[sum % levels.length];
  }

  function validateIP(ip) {
    return /^[\d\.a-fA-F:]+$/.test(ip.trim()) && ip.trim().length >= 7;
  }

  function saveScan(scan)  {
    var hist = COS.state.get(SCAN_STORE) || [];
    hist.unshift(scan);
    if (hist.length > 20) hist.pop();
    COS.state.set(SCAN_STORE, hist);
  }

  function renderHistory() {
    var histEl = document.getElementById('hq-scanHistory');
    if (!histEl) return;
    var hist = COS.state.get(SCAN_STORE) || [];
    if (!hist.length) { histEl.innerHTML = '<div style="font-size:8px;color:rgba(200,160,255,.2);font-style:italic">No scans yet — enter an IP above and run a scan.</div>'; return; }
    histEl.innerHTML = hist.slice(0, 8).map(function (s) {
      var p = THREAT_PROFILES[s.level] || THREAT_PROFILES.clean;
      var d = new Date(s.ts);
      var ts = d.getHours() + ':' + String(d.getMinutes()).padStart(2,'0');
      return '<div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid rgba(150,80,255,.06);font-size:8px">' +
        '<span style="color:rgba(200,160,255,.3);min-width:40px">' + ts + '</span>' +
        '<span style="color:rgba(220,190,255,.7);flex:1;font-family:monospace">' + s.ip + '</span>' +
        '<span style="color:rgba(200,160,255,.4)">' + s.type + '</span>' +
        '<span style="color:' + p.color + ';font-weight:700;min-width:60px;text-align:right">' + p.glyph + ' ' + p.label + '</span>' +
        '</div>';
    }).join('');
  }

  function runScan() {
    if (_scanning) return;
    var ip  = (document.getElementById('hq-scanIP').value || '').trim();
    if (!ip) { alert('Enter an IP address to scan.'); return; }
    if (!validateIP(ip)) { alert('Invalid IP address format.'); return; }

    _scanning = true;
    var scanType = document.getElementById('hq-scanType').value;
    var level    = detectThreatLevel(ip);
    var profile  = THREAT_PROFILES[level] || THREAT_PROFILES.clean;

    // Show progress
    var progEl   = document.getElementById('hq-scanProgress');
    var resultEl = document.getElementById('hq-scanResult');
    var barEl    = document.getElementById('hq-scanBar');
    var stepEl   = document.getElementById('hq-scanStep');
    var pctEl    = document.getElementById('hq-scanPct');
    var btn      = document.getElementById('hq-runScan');
    if (progEl)   progEl.style.display = '';
    if (resultEl) resultEl.style.display = 'none';
    if (btn)      btn.disabled = true;

    var stepCount = SCAN_STEPS.length;
    var current   = 0;
    var baseDur   = scanType === 'deep' ? 600 : scanType === 'stealth' ? 800 : 350;

    function tick() {
      if (current >= stepCount) {
        finalize(ip, scanType, level, profile);
        return;
      }
      var p = Math.round((current / stepCount) * 100);
      if (stepEl)  stepEl.textContent  = SCAN_STEPS[current];
      if (pctEl)   pctEl.textContent   = p + '%';
      if (barEl)   barEl.style.width   = p + '%';
      current++;
      setTimeout(tick, baseDur + Math.random() * 200);
    }
    tick();
  }

  function finalize(ip, scanType, level, profile) {
    var barEl    = document.getElementById('hq-scanBar');
    var pctEl    = document.getElementById('hq-scanPct');
    var stepEl   = document.getElementById('hq-scanStep');
    var resultEl = document.getElementById('hq-scanResult');
    var outputEl = document.getElementById('hq-scanOutput');
    var btn      = document.getElementById('hq-runScan');

    if (barEl)  barEl.style.width  = '100%';
    if (pctEl)  pctEl.textContent  = '100%';
    if (stepEl) stepEl.textContent = 'Scan complete.';

    var openPorts = profile.label === 'CLEAN' ? '22, 80, 443' : profile.label === 'LOW' ? '22, 80, 443, 8080' : '22, 80, 443, 3389, 8443, 1337';
    var geo       = ['United States','Russia','China','Germany','Netherlands','Brazil'][Math.floor(Math.random()*6)];

    var scan = { ip: ip, type: scanType, level: level, ts: Date.now() };
    saveScan(scan);

    if (outputEl) {
      outputEl.innerHTML =
        '<div style="background:rgba(255,255,255,.02);border:1px solid ' + profile.color + '33;border-radius:5px;padding:12px">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
            '<span style="font-size:18px;line-height:1">' + profile.glyph + '</span>' +
            '<div>' +
              '<div style="font-size:14px;font-weight:900;color:' + profile.color + ';text-shadow:0 0 10px ' + profile.color + '">' + profile.label + ' THREAT</div>' +
              '<div style="font-size:8px;color:rgba(200,160,255,.4)">Score: ' + profile.score + ' · ' + ip + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:7px;color:rgba(200,160,255,.5)">' +
            '<div><span style="color:rgba(200,160,255,.3)">SCAN TYPE:</span> ' + scanType.toUpperCase() + '</div>' +
            '<div><span style="color:rgba(200,160,255,.3)">GEOLOCATION:</span> ' + geo + '</div>' +
            '<div><span style="color:rgba(200,160,255,.3)">OPEN PORTS:</span> ' + openPorts + '</div>' +
            '<div><span style="color:rgba(200,160,255,.3)">AGENT:</span> Athena v2.4</div>' +
          '</div>' +
        '</div>';
    }

    if (resultEl) resultEl.style.display = '';

    // Log to threat board + activity
    if (typeof COS !== 'undefined') {
      COS.activity.log({ agent: 'Athena', dept: 'security', msg: 'Scan complete — ' + ip + ' [' + profile.label + '] — ' + profile.score, source: 'scan' });
      // Publish company event so Orion can track security KPI and escalate criticals
      COS.company.emit('ThreatDetected', {
        ip:       ip,
        level:    level,
        severity: level === 'critical' ? 'critical' : (level === 'high' ? 'high' : 'normal'),
        msg:      'IP ' + ip + ' classified ' + profile.label + ' (' + profile.score + ')',
        scanType: scanType,
      });
    }
    if (typeof OE !== 'undefined') {
      OE.generate({ type: 'analyze_traffic', title: 'IP Scan: ' + ip }, 'athena', 'security');
    }

    renderHistory();
    setTimeout(function () { _scanning = false; if (btn) btn.disabled = false; }, 500);
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderHistory();
    var btn = document.getElementById('hq-runScan');
    if (btn) btn.addEventListener('click', runScan);
    var inp = document.getElementById('hq-scanIP');
    if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') runScan(); });
  });

})();

/* SOC integration — updates case board + sends notifications + adds scan log */
(function () {
  'use strict';

  // Wait for DOM, then hook into the existing runScan / finalize flow
  // We patch by listening to the cos:activity event Athena emits on scan complete
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof COS === 'undefined') return;

    COS.events.on('cos:activity', function (e) {
      if (!e || e.agent !== 'Athena' || !e.msg) return;
      if (e.msg.indexOf('Scan complete') === -1) return;

      // Notification toast
      if (typeof COS !== 'undefined') {
        COS.notifications.add('Security scan complete: ' + e.msg.slice(0, 70), 'high');
      }

      // Send to Report Center (OE)
      if (typeof OE !== 'undefined') {
        OE.generate(
          { type: 'security_report', title: 'Threat Hunter Scan: ' + e.msg.slice(0, 50) },
          'athena',
          'security'
        );
      }

      // Update SOCLive if available
      if (typeof window.SOCLive !== 'undefined') {
        setTimeout(function () {
          window.SOCLive.updateCaseBoard();
          window.SOCLive.updateLastScan();
          window.SOCLive.updateReportsToday();
        }, 600);
      }
    });
  });
})();
