/* CyberCookieOS — SOC Live Monitor
   Simulates real-time security events for Nimbus log feed + case board */
(function () {
  'use strict';

  var LOG_TEMPLATES = [
    { msg: 'FW: BLOCKED 185.220.{r}.{r} port 22', cls: 'soc-log-warn' },
    { msg: 'AUTH: Failed login admin@10.0.0.{r} (attempt {r}/{r})', cls: 'soc-log-warn' },
    { msg: 'IDS: Port scan detected from 45.33.{r}.{r}', cls: 'soc-log-crit' },
    { msg: 'FW: ALLOW outbound 10.0.{r}.{r}:443 → cdn.cdn', cls: 'soc-log-fw' },
    { msg: 'FW: ALLOW inbound 0.0.0.0:80 → srv-01', cls: 'soc-log-fw' },
    { msg: 'NET: VPN heartbeat OK (tunnel #3)', cls: '' },
    { msg: 'IDS: Anomaly score 0.{r} on 203.45.{r}.{r}', cls: 'soc-log-warn' },
    { msg: 'AUTH: SSH key auth OK — nimbus@10.0.0.2', cls: 'soc-log-fw' },
    { msg: 'FW: BLOCKED TOR exit node 162.{r}.{r}.{r}', cls: 'soc-log-warn' },
    { msg: 'NET: Packet loss 0.{r}% on eth0', cls: '' },
    { msg: 'IDS: RULE#4422 triggered — SYN flood attempt', cls: 'soc-log-crit' },
    { msg: 'FW: GEO-BLOCK CN → 8.{r}.{r}.{r} port 443', cls: 'soc-log-warn' },
    { msg: 'AUTH: 2FA verified for user sentinel', cls: 'soc-log-fw' },
    { msg: 'NET: BGP update from peer 10.0.0.1', cls: '' },
    { msg: 'IDS: DNS query to blocked domain 185.{r}.{r}.{r}', cls: 'soc-log-warn' },
  ];

  var _blocked = 1284;
  var _tph     = 47;
  var _ts      = function () {
    var d = new Date();
    return String(d.getHours()).padStart(2,'0') + ':' +
           String(d.getMinutes()).padStart(2,'0') + ':' +
           String(d.getSeconds()).padStart(2,'0');
  };
  var _r = function () { return Math.floor(Math.random() * 255); };
  var _rand = function (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };

  function buildLogLine(tpl) {
    return tpl.msg
      .replace(/\{r\}/g, function () { return _r(); })
      .replace(/attempt (\d+)\/(\d+)/, function () { return 'attempt ' + _rand(1,6) + '/10'; });
  }

  function pushLog(msg, cls) {
    var feed = document.getElementById('soc-logFeed');
    if (!feed) return;
    var line = document.createElement('div');
    line.className = 'soc-log-entry' + (cls ? ' ' + cls : '');
    line.textContent = _ts() + ' ' + msg;
    feed.insertBefore(line, feed.firstChild);
    // Keep max 30 entries
    while (feed.children.length > 30) feed.removeChild(feed.lastChild);
  }

  function tickLog() {
    var tpl = LOG_TEMPLATES[_rand(0, LOG_TEMPLATES.length - 1)];
    pushLog(buildLogLine(tpl), tpl.cls);
    // Occasionally trigger a block event
    if (Math.random() < 0.3) {
      _blocked++;
      var blkEl = document.getElementById('stn-blk');
      if (blkEl) blkEl.textContent = _blocked.toLocaleString();
    }
    if (Math.random() < 0.2) {
      _tph = _rand(35, 82);
      var tphEl = document.getElementById('stn-tph');
      if (tphEl) tphEl.textContent = _tph;
    }
  }

  function updateCaseBoard() {
    var hist = (typeof COS !== 'undefined') ? (COS.state.get('hq.scan.history') || []) : [];
    var scanEl = document.getElementById('soc-caseScans');
    if (!scanEl) return;

    if (!hist.length) { scanEl.innerHTML = '<div class="soc-caseEntry">— No scans yet</div>'; return; }

    var THREAT_COLORS = { clean:'soc-case-ok', low:'soc-case-ok', medium:'', high:'soc-case-high', critical:'soc-case-crit' };
    var GLYPHS = { clean:'✓', low:'✓', medium:'◆', high:'⚠', critical:'🚨' };

    scanEl.innerHTML = hist.slice(0, 6).map(function (s) {
      var cls = THREAT_COLORS[s.level] || '';
      var g   = GLYPHS[s.level] || '·';
      var d   = new Date(s.ts);
      var ts  = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
      return '<div class="soc-caseEntry ' + cls + '">' + g + ' ' + ts + ' ' + s.ip + ' — ' + (s.level || '?').toUpperCase() + '</div>';
    }).join('');

    // Update counts
    var threats   = hist.filter(function (s) { return s.level === 'high' || s.level === 'critical'; });
    var flagged   = hist.filter(function (s) { return s.level === 'medium'; });
    var cleared   = hist.filter(function (s) { return s.level === 'clean' || s.level === 'low'; });
    var setNum = function (id, n) { var el = document.getElementById(id); if (el) el.textContent = n; };
    setNum('soc-activeCount',  threats.length);
    setNum('soc-flaggedCount', flagged.length);
    setNum('soc-clearedCount', cleared.length);
  }

  function updateLastScan() {
    var hist = (typeof COS !== 'undefined') ? (COS.state.get('hq.scan.history') || []) : [];
    var el = document.getElementById('soc-lastScan');
    if (!el || !hist.length) return;
    var d = new Date(hist[0].ts);
    el.textContent = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  function updateReportsToday() {
    var el = document.getElementById('soc-reportsToday');
    if (el && typeof OE !== 'undefined' && typeof OE.getTodayCount === 'function') {
      el.textContent = OE.getTodayCount();
    }
  }

  function updateThreatLevelBadge(level) {
    var el = document.getElementById('soc-threatLevel');
    if (!el) return;
    var map = {
      clean:    { text: '● LOW',       cls: 'soc-ok' },
      low:      { text: '● LOW',       cls: 'soc-ok' },
      medium:   { text: '⚡ MEDIUM',   cls: 'soc-warn' },
      high:     { text: '⚠ HIGH',     cls: 'soc-warn' },
      critical: { text: '🚨 CRITICAL', cls: 'soc-crit' },
    };
    var info = map[level] || map.medium;
    el.textContent  = info.text;
    el.className    = info.cls;
  }

  // Expose for workspace.js to call after scan
  window.SOCLive = {
    pushLog:             pushLog,
    updateCaseBoard:     updateCaseBoard,
    updateLastScan:      updateLastScan,
    updateReportsToday:  updateReportsToday,
    updateThreatLevel:   updateThreatLevelBadge,
  };

  document.addEventListener('DOMContentLoaded', function () {
    // Initial seed logs
    for (var i = 0; i < 8; i++) {
      (function (delay) {
        setTimeout(function () {
          var tpl = LOG_TEMPLATES[_rand(0, LOG_TEMPLATES.length - 1)];
          pushLog(buildLogLine(tpl), tpl.cls);
        }, delay);
      })(i * 120);
    }

    // Live stream — new log every 3-5 seconds
    function scheduleNext() {
      setTimeout(function () { tickLog(); scheduleNext(); }, _rand(3000, 5500));
    }
    scheduleNext();

    // Update case board from saved data
    updateCaseBoard();
    updateLastScan();

    // Listen for scan completions
    if (typeof COS !== 'undefined') {
      COS.events.on('cos:activity', function (e) {
        if (e && e.agent === 'Athena' && e.msg && e.msg.indexOf('Scan complete') !== -1) {
          pushLog('SCAN: ' + e.msg, 'soc-log-scan');
          setTimeout(function () {
            updateCaseBoard();
            updateLastScan();
            updateReportsToday();
            // Sprite working animation
            var sp = document.getElementById('sprite-athena');
            if (sp) {
              sp.classList.add('stn-sprite-working');
              setTimeout(function () { sp.classList.remove('stn-sprite-working'); }, 3000);
            }
          }, 400);
        }
      });
    }

    // Pulse Nimbus sprite occasionally
    setInterval(function () {
      var sp = document.getElementById('sprite-nimbus');
      if (sp) {
        sp.classList.add('stn-sprite-working');
        setTimeout(function () { sp.classList.remove('stn-sprite-working'); }, 1200);
      }
    }, 8000);
  });
})();
