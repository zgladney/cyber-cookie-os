/* ecc_engine.js — Executive Control Center Engine
 * ES5 IIFE. Reads window.ECC_CONFIG, calls /api/ecc/dept/{dept}, renders all sections.
 *
 * LOADING STATES — three-state per panel:
 *   loading  → skeleton shimmer for max 2 seconds
 *   success  → live data rendered
 *   error    → fallback text + RETRY NOW button + 15s auto-retry countdown
 *
 * Non-data panels (employees, quick actions, clock, workspace button, recent decisions)
 * render immediately from ECC_CONFIG and remain functional regardless of API state.
 *
 * SECURITY: never handles tokens, never takes irreversible action.
 * CEO approval required for any action routed to ORION queue.
 */
(function () {
  'use strict';

  /* ── iframe guard ──────────────────────────────────────────────────────────── */
  if (window !== window.parent) {
    try {
      if (window.parent.EccEngine && window.parent.EccEngine.closeWorkspace) {
        window.parent.EccEngine.closeWorkspace();
        throw new Error('ECC_IFRAME_GUARD');
      }
    } catch (guardErr) {
      if (guardErr.message === 'ECC_IFRAME_GUARD') { return; }
    }
  }

  /* ── config ────────────────────────────────────────────────────────────────── */
  var CFG       = window.ECC_CONFIG || {};
  var DEPT      = CFG.dept      || 'unknown';
  var LABEL     = CFG.label     || DEPT.toUpperCase();
  var ICON      = CFG.icon      || '';
  var COLOR     = CFG.color     || '#9b6bff';
  var WORKSPACE = CFG.workspace || '../index.html';
  var EMPLOYEES = CFG.employees || [];

  /* ── fetch / retry state ───────────────────────────────────────────────────── */
  var _data            = null;
  var _loadState       = 'idle';   /* 'loading' | 'success' | 'error' */
  var _loadTimer       = null;     /* 2-second timeout handle */
  var _retryTickId     = null;     /* 1-second countdown interval */
  var _retryRemaining  = 0;
  var _pollTimerId     = null;     /* 30-second success-state poll */

  /* ── decision state ────────────────────────────────────────────────────────── */
  var _recentDecisions = [];
  var _activeDetailId  = null;

  /* ── boot ──────────────────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    _renderShell();   /* static: clock, employees, actions, drawer — no API needed */
    _load();
    _startClock();
  });

  /* ── shell: static skeleton ─────────────────────────────────────────────────── */
  function _renderShell() {
    var hdr = document.getElementById('ecc-header');
    if (hdr) {
      hdr.innerHTML =
        '<a class="ecc-back-btn" href="../index.html">← ORION</a>' +
        '<div class="ecc-dept-title" style="color:' + COLOR + '">' + ICON + '  ' + LABEL + '</div>' +
        '<div class="ecc-dept-sub">EXECUTIVE CONTROL CENTER</div>' +
        '<div class="ecc-health-badge" id="ecc-health-badge" data-status="initializing">LOADING</div>' +
        '<div id="ecc-clock" style="font-size:11px;letter-spacing:1.5px;color:rgba(180,150,255,.4);margin-left:auto"></div>';
    }

    var left = document.getElementById('ecc-left');
    if (left) {
      left.innerHTML =
        '<div class="ecc-card" id="ecc-summary-card">' +
          '<div class="ecc-card-title">EXECUTIVE SUMMARY</div>' +
          '<div class="ecc-summary" id="ecc-summary-text">' + _skelLines(3) + '</div>' +
        '</div>' +
        '<div class="ecc-card ecc-rec-card" id="ecc-rec-card">' +
          '<div class="ecc-card-title">ORION RECOMMENDS</div>' +
          '<div id="ecc-rec-body">' + _skelLines(2) + '</div>' +
        '</div>' +
        '<div class="ecc-card" id="ecc-metrics-card">' +
          '<div class="ecc-card-title">KEY METRICS</div>' +
          '<div class="ecc-metrics-grid" id="ecc-metrics-grid">' + _skelMetricGrid() + '</div>' +
        '</div>' +
        '<div class="ecc-card" id="ecc-emp-card">' +
          '<div class="ecc-card-title">EMPLOYEE STATUS</div>' +
          '<div class="ecc-emp-grid" id="ecc-emp-grid"></div>' +
        '</div>';
    }

    var right = document.getElementById('ecc-right');
    if (right) {
      right.innerHTML =
        '<div>' +
          '<div class="ecc-section-hdr">PENDING DECISIONS</div>' +
          '<div id="ecc-decisions"><div class="ecc-dec-empty">' + _skelLines(1) + '</div></div>' +
        '</div>' +
        '<div>' +
          '<div class="ecc-section-hdr">RECENT DECISIONS</div>' +
          '<div id="ecc-recent-log"><div class="ecc-dec-empty">No decisions yet this session.</div></div>' +
        '</div>' +
        '<div>' +
          '<div class="ecc-section-hdr">QUICK ACTIONS</div>' +
          '<div class="ecc-action-grid" id="ecc-action-grid"></div>' +
        '</div>' +
        '<div>' +
          '<div class="ecc-section-hdr">RECENT ACTIVITY</div>' +
          '<div class="ecc-act-list" id="ecc-activity"><div class="ecc-act-empty">' + _skelLines(2) + '</div></div>' +
        '</div>';
    }

    var ftr = document.getElementById('ecc-footer');
    if (ftr) {
      ftr.innerHTML =
        '<div class="ecc-footer-left">' +
          '<span class="ecc-footer-status" id="ecc-footer-status">● CONNECTING...</span>' +
        '</div>' +
        '<button class="ecc-open-workspace" id="ecc-open-workspace-btn" ' +
          'onclick="EccEngine.openWorkspace()" ' +
          'style="border-color:' + COLOR + '44;color:' + COLOR + '">' +
          'OPEN WORKSPACE →' +
        '</button>';
    }

    /* Inject detail drawer once */
    if (!document.getElementById('ecc-detail-ov')) {
      var drawerDiv = document.createElement('div');
      drawerDiv.id = 'ecc-detail-ov';
      drawerDiv.className = 'ecc-detail-ov';
      drawerDiv.innerHTML =
        '<div class="ecc-detail-panel">' +
          '<div class="ecc-detail-topbar">' +
            '<span class="ecc-detail-qid"   id="ecc-dt-qid"></span>' +
            '<span class="ecc-detail-title" id="ecc-dt-title"></span>' +
            '<button class="ecc-detail-close" onclick="EccEngine.closeDetail()">✕ CLOSE</button>' +
          '</div>' +
          '<div class="ecc-detail-body"    id="ecc-dt-body"></div>' +
          '<div class="ecc-detail-actions" id="ecc-dt-actions"></div>' +
        '</div>';
      document.body.appendChild(drawerDiv);
      drawerDiv.addEventListener('click', function (e) {
        if (e.target === drawerDiv) { EccEngine.closeDetail(); }
      });
    }

    /* These never wait on the API */
    _renderEmployees();
    _renderActions();
  }

  /* ── skeleton helpers ───────────────────────────────────────────────────────── */
  function _skelLines(n) {
    var widths = ['', 'med', 'short', 'med', 'short'];
    var html = '';
    for (var i = 0; i < (n || 2); i++) {
      html += '<div class="ecc-skeleton-line ' + (widths[i % widths.length] || '') + '"></div>';
    }
    return html;
  }

  function _skelMetricGrid() {
    var html = '<div class="ecc-skeleton-metric">';
    for (var i = 0; i < 6; i++) {
      html += '<div class="ecc-skeleton-metric-cell">' +
        '<div class="ecc-skeleton-line short" style="margin-bottom:6px"></div>' +
        '<div class="ecc-skeleton-line tall"></div>' +
      '</div>';
    }
    return html + '</div>';
  }

  /* ── loading state: called at start of every fetch ─────────────────────────── */
  function _renderLoadingState() {
    var badge = document.getElementById('ecc-health-badge');
    if (badge) { badge.textContent = 'LOADING'; badge.setAttribute('data-status', 'initializing'); }

    var sum = document.getElementById('ecc-summary-text');
    if (sum) { sum.innerHTML = _skelLines(3); }

    var rec = document.getElementById('ecc-rec-body');
    if (rec) { rec.innerHTML = _skelLines(2); }

    var met = document.getElementById('ecc-metrics-grid');
    if (met) { met.innerHTML = _skelMetricGrid(); }

    var dec = document.getElementById('ecc-decisions');
    if (dec) { dec.innerHTML = '<div class="ecc-dec-empty">' + _skelLines(1) + '</div>'; }

    var act = document.getElementById('ecc-activity');
    if (act) { act.innerHTML = '<div class="ecc-act-empty">' + _skelLines(2) + '</div>'; }
  }

  /* ── error state: API failed or timed out ───────────────────────────────────── */
  function _renderErrorState(msg) {
    var badge = document.getElementById('ecc-health-badge');
    if (badge) { badge.textContent = 'OFFLINE'; badge.setAttribute('data-status', 'offline'); }

    _setFooter('■ ' + LABEL + ' OFFLINE — retrying');

    var errorBlock =
      '<div class="ecc-error-block">' +
        '<div class="ecc-error-label">SERVICE UNAVAILABLE</div>' +
        '<div class="ecc-error-msg">' + _esc(msg || (LABEL + ' service unavailable.')) + '</div>' +
        '<button class="ecc-retry-btn" onclick="EccEngine.reload()">RETRY NOW</button>' +
        '<div class="ecc-retry-countdown ecc-countdown-target"></div>' +
      '</div>';

    var sum = document.getElementById('ecc-summary-text');
    if (sum) { sum.innerHTML = errorBlock; }

    var rec = document.getElementById('ecc-rec-body');
    if (rec) { rec.innerHTML = '<div class="ecc-act-empty">No recommendations available.</div>'; }

    var met = document.getElementById('ecc-metrics-grid');
    if (met) { met.innerHTML = '<div class="ecc-act-empty">Metrics unavailable — service offline.</div>'; }

    var dec = document.getElementById('ecc-decisions');
    if (dec) { dec.innerHTML = '<div class="ecc-dec-empty">No pending approvals.</div>'; }

    var act = document.getElementById('ecc-activity');
    if (act) { act.innerHTML = '<div class="ecc-act-empty">No recent activity.</div>'; }
  }

  /* ── countdown tick ─────────────────────────────────────────────────────────── */
  function _updateCountdown() {
    var els = document.querySelectorAll('.ecc-countdown-target');
    var txt = _retryRemaining > 0
      ? 'Auto-retry in ' + _retryRemaining + 's'
      : 'Retrying...';
    for (var i = 0; i < els.length; i++) { els[i].textContent = txt; }
  }

  /* ── retry scheduler ────────────────────────────────────────────────────────── */
  function _scheduleRetry() {
    _clearRetryTick();
    _retryRemaining = 15;
    _updateCountdown();
    _retryTickId = setInterval(function () {
      _retryRemaining = Math.max(0, _retryRemaining - 1);
      _updateCountdown();
      if (_retryRemaining === 0) {
        _clearRetryTick();
        _load();
      }
    }, 1000);
  }

  function _clearRetryTick() {
    if (_retryTickId) { clearInterval(_retryTickId); _retryTickId = null; }
  }

  function _clearLoadTimer() {
    if (_loadTimer) { clearTimeout(_loadTimer); _loadTimer = null; }
  }

  function _clearPoll() {
    if (_pollTimerId) { clearTimeout(_pollTimerId); _pollTimerId = null; }
  }

  function _schedulePoll() {
    _clearPoll();
    _pollTimerId = setTimeout(function () {
      if (_loadState === 'success') { _load(); }
    }, 30000);
  }

  /* ── fetch data from server ─────────────────────────────────────────────────── */
  function _load() {
    /* Cancel any pending retry countdown and poll */
    _clearRetryTick();
    _clearLoadTimer();
    _clearPoll();

    _loadState = 'loading';
    _renderLoadingState();
    _setFooter('● CONNECTING TO ' + LABEL + '...');

    /* Hard 2-second ceiling on the loading state */
    _loadTimer = setTimeout(function () {
      if (_loadState === 'loading') {
        _loadState = 'error';
        _renderErrorState(LABEL + ' service unavailable. Request timed out.');
        _scheduleRetry();
      }
    }, 2000);

    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/ecc/dept/' + DEPT, true);

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) { return; }
      _clearLoadTimer();

      /* If we already timed out, still process a successful response */
      if (xhr.status === 200) {
        try {
          var parsed = JSON.parse(xhr.responseText);
          if (parsed && parsed.error) {
            /* Server returned a JSON error body */
            _clearRetryTick();
            _loadState = 'error';
            _renderErrorState(parsed.error);
            _scheduleRetry();
          } else {
            /* Success */
            _clearRetryTick();
            _loadState = 'success';
            _data = parsed;
            _render(parsed);
            _setFooter('● ' + LABEL + ' ONLINE');
            _schedulePoll();
          }
        } catch (e) {
          if (_loadState !== 'success') {
            _loadState = 'error';
            _renderErrorState(LABEL + ' service unavailable. Response parse error.');
            _scheduleRetry();
          }
        }
      } else {
        if (_loadState !== 'success') {
          _loadState = 'error';
          _renderErrorState(LABEL + ' service unavailable. (HTTP ' + xhr.status + ')');
          _scheduleRetry();
        }
      }
    };

    xhr.onerror = function () {
      _clearLoadTimer();
      if (_loadState !== 'success') {
        _loadState = 'error';
        _renderErrorState(LABEL + ' service unavailable. Network error.');
        _scheduleRetry();
      }
    };

    xhr.send();
  }

  /* ── render all panels from data ────────────────────────────────────────────── */
  function _render(d) {
    _renderHealth(d);
    _renderSummary(d);
    _renderRec(d.orion_recommendation || {});
    _renderMetrics(d.key_metrics || []);
    _renderDecisions(d.pending_decisions || []);
    _renderActivity(d.recent_activity || []);
  }

  /* ── health badge ───────────────────────────────────────────────────────────── */
  function _renderHealth(d) {
    var el = document.getElementById('ecc-health-badge');
    if (!el) { return; }
    el.textContent = (d.health_label || 'UNKNOWN').toUpperCase();
    el.setAttribute('data-status', d.health_status || 'neutral');
  }

  /* ── executive summary ──────────────────────────────────────────────────────── */
  function _renderSummary(d) {
    var el = document.getElementById('ecc-summary-text');
    if (!el) { return; }
    el.textContent = d.summary || 'No summary available.';
  }

  /* ── recommendation ─────────────────────────────────────────────────────────── */
  function _renderRec(rec) {
    var el = document.getElementById('ecc-rec-body');
    if (!el) { return; }
    if (!rec || !rec.text) {
      el.innerHTML = '<div class="ecc-act-empty">No recommendations available.</div>';
      return;
    }
    var conf = rec.confidence || 0;
    var actionBtn = '';
    if (rec.action_label) {
      if (rec.action_url) {
        actionBtn = '<a class="ecc-rec-action-btn" href="' + rec.action_url + '">' + _esc(rec.action_label) + '</a>';
      } else {
        actionBtn = '<button class="ecc-rec-action-btn" onclick="EccEngine.openWorkspace()">' + _esc(rec.action_label) + '</button>';
      }
    }
    el.innerHTML =
      '<div class="ecc-rec-text">' + _esc(rec.text) + '</div>' +
      '<div class="ecc-rec-meta">' +
        '<div class="ecc-rec-reason"><span class="ecc-rec-reason-label">REASON: </span>' + _esc(rec.reason || '') + '</div>' +
        '<div class="ecc-rec-impact"><span class="ecc-rec-impact-label">IMPACT: </span>'  + _esc(rec.impact  || '') + '</div>' +
      '</div>' +
      '<div class="ecc-rec-conf-row">' +
        '<span class="ecc-rec-conf-label">CONFIDENCE</span>' +
        '<div class="ecc-rec-conf-bar"><div class="ecc-rec-conf-fill" style="width:' + conf + '%"></div></div>' +
        '<span class="ecc-rec-conf-pct">' + conf + '%</span>' +
      '</div>' +
      actionBtn;
  }

  /* ── key metrics grid ───────────────────────────────────────────────────────── */
  function _renderMetrics(metrics) {
    var el = document.getElementById('ecc-metrics-grid');
    if (!el) { return; }
    if (!metrics.length) {
      el.innerHTML = '<div class="ecc-act-empty">No metrics available.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < metrics.length; i++) {
      var m   = metrics[i];
      var val = String(m.value || '0');
      var sml = val.length > 5 ? ' ecc-metric-sm' : '';
      html +=
        '<div class="ecc-metric-card">' +
          '<div class="ecc-metric-label">' + _esc(m.label) + '</div>' +
          '<div class="ecc-metric-value status-' + _esc(m.status || 'neutral') + sml + '">' + _esc(val) + '</div>' +
        '</div>';
    }
    el.innerHTML = html;
  }

  /* ── employees (from ECC_CONFIG — never waits on API) ─────────────────────── */
  function _renderEmployees() {
    var el = document.getElementById('ecc-emp-grid');
    if (!el) { return; }
    if (!EMPLOYEES.length) {
      el.innerHTML = '<div class="ecc-act-empty">No employees configured.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < EMPLOYEES.length; i++) {
      var emp      = EMPLOYEES[i];
      var initials = (emp.name || '?').substring(0, 2).toUpperCase();
      var statusCls= emp.status || 'idle';
      var statusLbl= emp.status === 'working' ? 'WORKING' : (emp.status === 'standby' ? 'STANDBY' : 'IDLE');
      html +=
        '<div class="ecc-emp-card">' +
          '<div class="ecc-emp-avatar" style="border-color:' + COLOR + '44;color:' + COLOR + '">' + initials + '</div>' +
          '<div class="ecc-emp-info">' +
            '<div class="ecc-emp-name">' + _esc(emp.name) + '</div>' +
            '<div class="ecc-emp-role">' + _esc(emp.role) + '</div>' +
            '<div class="ecc-emp-task">' + _esc(emp.task || '') + '</div>' +
          '</div>' +
          '<div class="ecc-emp-status ' + statusCls + '">' + statusLbl + '</div>' +
        '</div>';
    }
    el.innerHTML = html;
  }

  /* ── quick actions (from ECC_CONFIG — never waits on API) ─────────────────── */
  function _renderActions() {
    var el      = document.getElementById('ecc-action-grid');
    if (!el) { return; }
    var actions = CFG.quick_actions || [];
    if (!actions.length) { el.innerHTML = ''; return; }
    var html = '';
    for (var i = 0; i < actions.length; i++) {
      var a = actions[i];
      html +=
        '<button class="ecc-action-btn" onclick="EccEngine.doAction(' + i + ')">' +
          (a.icon ? a.icon + '  ' : '') + _esc(a.label) +
        '</button>';
    }
    el.innerHTML = html;
  }

  /* ── pending decisions ──────────────────────────────────────────────────────── */
  function _renderDecisions(pending) {
    var el = document.getElementById('ecc-decisions');
    if (!el) { return; }
    if (!pending.length) {
      el.innerHTML = '<div class="ecc-dec-empty">No pending approvals.</div>';
      return;
    }
    var riskColor = { low: '#2ecc71', medium: '#ffdc32', high: '#ff8c42', critical: '#ff4444', irreversible: '#ff4444' };
    var html = '';
    for (var i = 0; i < Math.min(pending.length, 5); i++) {
      var p  = pending[i];
      var rc = riskColor[p.risk] || '#9b6bff';
      var prev = _buildPreviewText(p);
      html +=
        '<div class="ecc-dec-card" style="border-left-color:' + rc + '" data-qid="' + _esc(p.id) + '" ' +
          'onclick="EccEngine.openDetail(\'' + _esc(p.id) + '\')">' +
          '<div class="ecc-dec-title">' + _esc(p.title || 'Untitled') + '</div>' +
          '<div class="ecc-dec-meta">' + _esc(p.department || '') + ' · RISK: ' + _esc((p.risk || 'N/A').toUpperCase()) + '</div>' +
          (prev ? '<div class="ecc-dec-preview">' + _esc(prev) + '</div>' : '') +
          '<div class="ecc-dec-btns" onclick="event.stopPropagation()">' +
            '<button class="ecc-dec-approve" onclick="EccEngine.approve(\'' + _esc(p.id) + '\')">APPROVE</button>' +
            '<button class="ecc-dec-decline" onclick="EccEngine.decline(\'' + _esc(p.id) + '\')">DECLINE</button>' +
            '<button class="ecc-dec-details-btn" onclick="event.stopPropagation();EccEngine.openDetail(\'' + _esc(p.id) + '\')">DETAILS →</button>' +
          '</div>' +
        '</div>';
    }
    if (pending.length > 5) {
      html += '<div class="ecc-dec-empty">' + (pending.length - 5) + ' more — open ORION</div>';
    }
    el.innerHTML = html;
  }

  function _buildPreviewText(item) {
    var data = _parseData(item.data);
    if (!data) { return item.description ? item.description.substring(0, 80) : ''; }
    var dept = (item.department || '').toLowerCase();

    if (dept === 'career') {
      var job   = data.job || data;
      var parts = [];
      if (job.company)  { parts.push(job.company); }
      if (job.salary)   { parts.push('$' + job.salary); }
      if (job.location) { parts.push(job.location); }
      return parts.join(' · ');
    }
    if (dept === 'security') {
      var parts2 = [];
      if (data.severity)    { parts2.push('SEV: ' + data.severity); }
      if (data.threat_node) { parts2.push(data.threat_node); }
      return parts2.join(' · ');
    }
    if (dept === 'finance') {
      var parts3 = [];
      if (data.vendor) { parts3.push(data.vendor); }
      if (data.amount) { parts3.push('$' + data.amount); }
      return parts3.join(' · ');
    }
    if (dept === 'commerce') {
      var parts4 = [];
      if (data.title || item.title)  { parts4.push(data.title || item.title); }
      if (data.platform)             { parts4.push(data.platform.toUpperCase()); }
      if (data.price)                { parts4.push('$' + data.price); }
      return parts4.join(' · ');
    }
    if (dept === 'projects') {
      var parts5 = [];
      if (data.dept)     { parts5.push(data.dept.toUpperCase()); }
      if (data.deadline) { parts5.push('due ' + data.deadline); }
      if (data.priority) { parts5.push(data.priority.toUpperCase() + ' priority'); }
      return parts5.join(' · ');
    }
    return item.description ? item.description.substring(0, 80) : '';
  }

  /* ── recent activity ────────────────────────────────────────────────────────── */
  function _renderActivity(entries) {
    var el = document.getElementById('ecc-activity');
    if (!el) { return; }
    if (!entries.length) {
      el.innerHTML = '<div class="ecc-act-empty">No recent activity.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < Math.min(entries.length, 6); i++) {
      var e  = entries[i];
      var ts = (e.ts || '').substring(11, 16);
      html +=
        '<div class="ecc-act-item">' +
          '<span class="ecc-act-dot">●</span>' +
          '<div class="ecc-act-body">' +
            '<div class="ecc-act-agent">'  + _esc(e.agent  || 'SYSTEM') + '</div>' +
            '<div class="ecc-act-action">' + _esc(e.action || '')       + '</div>' +
          '</div>' +
          '<div class="ecc-act-time">' + ts + '</div>' +
        '</div>';
    }
    el.innerHTML = html;
  }

  /* ── clock ──────────────────────────────────────────────────────────────────── */
  function _startClock() {
    function tick() {
      var el  = document.getElementById('ecc-clock');
      if (!el) { return; }
      var now = new Date();
      var h   = now.getHours();
      var ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      el.textContent = _pad(h) + ':' + _pad(now.getMinutes()) + ':' + _pad(now.getSeconds()) + ' ' + ampm;
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ── detail drawer ──────────────────────────────────────────────────────────── */
  function _findItem(id) {
    if (!_data || !_data.pending_decisions) { return null; }
    for (var i = 0; i < _data.pending_decisions.length; i++) {
      if (_data.pending_decisions[i].id === id) { return _data.pending_decisions[i]; }
    }
    return null;
  }

  function _openDetail(id) {
    var item = _findItem(id);
    if (!item) { _toast('Item not found — try refreshing.'); return; }
    _activeDetailId = id;

    var qidEl   = document.getElementById('ecc-dt-qid');
    var titleEl = document.getElementById('ecc-dt-title');
    var bodyEl  = document.getElementById('ecc-dt-body');
    var actEl   = document.getElementById('ecc-dt-actions');
    var ovEl    = document.getElementById('ecc-detail-ov');

    if (qidEl)   { qidEl.textContent   = item.id    || ''; }
    if (titleEl) { titleEl.textContent = item.title || 'Decision Required'; }
    if (bodyEl)  { bodyEl.innerHTML    = _buildDetailHTML(item); }
    if (actEl)   { actEl.innerHTML     = _buildDetailActions(item); }
    if (ovEl)    { ovEl.classList.add('ecc-detail-open'); }
  }

  function _closeDetail() {
    var ovEl = document.getElementById('ecc-detail-ov');
    if (ovEl) { ovEl.classList.remove('ecc-detail-open'); }
    _activeDetailId = null;
  }

  function _buildDetailHTML(item) {
    var data    = _parseData(item.data);
    var dept    = (item.department || '').toLowerCase();
    var risk    = (item.risk || 'unknown').toLowerCase();
    var riskCls = risk.replace(/ /g, '-');

    var html =
      '<div class="ecc-detail-badge-row">' +
        '<span class="ecc-detail-badge dept">' + _esc((item.department || 'UNKNOWN').toUpperCase()) + '</span>' +
        '<span class="ecc-detail-badge risk-' + _esc(riskCls) + '">RISK: ' + _esc(risk.toUpperCase()) + '</span>' +
        (item.agent ? '<span class="ecc-detail-badge" style="color:rgba(180,150,255,.6);border-color:rgba(155,107,255,.2)">' + _esc(item.agent) + '</span>' : '') +
      '</div>';

    if (item.description) {
      html += '<div class="ecc-detail-desc">' + _esc(item.description) + '</div>';
    }

    if (dept === 'career' && data) {
      var job = data.job || data;
      html += _field('JOB TITLE',   job.title || item.title);
      html += _field('COMPANY',     job.company);
      html += _field('SALARY',      job.salary || (job.salary_min ? '$' + job.salary_min + (job.salary_max ? ' – $' + job.salary_max : '+') : null));
      html += _field('LOCATION',    job.location);
      html += _field('WORK TYPE',   job.type);
      html += _field('RESUME VER.', data.resume_version);
      if (job.skills && job.skills.length) {
        html += _field('KEY SKILLS', job.skills.slice(0, 6).join(', '));
      }
      if (job.link) { html += _field('JOB URL', job.link); }
      html += _field('SUBMITTED',   _fmtTs(item.submitted_at));
      html += _fieldWarn('RISK',    'Irreversible — application cannot be un-submitted once sent.');

    } else if (dept === 'security' && data) {
      html += _field('INCIDENT ID',    data.incident_id || item.id);
      html += _field('SEVERITY',       data.severity);
      html += _field('THREAT NODE',    data.threat_node);
      html += _field('EVIDENCE COUNT', data.evidence_count != null ? String(data.evidence_count) : null);
      html += _field('REC. ACTION',    data.recommended_action);
      html += _field('SUBMITTED',      _fmtTs(item.submitted_at));
      html += _field('RISK',           (item.risk || 'unknown').toUpperCase());

    } else if (dept === 'finance' && data) {
      html += _field('TRANSACTION TYPE', data.type);
      html += _field('VENDOR',           data.vendor);
      html += _field('AMOUNT',           data.amount != null ? '$' + data.amount : null);
      html += _field('CATEGORY',         data.category);
      html += _field('SUBMITTED',        _fmtTs(item.submitted_at));
      html += _field('RISK',             (item.risk || 'unknown').toUpperCase());

    } else if (dept === 'commerce' && data) {
      html += _field('PRODUCT',    data.title    || item.title);
      html += _field('PLATFORM',   data.platform ? data.platform.toUpperCase() : null);
      html += _field('TYPE',       data.type     || item.type);
      html += _field('PRICE',      data.price    ? '$' + data.price : null);
      html += _field('SUBMITTED',  _fmtTs(item.submitted_at));
      html += _field('RISK',       (item.risk || 'unknown').toUpperCase());
      if (risk === 'irreversible') {
        html += _fieldWarn('CAUTION', 'Once published, listing is visible to buyers. Requires CEO approval.');
      }

    } else if (dept === 'projects' && data) {
      html += _field('PROJECT',    data.title    || item.title);
      html += _field('DEPARTMENT', data.dept     ? data.dept.toUpperCase() : null);
      html += _field('PRIORITY',   data.priority ? data.priority.toUpperCase() : null);
      html += _field('TARGET DATE', data.deadline);
      html += _field('SUBMITTED',  _fmtTs(item.submitted_at));
      html += _field('RISK',       (item.risk || 'unknown').toUpperCase());

    } else if (dept === 'housing' && data) {
      /* Legacy housing items that may still be in ORION queue */
      var addr = data.address ? (data.address + (data.city ? ', ' + data.city : '')) : null;
      html += _field('PROPERTY',     addr);
      html += _field('MONTHLY RENT', data.rent ? '$' + data.rent + '/mo' : null);
      html += _field('BEDS / BATHS', (data.beds || '?') + ' BR / ' + (data.baths || '?') + ' BA');
      html += _field('HCV ACCEPTED', data.voucher === true ? 'YES' : (data.voucher === false ? 'NO' : 'Unknown'));
      html += _field('SUBMITTED',    _fmtTs(item.submitted_at));
      html += _fieldWarn('RISK',     'Irreversible — rental application cannot be rescinded once submitted.');

    } else {
      html += _field('TYPE',      item.type);
      html += _field('AGENT',     item.agent);
      html += _field('RISK',      (item.risk || 'unknown').toUpperCase());
      html += _field('SUBMITTED', _fmtTs(item.submitted_at));
    }

    return html;
  }

  function _buildDetailActions(item) {
    var id = _esc(item.id);
    return (
      '<div class="ecc-detail-action-row">' +
        '<button class="ecc-detail-approve-btn" onclick="EccEngine.approve(\'' + id + '\');EccEngine.closeDetail()">APPROVE</button>' +
        '<button class="ecc-detail-decline-btn" onclick="EccEngine.decline(\'' + id + '\');EccEngine.closeDetail()">DECLINE</button>' +
      '</div>' +
      '<div class="ecc-detail-action-row">' +
        '<button class="ecc-detail-ws-btn"        onclick="EccEngine.openWorkspace()">OPEN WORKSPACE</button>' +
        '<button class="ecc-detail-secondary-btn" onclick="EccEngine.assignToAgent(\'' + id + '\')">ASSIGN TO AGENT</button>' +
        '<button class="ecc-detail-secondary-btn" onclick="EccEngine.requestMoreInfo(\'' + id + '\')">MORE INFO</button>' +
      '</div>'
    );
  }

  /* ── field row helpers ──────────────────────────────────────────────────────── */
  function _field(key, val) {
    if (val == null || val === '' || val === 'null' || val === 'undefined') { return ''; }
    return (
      '<div class="ecc-detail-field">' +
        '<span class="ecc-detail-field-key">' + _esc(key) + '</span>' +
        '<span class="ecc-detail-field-val">' + _esc(String(val)) + '</span>' +
      '</div>'
    );
  }
  function _fieldWarn(key, val) {
    if (!val) { return ''; }
    return (
      '<div class="ecc-detail-field">' +
        '<span class="ecc-detail-field-key">' + _esc(key) + '</span>' +
        '<span class="ecc-detail-field-val critical">' + _esc(String(val)) + '</span>' +
      '</div>'
    );
  }

  /* ── workspace overlay ──────────────────────────────────────────────────────── */
  function _createOverlay() {
    var el = document.createElement('div');
    el.id = 'ecc-ws-overlay';
    el.className = 'ecc-ws-overlay';
    el.innerHTML =
      '<div class="ecc-ws-topbar">' +
        '<span class="ecc-ws-topbar-label">' + ICON + '  ' + LABEL + ' — WORKSPACE</span>' +
        '<button class="ecc-ws-close-btn" onclick="EccEngine.closeWorkspace()">← RETURN TO ECC</button>' +
      '</div>' +
      '<iframe class="ecc-ws-iframe" id="ecc-ws-iframe" src="" title="' + LABEL + ' Workspace"></iframe>';
    document.body.appendChild(el);
    return el;
  }

  function _openWorkspace() {
    var overlay = document.getElementById('ecc-ws-overlay') || _createOverlay();
    var iframe  = document.getElementById('ecc-ws-iframe');
    if (iframe && !iframe.getAttribute('data-loaded')) {
      iframe.src = WORKSPACE;
      iframe.setAttribute('data-loaded', '1');
    }
    overlay.classList.add('ecc-ws-open');
    document.body.style.overflow = 'hidden';
  }

  function _closeWorkspace() {
    var overlay = document.getElementById('ecc-ws-overlay');
    if (overlay) {
      overlay.classList.remove('ecc-ws-open');
      document.body.style.overflow = '';
      var iframe = document.getElementById('ecc-ws-iframe');
      if (iframe) {
        iframe.removeAttribute('data-loaded');
        setTimeout(function () { iframe.src = ''; }, 200);
      }
    }
  }

  /* ── recent decisions log ───────────────────────────────────────────────────── */
  function _addRecentDecision(item, decision) {
    var now = new Date();
    var ts  = _pad(now.getHours()) + ':' + _pad(now.getMinutes());
    _recentDecisions.unshift({ title: item.title || item.id, decision: decision, ts: ts });
    if (_recentDecisions.length > 10) { _recentDecisions = _recentDecisions.slice(0, 10); }
    _renderRecentLog();
  }

  function _renderRecentLog() {
    var el = document.getElementById('ecc-recent-log');
    if (!el) { return; }
    if (!_recentDecisions.length) {
      el.innerHTML = '<div class="ecc-dec-empty">No decisions yet this session.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < _recentDecisions.length; i++) {
      var d = _recentDecisions[i];
      html +=
        '<div class="ecc-recent-dec-item">' +
          '<span class="ecc-recent-dec-decision ' + d.decision + '">' + d.decision.toUpperCase() + '</span>' +
          '<span class="ecc-recent-dec-title">' + _esc(d.title) + '</span>' +
          '<span class="ecc-recent-dec-time">'  + d.ts + '</span>' +
        '</div>';
    }
    el.innerHTML = html;
  }

  /* ── mark card decided in DOM ───────────────────────────────────────────────── */
  function _markCardDecided(id, decision) {
    var cards = document.querySelectorAll('.ecc-dec-card');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute('data-qid') === id) {
        var card = cards[i];
        card.classList.add('ecc-dec-decided', 'ecc-dec-decided-' + decision);
        var btns = card.querySelector('.ecc-dec-btns');
        if (btns) {
          btns.innerHTML = '<span class="ecc-dec-decided-label ' + decision + '">' + decision.toUpperCase() + '</span>';
        }
        break;
      }
    }
  }

  /* ── approve / decline ──────────────────────────────────────────────────────── */
  function _doApprove(id) {
    if (!window.OrionServer) { _toast('OrionServer not available'); return; }
    var item = _findItem(id);
    OrionServer.approve(id, 'Approved via ' + LABEL + ' ECC', function (err) {
      if (err) { _toast('Error: ' + err); return; }
      _toast('APPROVED — ' + (item ? item.title : id));
      _markCardDecided(id, 'approved');
      if (item) { _addRecentDecision(item, 'approved'); }
      _emitDecision(id, 'approved', item);
      setTimeout(_load, 800);
    });
  }

  function _doDecline(id) {
    if (!window.OrionServer) { _toast('OrionServer not available'); return; }
    var item = _findItem(id);
    OrionServer.decline(id, 'Declined via ' + LABEL + ' ECC', function (err) {
      if (err) { _toast('Error: ' + err); return; }
      _toast('DECLINED — ' + (item ? item.title : id));
      _markCardDecided(id, 'declined');
      if (item) { _addRecentDecision(item, 'declined'); }
      _emitDecision(id, 'declined', item);
      setTimeout(_load, 800);
    });
  }

  function _emitDecision(id, decision, item) {
    if (window.COS && COS.events) {
      COS.events.emit('approval.completed', {
        id:         id,
        decision:   decision,
        department: item ? item.department : DEPT,
        title:      item ? item.title      : id,
        ts:         Date.now(),
      });
    }
  }

  /* ── assign to agent ────────────────────────────────────────────────────────── */
  function _assignToAgent(id) {
    var item = _findItem(id);
    if (!item) { _toast('Item not found.'); return; }
    var emp = EMPLOYEES[0];
    if (!emp) { _toast('No agents configured.'); return; }
    if (window.COS && COS.AgentEngine) {
      var agId = (emp.id || emp.name || '').toLowerCase().replace(/\s+/g, '-');
      COS.AgentEngine.assign(agId, 'Review: ' + item.title, id);
    }
    if (window.OrionServer) {
      OrionServer.log(DEPT, 'assign_to_agent', { item_id: id, agent: emp.name, title: item.title });
    }
    _toast('Assigned to ' + emp.name + ': ' + (item.title || id));
    if (window.COS && COS.events) {
      COS.events.emit('approval.assigned', { id: id, agent: emp.name, dept: DEPT });
    }
  }

  /* ── request more info ──────────────────────────────────────────────────────── */
  function _requestMoreInfo(id) {
    var item = _findItem(id);
    if (!window.OrionServer) { _toast('OrionServer not available.'); return; }
    OrionServer.log(DEPT, 'more_info_requested', {
      item_id: id,
      title:   item ? item.title      : id,
      dept:    item ? item.department : DEPT,
    });
    _toast('More info requested for: ' + (item ? item.title : id));
    if (window.COS && COS.events) {
      COS.events.emit('approval.info_requested', { id: id, dept: DEPT });
    }
  }

  /* ── footer status ──────────────────────────────────────────────────────────── */
  function _setFooter(msg) {
    var el = document.getElementById('ecc-footer-status');
    if (el) { el.textContent = msg; }
  }

  /* ── toast ──────────────────────────────────────────────────────────────────── */
  function _toast(msg) {
    var el = document.getElementById('ecc-toast');
    if (!el) { return; }
    el.textContent = msg;
    el.classList.add('ecc-toast-show');
    setTimeout(function () { el.classList.remove('ecc-toast-show'); }, 3000);
  }

  /* ── helpers ────────────────────────────────────────────────────────────────── */
  function _esc(s) {
    if (s == null) { return ''; }
    return String(s)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;');
  }

  function _pad(n) { return n < 10 ? '0' + n : '' + n; }

  function _fmtTs(ts) {
    if (!ts) { return null; }
    try {
      var d = new Date(ts);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
             ' ' + _pad(d.getHours()) + ':' + _pad(d.getMinutes());
    } catch (e) { return ts; }
  }

  function _parseData(data) {
    if (!data) { return null; }
    if (typeof data === 'object') { return data; }
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch (e) { return null; }
    }
    return null;
  }

  /* ── public API ─────────────────────────────────────────────────────────────── */
  window.EccEngine = {

    reload: _load,

    openWorkspace:  function ()   { _openWorkspace(); },
    closeWorkspace: function ()   { _closeWorkspace(); },

    openDetail:  function (id) { _openDetail(id); },
    closeDetail: function ()   { _closeDetail(); },

    doAction: function (index) {
      var actions = CFG.quick_actions || [];
      var a = actions[index];
      if (!a) { return; }

      switch (a.action) {
        case 'refresh':
          _toast(a.msg || 'Refreshing ' + LABEL + '...');
          _load();
          break;

        case 'info':
          _toast(a.msg || 'No information available.');
          break;

        case 'open_ws':
          _openWorkspace();
          break;

        case 'api_status':
          _toast('Checking ' + (a.label || '') + '...');
          var xhr = new XMLHttpRequest();
          xhr.open('GET', a.endpoint, true);
          xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4 || xhr.status !== 200) { return; }
            try {
              var d    = JSON.parse(xhr.responseText);
              var list = d[a.key] || d.jobs || d.recommendations || d.transactions || d.contacts || d.entries || [];
              var n    = Array.isArray(list) ? list.length : (d.count || 0);
              var noun = a.noun || 'item';
              _toast(n + ' ' + noun + (n !== 1 ? 's' : '') + ' on record.');
              _load();
            } catch (e) {
              _toast('Error reading ' + (a.label || 'data') + '.');
            }
          };
          xhr.send();
          break;

        default:
          _toast(a.msg || 'Action not yet available. Use Open Workspace.');
          break;
      }
    },

    approve:         function (id) { _doApprove(id); },
    decline:         function (id) { _doDecline(id); },
    assignToAgent:   function (id) { _assignToAgent(id); },
    requestMoreInfo: function (id) { _requestMoreInfo(id); },

    toast: _toast,
  };

}());
