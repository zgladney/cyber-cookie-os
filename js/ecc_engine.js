/* ecc_engine.js — Phase 22: Executive Control Center Engine
 * ES5 IIFE. Reads window.ECC_CONFIG, calls /api/ecc/dept/{dept}, renders all sections.
 *
 * CONTROLLER RULE: The ECC owns this page. The workspace is subordinate.
 * Quick actions execute within the ECC. Only openWorkspace() loads the
 * old workspace — inside an iframe overlay, not as a page navigation.
 *
 * SECURITY: never handles tokens, never takes irreversible action.
 * CEO approval required for any action routed to ORION queue.
 */
(function () {
  'use strict';

  // ── iframe guard: if this ECC page loaded inside the workspace overlay,
  // close the overlay in the parent instead of rendering a nested ECC ──────
  if (window !== window.parent) {
    try {
      if (window.parent.EccEngine && window.parent.EccEngine.closeWorkspace) {
        window.parent.EccEngine.closeWorkspace();
        // halt this page's rendering — parent will handle it
        throw new Error('ECC_IFRAME_GUARD');
      }
    } catch (guardErr) {
      if (guardErr.message === 'ECC_IFRAME_GUARD') return;
      // parent access blocked (cross-origin) — proceed normally
    }
  }

  // ── read config from each dept ECC page ──────────────────────────────────
  var CFG      = window.ECC_CONFIG || {};
  var DEPT     = CFG.dept      || 'unknown';
  var LABEL    = CFG.label     || DEPT.toUpperCase();
  var ICON     = CFG.icon      || '';
  var COLOR    = CFG.color     || '#9b6bff';
  var WORKSPACE= CFG.workspace || '../index.html';
  var EMPLOYEES= CFG.employees || [];

  // ── server data cache ─────────────────────────────────────────────────────
  var _data = null;

  // ── boot ─────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    _renderShell();
    _load();
    setInterval(_load, 30000);
    _startClock();
  });

  // ── shell: build static skeleton ─────────────────────────────────────────
  function _renderShell() {
    var hdr = document.getElementById('ecc-header');
    if (hdr) {
      hdr.innerHTML =
        '<a class="ecc-back-btn" href="../index.html">← ORION</a>' +
        '<div class="ecc-dept-title" style="color:' + COLOR + '">' + ICON + '  ' + LABEL + '</div>' +
        '<div class="ecc-dept-sub">EXECUTIVE CONTROL CENTER</div>' +
        '<div class="ecc-health-badge" id="ecc-health-badge" data-status="initializing">LOADING...</div>' +
        '<div id="ecc-clock" style="font-size:11px;letter-spacing:1.5px;color:rgba(180,150,255,.4);margin-left:auto"></div>';
    }

    var left = document.getElementById('ecc-left');
    if (left) {
      left.innerHTML =
        '<div class="ecc-card" id="ecc-summary-card">' +
          '<div class="ecc-card-title">EXECUTIVE SUMMARY</div>' +
          '<div class="ecc-summary" id="ecc-summary-text">Connecting to ' + LABEL + '...</div>' +
        '</div>' +
        '<div class="ecc-card ecc-rec-card" id="ecc-rec-card">' +
          '<div class="ecc-card-title">ORION RECOMMENDS</div>' +
          '<div id="ecc-rec-body"></div>' +
        '</div>' +
        '<div class="ecc-card" id="ecc-metrics-card">' +
          '<div class="ecc-card-title">KEY METRICS</div>' +
          '<div class="ecc-metrics-grid" id="ecc-metrics-grid"></div>' +
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
          '<div id="ecc-decisions"></div>' +
        '</div>' +
        '<div>' +
          '<div class="ecc-section-hdr">QUICK ACTIONS</div>' +
          '<div class="ecc-action-grid" id="ecc-action-grid"></div>' +
        '</div>' +
        '<div>' +
          '<div class="ecc-section-hdr">RECENT ACTIVITY</div>' +
          '<div class="ecc-act-list" id="ecc-activity"></div>' +
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

    _renderEmployees();
    _renderActions();
  }

  // ── load data from server ─────────────────────────────────────────────────
  function _load() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/ecc/dept/' + DEPT, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        try {
          _data = JSON.parse(xhr.responseText);
          _render(_data);
          _setFooter('● ' + LABEL + ' ONLINE');
        } catch (e) {
          _setFooter('■ PARSE ERROR');
        }
      } else {
        _setFooter('■ SERVER UNREACHABLE');
      }
    };
    xhr.send();
  }

  // ── render from data ──────────────────────────────────────────────────────
  function _render(d) {
    _renderHealth(d);
    _renderSummary(d);
    _renderRec(d.orion_recommendation || {});
    _renderMetrics(d.key_metrics || []);
    _renderDecisions(d.pending_decisions || []);
    _renderActivity(d.recent_activity || []);
  }

  // ── health badge ─────────────────────────────────────────────────────────
  function _renderHealth(d) {
    var el = document.getElementById('ecc-health-badge');
    if (!el) return;
    el.textContent = (d.health_label || 'UNKNOWN').toUpperCase();
    el.setAttribute('data-status', d.health_status || 'neutral');
  }

  // ── executive summary ─────────────────────────────────────────────────────
  function _renderSummary(d) {
    var el = document.getElementById('ecc-summary-text');
    if (el) el.textContent = d.summary || 'No summary available.';
  }

  // ── recommendation ────────────────────────────────────────────────────────
  function _renderRec(rec) {
    var el = document.getElementById('ecc-rec-body');
    if (!el) return;
    var conf = rec.confidence || 0;
    var actionBtn = '';
    if (rec.action_label) {
      if (rec.action_url) {
        actionBtn = '<a class="ecc-rec-action-btn" href="' + rec.action_url + '">' + _esc(rec.action_label) + '</a>';
      } else {
        // action opens workspace, does not navigate away
        actionBtn = '<button class="ecc-rec-action-btn" onclick="EccEngine.openWorkspace()">' + _esc(rec.action_label) + '</button>';
      }
    }
    el.innerHTML =
      '<div class="ecc-rec-text">' + _esc(rec.text || 'No recommendation.') + '</div>' +
      '<div class="ecc-rec-meta">' +
        '<div class="ecc-rec-reason"><span class="ecc-rec-reason-label">REASON: </span>' + _esc(rec.reason || '') + '</div>' +
        '<div class="ecc-rec-impact"><span class="ecc-rec-impact-label">IMPACT: </span>' + _esc(rec.impact || '') + '</div>' +
      '</div>' +
      '<div class="ecc-rec-conf-row">' +
        '<span class="ecc-rec-conf-label">CONFIDENCE</span>' +
        '<div class="ecc-rec-conf-bar"><div class="ecc-rec-conf-fill" style="width:' + conf + '%"></div></div>' +
        '<span class="ecc-rec-conf-pct">' + conf + '%</span>' +
      '</div>' +
      actionBtn;
  }

  // ── key metrics grid ──────────────────────────────────────────────────────
  function _renderMetrics(metrics) {
    var el = document.getElementById('ecc-metrics-grid');
    if (!el) return;
    if (!metrics.length) { el.innerHTML = '<div class="ecc-act-empty">No metrics.</div>'; return; }
    var html = '';
    for (var i = 0; i < metrics.length; i++) {
      var m   = metrics[i];
      var val = String(m.value || '0');
      var sml = val.length > 5 ? ' ecc-metric-sm' : '';
      html +=
        '<div class="ecc-metric-card">' +
          '<div class="ecc-metric-label">' + _esc(m.label) + '</div>' +
          '<div class="ecc-metric-value status-' + (m.status || 'neutral') + sml + '">' + _esc(val) + '</div>' +
        '</div>';
    }
    el.innerHTML = html;
  }

  // ── employees (from ECC_CONFIG) ──────────────────────────────────────────
  function _renderEmployees() {
    var el = document.getElementById('ecc-emp-grid');
    if (!el) return;
    if (!EMPLOYEES.length) { el.innerHTML = '<div class="ecc-act-empty">No employees configured.</div>'; return; }
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

  // ── quick actions — ECC-level only, no workspace navigation ──────────────
  // Action types:
  //   'refresh'  — reload ECC data
  //   'info'     — show a static informational toast
  //   'api_status' — GET endpoint, show item count in toast, then refresh
  // The ONLY thing that opens the workspace is the footer "OPEN WORKSPACE" button.
  function _renderActions() {
    var el = document.getElementById('ecc-action-grid');
    if (!el) return;
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

  // ── pending decisions ─────────────────────────────────────────────────────
  function _renderDecisions(pending) {
    var el = document.getElementById('ecc-decisions');
    if (!el) return;
    if (!pending.length) {
      el.innerHTML = '<div class="ecc-dec-empty">No pending decisions.</div>';
      return;
    }
    var riskColor = { low: '#2ecc71', medium: '#ffdc32', high: '#ff8c42', critical: '#ff4444' };
    var html = '';
    for (var i = 0; i < Math.min(pending.length, 3); i++) {
      var p  = pending[i];
      var rc = riskColor[p.risk] || '#9b6bff';
      html +=
        '<div class="ecc-dec-card" style="border-left-color:' + rc + '" data-qid="' + _esc(p.id) + '">' +
          '<div class="ecc-dec-title">' + _esc(p.title || 'Untitled') + '</div>' +
          '<div class="ecc-dec-meta">' + _esc(p.department || '') + ' · RISK: ' + _esc((p.risk || 'N/A').toUpperCase()) + '</div>' +
          '<div class="ecc-dec-btns">' +
            '<button class="ecc-dec-approve" onclick="EccEngine.approve(\'' + _esc(p.id) + '\')">APPROVE</button>' +
            '<button class="ecc-dec-decline" onclick="EccEngine.decline(\'' + _esc(p.id) + '\')">DECLINE</button>' +
          '</div>' +
        '</div>';
    }
    if (pending.length > 3) {
      html += '<div class="ecc-dec-empty">' + (pending.length - 3) + ' more — see ORION</div>';
    }
    el.innerHTML = html;
  }

  // ── recent activity ───────────────────────────────────────────────────────
  function _renderActivity(entries) {
    var el = document.getElementById('ecc-activity');
    if (!el) return;
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
            '<div class="ecc-act-agent">' + _esc(e.agent || 'SYSTEM') + '</div>' +
            '<div class="ecc-act-action">' + _esc(e.action || '') + '</div>' +
          '</div>' +
          '<div class="ecc-act-time">' + ts + '</div>' +
        '</div>';
    }
    el.innerHTML = html;
  }

  // ── clock ─────────────────────────────────────────────────────────────────
  function _startClock() {
    function tick() {
      var el = document.getElementById('ecc-clock');
      if (!el) return;
      var now  = new Date();
      var h    = now.getHours();
      var ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      el.textContent = _pad(h) + ':' + _pad(now.getMinutes()) + ':' + _pad(now.getSeconds()) + ' ' + ampm;
    }
    tick();
    setInterval(tick, 1000);
  }

  // ── workspace overlay ─────────────────────────────────────────────────────
  // The workspace loads inside a full-screen iframe overlay.
  // No page navigation occurs. The ECC remains the page controller.

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
    // Load workspace only when opened; set src now (lazy load)
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
      // Clear src so workspace scripts don't keep running in background
      var iframe = document.getElementById('ecc-ws-iframe');
      if (iframe) {
        iframe.removeAttribute('data-loaded');
        setTimeout(function () { iframe.src = ''; }, 200);
      }
    }
  }

  // ── footer status ─────────────────────────────────────────────────────────
  function _setFooter(msg) {
    var el = document.getElementById('ecc-footer-status');
    if (el) el.textContent = msg;
  }

  // ── toast ─────────────────────────────────────────────────────────────────
  function _toast(msg) {
    var el = document.getElementById('ecc-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('ecc-toast-show');
    setTimeout(function () { el.classList.remove('ecc-toast-show'); }, 3000);
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  function _esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _pad(n) { return n < 10 ? '0' + n : '' + n; }

  // ── public API ────────────────────────────────────────────────────────────
  window.EccEngine = {

    reload: _load,

    // Called by OPEN WORKSPACE footer button only.
    // Creates an iframe overlay — no page navigation.
    openWorkspace: function () {
      _openWorkspace();
    },

    // Called by the iframe topbar close button or by the workspace back button
    // when the workspace detects it is running inside this overlay.
    closeWorkspace: function () {
      _closeWorkspace();
    },

    // Quick action handler — ECC-level operations only.
    // action types: 'refresh', 'info', 'api_status'
    // Nothing here navigates to the workspace.
    doAction: function (index) {
      var actions = CFG.quick_actions || [];
      var a = actions[index];
      if (!a) return;

      switch (a.action) {

        case 'refresh':
          _toast((a.msg || 'Refreshing ' + LABEL + '...'));
          _load();
          break;

        case 'info':
          _toast(a.msg || 'No information available.');
          break;

        case 'api_status':
          _toast('Checking ' + (a.label || '') + '...');
          var xhr = new XMLHttpRequest();
          xhr.open('GET', a.endpoint, true);
          xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4 || xhr.status !== 200) return;
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

    approve: function (id) {
      if (!window.OrionServer) { _toast('OrionServer not available'); return; }
      OrionServer.approve(id, 'Approved via ' + LABEL + ' ECC', function (err) {
        if (err) { _toast('Error: ' + err); return; }
        _toast('Decision approved.');
        setTimeout(_load, 600);
      });
    },

    decline: function (id) {
      if (!window.OrionServer) { _toast('OrionServer not available'); return; }
      OrionServer.decline(id, 'Declined via ' + LABEL + ' ECC', function (err) {
        if (err) { _toast('Error: ' + err); return; }
        _toast('Decision declined.');
        setTimeout(_load, 600);
      });
    },

    toast: _toast,
  };

}());
