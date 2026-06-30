/* ecc_engine.js — Phase 22: Executive Control Center Engine
 * ES5 IIFE. Reads window.ECC_CONFIG, calls /api/ecc/dept/{dept}, renders all sections.
 * SECURITY: never handles tokens, never stores credentials, never takes irreversible action.
 * CEO approval required for any action routed to ORION queue.
 */
(function () {
  'use strict';

  // ── read config from each dept ECC page ──────────────────────────────────
  var CFG = window.ECC_CONFIG || {};
  var DEPT      = CFG.dept      || 'unknown';
  var LABEL     = CFG.label     || DEPT.toUpperCase();
  var ICON      = CFG.icon      || '';
  var COLOR     = CFG.color     || '#9b6bff';
  var WORKSPACE = CFG.workspace || '../index.html';
  var EMPLOYEES = CFG.employees || [];

  // ── cached server data ────────────────────────────────────────────────────
  var _data = null;

  // ── boot ─────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    _renderShell();
    _load();
    setInterval(_load, 30000);
    _startClock();
  });

  // ── shell: build static page skeleton ────────────────────────────────────
  function _renderShell() {
    var hdr = document.getElementById('ecc-header');
    if (hdr) {
      hdr.innerHTML =
        '<a class="ecc-back-btn" href="../index.html">← ORION</a>' +
        '<div class="ecc-dept-title" style="color:' + COLOR + '">' + ICON + ' ' + LABEL + '</div>' +
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
        '<a class="ecc-open-workspace" href="' + WORKSPACE + '" style="border-color:' + COLOR + '33;color:' + COLOR + '">' +
          'OPEN WORKSPACE →' +
        '</a>';
    }

    _renderEmployees();
    _renderActions();
  }

  // ── load data from server ─────────────────────────────────────────────────
  function _load() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/ecc/dept/' + DEPT, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
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
      }
    };
    xhr.send();
  }

  // ── render all sections from data ─────────────────────────────────────────
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
    var label  = d.health_label || 'UNKNOWN';
    var status = d.health_status || 'neutral';
    el.textContent = label.toUpperCase();
    el.setAttribute('data-status', status);
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
        actionBtn = '<a class="ecc-rec-action-btn" href="' + rec.action_url + '">' + rec.action_label + '</a>';
      } else {
        actionBtn = '<button class="ecc-rec-action-btn" onclick="EccEngine.openWorkspace()">' + rec.action_label + '</button>';
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
      var emp    = EMPLOYEES[i];
      var initials = (emp.name || '?').substring(0, 2).toUpperCase();
      var statusCls = emp.status || 'idle';
      var statusLbl = (emp.status === 'working') ? 'WORKING' : (emp.status === 'standby' ? 'STANDBY' : 'IDLE');
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

  // ── quick actions (from ECC_CONFIG) ──────────────────────────────────────
  function _renderActions() {
    var el = document.getElementById('ecc-action-grid');
    if (!el) return;
    var actions = CFG.quick_actions || [];
    if (!actions.length) { el.innerHTML = ''; return; }
    var html = '';
    for (var i = 0; i < actions.length; i++) {
      var a = actions[i];
      var href = a.href || WORKSPACE;
      html += '<a class="ecc-action-btn" href="' + href + '">' +
        (a.icon ? a.icon + ' ' : '') + _esc(a.label) + '</a>';
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
      html += '<div class="ecc-dec-empty">' + (pending.length - 3) + ' more — open ORION</div>';
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
      var e   = entries[i];
      var ts  = (e.ts || '').substring(11, 16);
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
      var now = new Date();
      var h = now.getHours();
      var m = now.getMinutes();
      var s = now.getSeconds();
      var ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      el.textContent = _pad(h) + ':' + _pad(m) + ':' + _pad(s) + ' ' + ampm;
    }
    tick();
    setInterval(tick, 1000);
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
    setTimeout(function () { el.classList.remove('ecc-toast-show'); }, 2800);
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

    openWorkspace: function () {
      window.location.href = WORKSPACE;
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
