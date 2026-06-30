/* ================================================================
   orion_dashboard.js — Phase 21 ORION Executive Dashboard
   Boot sequence + Morning Brief + Approval Queue + Snapshot
   ES5: var only, no arrow functions, no const/let, no template literals
================================================================ */

/* ── Boot sequence messages ───────────────────────────────────── */

var BOOT_MESSAGES = [
  { text: 'Initializing system...', delay: 0 },
  { text: 'Loading employee roster... 18 agents', delay: 160 },
  { text: 'Reviewing overnight activity...', delay: 320 },
  { text: 'Checking security status... NOMINAL', delay: 480 },
  { text: 'Loading career intelligence...', delay: 620 },
  { text: 'Checking revenue and finance...', delay: 760 },
  { text: 'Connecting department systems...', delay: 900 },
  { text: 'Compiling executive brief...', delay: 1060 },
  { text: 'BOOT COMPLETE — ORION ONLINE', delay: 1220, done: true },
];

var DEPT_COLORS = {
  security:    '#9b6bff',
  finance:     '#2ecc71',
  career:      '#7b6bff',
  commerce:    '#ff69b4',
  productivity:'#3aa8c8',
  connections: '#9cf6ff',
};

var RISK_LABELS = {
  irreversible:'IRREVERSIBLE',
  financial:   'FINANCIAL',
  publishing:  'PUBLISHING',
  reversible:  'REVERSIBLE',
  read_only:   'READ-ONLY',
};

/* ── XHR helpers (ES5) ────────────────────────────────────────── */

function _get(url, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return;
    if (xhr.status === 200) {
      try { cb(null, JSON.parse(xhr.responseText)); } catch (e) { cb(e, null); }
    } else { cb(xhr.status, null); }
  };
  xhr.send();
}

function _post(url, data, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return;
    if (xhr.status === 200) {
      try { if (cb) cb(null, JSON.parse(xhr.responseText)); } catch (e) { if (cb) cb(e, null); }
    } else { if (cb) cb(xhr.status, null); }
  };
  xhr.send(JSON.stringify(data || {}));
}

/* ── Clock ────────────────────────────────────────────────────── */

function _tickClock() {
  var el = document.getElementById('orion-clock');
  if (!el) return;
  var now = new Date();
  var h = now.getHours();
  var m = now.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  el.textContent = h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
}

/* ── Boot sequence ────────────────────────────────────────────── */

function runBoot(onComplete) {
  var boot     = document.getElementById('orion-boot');
  var linesEl  = document.getElementById('ob-lines');
  var fillEl   = document.getElementById('ob-progress-fill');
  if (!boot || !linesEl) { onComplete(); return; }

  /* Create line elements */
  var lineEls = [];
  BOOT_MESSAGES.forEach(function (msg, i) {
    var div = document.createElement('div');
    div.className = 'ob-line';
    div.innerHTML = '<span class="ob-prefix">[SYS]</span> ' + msg.text;
    if (msg.done) div.className += ' ob-complete-final';
    linesEl.appendChild(div);
    lineEls.push(div);
  });

  /* Tick through messages */
  BOOT_MESSAGES.forEach(function (msg, i) {
    setTimeout(function () {
      /* Mark previous as done */
      if (i > 0) lineEls[i - 1].className = lineEls[i - 1].className.replace('ob-visible', 'ob-done');
      /* Show current */
      lineEls[i].className += ' ob-visible';
      if (msg.done) lineEls[i].className += ' ob-complete';
      /* Progress bar */
      if (fillEl) fillEl.style.width = Math.round((i + 1) / BOOT_MESSAGES.length * 100) + '%';
    }, msg.delay);
  });

  var totalTime = BOOT_MESSAGES[BOOT_MESSAGES.length - 1].delay + 500;
  setTimeout(function () {
    boot.className += ' ob-fade';
    setTimeout(function () {
      boot.style.display = 'none';
      onComplete();
    }, 650);
  }, totalTime);
}

/* ── Time-ago helper ──────────────────────────────────────────── */

function _timeAgo(isoStr) {
  if (!isoStr) return '';
  var d = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
  if (d < 1) return 'just now';
  if (d < 60) return d + 'm ago';
  if (d < 1440) return Math.floor(d / 60) + 'h ago';
  return Math.floor(d / 1440) + 'd ago';
}

/* ── Render department health cards ───────────────────────────── */

function renderDeptRow(deptHealth) {
  var row = document.getElementById('orion-dept-row');
  if (!row || !deptHealth) return;

  var deptOrder = ['security', 'finance', 'career', 'commerce', 'productivity', 'connections'];
  var html = '';

  deptOrder.forEach(function (key) {
    var d = deptHealth[key];
    if (!d) return;
    var color  = d.color || DEPT_COLORS[key] || '#9b6bff';
    var attn   = (d.needs_attention || []).slice(0, 1).join(', ');
    var status = (d.status || 'initializing').toLowerCase();

    html += '<a class="orion-dept-card" href="' + (d.link || '#') + '" data-status="' + status + '" style="border-top:2px solid ' + color + '">' +
      '<div class="orion-dept-header">' +
        '<span class="orion-dept-icon">' + (d.icon || '') + '</span>' +
        '<span class="orion-dept-health-pct">' + (d.health || 0) + '%</span>' +
      '</div>' +
      '<div class="orion-dept-label" style="color:' + color + '">' + (d.label || key.toUpperCase()) + '</div>' +
      '<div class="orion-dept-status">' + status.toUpperCase() + '</div>' +
      '<div class="orion-dept-summary">' + (d.summary || '') + '</div>' +
      (attn ? '<div class="orion-dept-attn">! ' + attn + '</div>' : '') +
    '</a>';
  });

  row.innerHTML = html;
}

/* ── Render pending decision cards ───────────────────────────── */

function renderDecisions(pending) {
  var el = document.getElementById('orion-decisions');
  if (!el) return;

  var badge = document.getElementById('orion-decisions-badge');
  if (badge) {
    badge.textContent = pending.length + ' PENDING';
    badge.className = 'orion-section-badge ' + (pending.length > 0 ? 'orion-badge-alert' : 'orion-badge-good');
  }

  if (!pending || !pending.length) {
    el.innerHTML = '<div class="orion-decisions-empty">No decisions required. All departments running autonomously.</div>';
    return;
  }

  var DEPT_COLOR_MAP = { security:'#9b6bff', career:'#7b6bff', housing:'#7b6bff', commerce:'#ff69b4', finance:'#2ecc71', productivity:'#3aa8c8', connections:'#9cf6ff' };

  el.innerHTML = pending.map(function (item) {
    var dept     = item.department || item.dept || 'system';
    var dCol     = DEPT_COLOR_MAP[dept] || '#9b6bff';
    var riskKey  = (item.risk || 'reversible').toLowerCase().replace(' ', '_');
    var isServer = (item.id || '').indexOf('ORION-') === 0;
    var ago      = _timeAgo(item.submitted_at || item.ts || '');
    var summary  = item.description || item.impact || item.summary || '';

    return '<div class="orion-decision-card" style="border-left-color:' + dCol + '" data-id="' + item.id + '" data-server="' + isServer + '">' +
      '<div class="orion-dc-header">' +
        '<span class="orion-dc-title">' + (item.title || '—') + '</span>' +
        '<span class="orion-dc-time">' + ago + '</span>' +
      '</div>' +
      '<div class="orion-dc-meta">' +
        '<span class="orion-dc-dept" style="color:' + dCol + '">' + dept.toUpperCase() + (item.agent ? ' \xb7 ' + item.agent.toUpperCase() : '') + '</span>' +
        '<span class="orion-dc-risk orion-dc-risk-' + riskKey + '">⚠ ' + (RISK_LABELS[riskKey] || riskKey.toUpperCase()) + '</span>' +
      '</div>' +
      (summary ? '<div class="orion-dc-summary">' + summary + '</div>' : '') +
      '<div class="orion-dc-actions">' +
        '<button class="orion-btn-approve" data-id="' + item.id + '" data-server="' + isServer + '">✓ APPROVE</button>' +
        '<button class="orion-btn-decline" data-id="' + item.id + '" data-server="' + isServer + '">✕ DECLINE</button>' +
        '<button class="orion-btn-review" data-id="' + item.id + '">▶ REVIEW</button>' +
      '</div>' +
    '</div>';
  }).join('');

  /* Wire buttons */
  el.querySelectorAll('.orion-btn-approve').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id       = this.getAttribute('data-id');
      var isServer = this.getAttribute('data-server') === 'true';
      if (isServer) {
        _post('/api/orion/approve', { id: id, notes: 'Approved via ORION Executive Dashboard.' }, function (err) {
          showOrionToast('Approved — action authorized.', '#2ecc71');
          loadMorningBrief();
        });
      } else if (window.ORION && ORION.approvals) {
        ORION.approvals.grant(id);
        showOrionToast('Approved.', '#2ecc71');
        loadMorningBrief();
      }
    });
  });

  el.querySelectorAll('.orion-btn-decline').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id       = this.getAttribute('data-id');
      var isServer = this.getAttribute('data-server') === 'true';
      if (isServer) {
        _post('/api/orion/decline', { id: id, notes: 'Declined via ORION Executive Dashboard.' }, function (err) {
          showOrionToast('Declined — action blocked.', '#ff4444');
          loadMorningBrief();
        });
      } else if (window.ORION && ORION.approvals) {
        ORION.approvals.reject(id, 'Declined at ORION.');
        showOrionToast('Declined.', '#ff4444');
        loadMorningBrief();
      }
    });
  });

  el.querySelectorAll('.orion-btn-review').forEach(function (btn) {
    btn.addEventListener('click', function () {
      window.location.href = '/ops_center/index.html';
    });
  });
}

/* ── Render recommendations ───────────────────────────────────── */

function renderRecs(recs) {
  var el = document.getElementById('orion-recs');
  if (!el) return;

  el.innerHTML = (recs || []).map(function (r) {
    return '<div class="orion-rec-card">' +
      '<div class="orion-rec-priority orion-rec-priority-' + (r.priority || 'low') + '"></div>' +
      '<div class="orion-rec-body">' +
        '<div class="orion-rec-text">' + r.text + '</div>' +
        '<div class="orion-rec-confidence">CONFIDENCE: ' + (r.confidence || 0) + '%</div>' +
      '</div>' +
    '</div>';
  }).join('') || '<div style="font-size:10px;color:rgba(180,150,255,.3);padding:8px 0">No recommendations.</div>';
}

/* ── Render snapshot metrics ──────────────────────────────────── */

function renderSnapshot(snapshot) {
  var el = document.getElementById('orion-snapshot');
  if (!el || !snapshot) return;

  var rev = snapshot.revenue_mtd ? '$' + parseFloat(snapshot.revenue_mtd).toFixed(2) : '$0';
  var approvalCls = snapshot.approvals_pending > 0 ? 'orion-metric-value-high' : 'orion-metric-value-good';
  var deptCls     = snapshot.departments_active > 0 ? 'orion-metric-value-accent' : 'orion-metric-value-neutral';

  el.innerHTML =
    _metric(snapshot.employees_online || 0, 'EMPLOYEES ONLINE', '') +
    _metric(snapshot.departments_active || 0, 'DEPTS ACTIVE', deptCls) +
    _metric(rev, 'REVENUE MTD', 'orion-metric-value-good') +
    _metric(snapshot.threats || 0, 'THREATS', snapshot.threats > 0 ? 'orion-metric-value-critical' : 'orion-metric-value-good') +
    _metric(snapshot.approvals_pending || 0, 'APPROVALS', approvalCls) +
    _metric(snapshot.accounts_connected + '/' + snapshot.accounts_total, 'ACCOUNTS', 'orion-metric-value-accent');
}

function _metric(val, label, cls) {
  return '<div class="orion-metric">' +
    '<div class="orion-metric-value ' + (cls || '') + '">' + val + '</div>' +
    '<div class="orion-metric-label">' + label + '</div>' +
  '</div>';
}

/* ── Render activity feed ─────────────────────────────────────── */

function renderActivity(entries) {
  var el = document.getElementById('orion-activity');
  if (!el) return;

  if (!entries || !entries.length) {
    el.innerHTML = '<div class="orion-activity-empty">No recent activity logged.</div>';
    return;
  }

  el.innerHTML = entries.map(function (e) {
    return '<div class="orion-activity-row">' +
      '<span class="orion-act-dot">●</span>' +
      '<span class="orion-act-agent">' + (e.agent || 'SYS') + '</span>' +
      '<span class="orion-act-action">' + (e.action || '') + '</span>' +
      '<span class="orion-act-time">' + _timeAgo(e.ts || '') + '</span>' +
    '</div>';
  }).join('');
}

/* ── Render overnight brief pills ─────────────────────────────── */

function renderOvernightPills(overnight) {
  var el = document.getElementById('orion-pills');
  if (!el || !overnight) return;

  var pills = [];

  if (overnight.tasks_completed > 0) {
    pills.push({ text: overnight.tasks_completed + ' TASKS COMPLETED', cls: 'orion-pill-good' });
  }
  if (overnight.decisions_pending > 0) {
    pills.push({ text: overnight.decisions_pending + ' DECISIONS PENDING', cls: 'orion-pill-high' });
  }
  if (overnight.threats_investigated > 0) {
    pills.push({ text: overnight.threats_investigated + ' THREATS INVESTIGATED', cls: overnight.threats_investigated > 0 ? 'orion-pill-medium' : 'orion-pill-good' });
  } else {
    pills.push({ text: '0 THREATS', cls: 'orion-pill-good' });
  }
  if (overnight.revenue_mtd > 0) {
    pills.push({ text: '$' + parseFloat(overnight.revenue_mtd).toFixed(2) + ' REVENUE MTD', cls: 'orion-pill-good' });
  }
  if (overnight.accounts_connected > 0) {
    pills.push({ text: overnight.accounts_connected + ' ACCOUNTS CONNECTED', cls: 'orion-pill-neutral' });
  }

  if (!pills.length) {
    pills.push({ text: 'ALL SYSTEMS NOMINAL', cls: 'orion-pill-good' });
  }

  el.innerHTML = pills.map(function (p) {
    return '<span class="orion-pill ' + p.cls + '">' + p.text + '</span>';
  }).join('');
}

/* ── Load morning brief from server ──────────────────────────── */

function loadMorningBrief() {
  _get('/api/orion/morning-brief', function (err, data) {
    if (err || !data) return;

    /* Greeting + date */
    var grEl = document.getElementById('orion-greeting');
    if (grEl) grEl.textContent = data.greeting || 'Good morning, Zee.';
    var dtEl = document.getElementById('orion-date');
    if (dtEl) dtEl.textContent = (data.date || '') + (data.time ? '  \xb7  ' + data.time : '');

    renderOvernightPills(data.overnight || {});
    renderDeptRow(data.dept_health || {});
    renderDecisions(data.pending_decisions || []);
    renderRecs(data.recommendations || []);
    renderSnapshot(data.snapshot || {});
    renderActivity(data.recent_activity || []);
  });
}

/* ── Toast ────────────────────────────────────────────────────── */

function showOrionToast(msg, color) {
  var el = document.getElementById('orion-toast');
  if (!el) return;
  el.textContent = msg;
  el.style.borderColor = color || 'rgba(156,246,255,.3)';
  el.style.color       = color || '#9cf6ff';
  el.className += ' orion-toast-show';
  setTimeout(function () {
    el.className = el.className.replace(' orion-toast-show', '');
  }, 3000);
}

/* ── Command Palette ──────────────────────────────────────────── */

var CMD_ITEMS = [
  { group: 'DEPARTMENTS', icon: '\u{1f6e1}', text: 'Security Ops',     url: '/hq/index.html' },
  { group: 'DEPARTMENTS', icon: '\u{1f4b0}', text: 'Finance',          url: '/finance/index.html' },
  { group: 'DEPARTMENTS', icon: '\u{1f4bc}', text: 'Career Intel',     url: '/housing/index.html' },
  { group: 'DEPARTMENTS', icon: '\u{1f6cd}', text: 'Commerce',         url: '/commerce/index.html' },
  { group: 'DEPARTMENTS', icon: '\u{1f4c5}', text: 'Productivity',     url: '/productivity/index.html' },
  { group: 'DEPARTMENTS', icon: '\u{1f517}', text: 'Connections',      url: '/connections/index.html' },
  { group: 'NAVIGATE',    icon: '\u{1f3e2}', text: 'Enter Headquarters', url: '/hallway/index.html' },
  { group: 'NAVIGATE',    icon: '\u{1f3af}', text: 'Operations Center', url: '/ops_center/index.html' },
  { group: 'NAVIGATE',    icon: '\u{1f4ca}', text: 'Reports',          url: '/reports/index.html' },
  { group: 'ACTIONS',     icon: '⚡',    text: 'View Approvals',   action: 'scroll_approvals' },
  { group: 'ACTIONS',     icon: '\u{1f504}', text: 'Refresh Brief',    action: 'refresh' },
];

var _cpActive = -1;

function openCmdPalette() {
  var el = document.getElementById('orion-cmd-palette');
  if (!el) return;
  el.className += ' ocp-open';
  var inp = document.getElementById('ocp-input');
  if (inp) { inp.value = ''; inp.focus(); }
  _cpActive = -1;
  renderCmdResults('');
}

function closeCmdPalette() {
  var el = document.getElementById('orion-cmd-palette');
  if (!el) return;
  el.className = el.className.replace(' ocp-open', '');
}

function renderCmdResults(query) {
  var el = document.getElementById('ocp-results');
  if (!el) return;
  var q = (query || '').toLowerCase();
  var filtered = q ? CMD_ITEMS.filter(function (x) { return x.text.toLowerCase().indexOf(q) >= 0; }) : CMD_ITEMS;

  /* Group */
  var groups = {};
  filtered.forEach(function (item) {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  });

  var html = '';
  Object.keys(groups).forEach(function (gname) {
    html += '<div class="ocp-group-label">' + gname + '</div>';
    groups[gname].forEach(function (item, i) {
      html += '<div class="ocp-item" data-url="' + (item.url || '') + '" data-action="' + (item.action || '') + '">' +
        '<span class="ocp-item-icon">' + item.icon + '</span>' +
        '<span class="ocp-item-text">' + item.text + '</span>' +
      '</div>';
    });
  });

  el.innerHTML = html || '<div style="padding:16px;font-size:11px;color:rgba(180,150,255,.3)">No results.</div>';
  _wireOcpItems();
}

function _wireOcpItems() {
  document.querySelectorAll('.ocp-item').forEach(function (item) {
    item.addEventListener('click', function () {
      _execCmdItem(this);
    });
  });
}

function _execCmdItem(el) {
  var url    = el.getAttribute('data-url');
  var action = el.getAttribute('data-action');
  closeCmdPalette();
  if (url) { window.location.href = url; return; }
  if (action === 'refresh') { loadMorningBrief(); showOrionToast('Brief refreshed.', '#9cf6ff'); }
  if (action === 'scroll_approvals') {
    var dec = document.getElementById('orion-decisions');
    if (dec) dec.scrollIntoView({ behavior: 'smooth' });
  }
}

/* ── Keyboard navigation ──────────────────────────────────────── */

document.addEventListener('keydown', function (e) {
  var palette = document.getElementById('orion-cmd-palette');
  var isOpen  = palette && palette.className.indexOf('ocp-open') >= 0;

  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    isOpen ? closeCmdPalette() : openCmdPalette();
    return;
  }

  if (isOpen && e.key === 'Escape') { closeCmdPalette(); return; }

  if (isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    e.preventDefault();
    var items = document.querySelectorAll('.ocp-item');
    if (!items.length) return;
    items[_cpActive] && (items[_cpActive].className = items[_cpActive].className.replace(' ocp-active', ''));
    _cpActive = e.key === 'ArrowDown' ? Math.min(_cpActive + 1, items.length - 1) : Math.max(_cpActive - 1, 0);
    items[_cpActive].className += ' ocp-active';
    items[_cpActive].scrollIntoView({ block: 'nearest' });
    return;
  }

  if (isOpen && e.key === 'Enter') {
    var active = document.querySelector('.ocp-item.ocp-active');
    if (active) { _execCmdItem(active); }
    return;
  }
});

/* ── Palette input filter ─────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', function () {
  var inp = document.getElementById('ocp-input');
  if (inp) {
    inp.addEventListener('input', function () { renderCmdResults(this.value); });
  }

  /* Click outside palette to close */
  var palette = document.getElementById('orion-cmd-palette');
  if (palette) {
    palette.addEventListener('click', function (e) {
      if (e.target === palette) closeCmdPalette();
    });
  }

  /* Command palette button */
  var cmdBtn = document.getElementById('orion-cmd-btn');
  if (cmdBtn) cmdBtn.addEventListener('click', openCmdPalette);

  /* Header refresh button */
  var refBtn = document.getElementById('orion-refresh-btn');
  if (refBtn) refBtn.addEventListener('click', function () {
    loadMorningBrief();
    showOrionToast('Brief refreshed.', '#9cf6ff');
  });

  /* Tick clock */
  _tickClock();
  setInterval(_tickClock, 30000);

  /* Boot sequence — skip if already booted this session */
  var alreadyBooted = sessionStorage.getItem('cos_booted');
  var dashboard = document.getElementById('orion-dashboard');
  var bootEl    = document.getElementById('orion-boot');

  if (alreadyBooted) {
    if (bootEl) bootEl.style.display = 'none';
    if (dashboard) dashboard.className += ' orion-visible';
    loadMorningBrief();
    setInterval(loadMorningBrief, 30000);
  } else {
    sessionStorage.setItem('cos_booted', '1');
    runBoot(function () {
      if (dashboard) dashboard.className += ' orion-visible';
      loadMorningBrief();
      setInterval(loadMorningBrief, 30000);
    });
  }
});
