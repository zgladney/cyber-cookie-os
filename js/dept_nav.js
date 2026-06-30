/* dept_nav.js — CyberCookieOS Department Navigation Controller
 * ES5 IIFE. Load before ecc_engine.js on every ECC page.
 *
 * CONTRACT:
 *   DeptNav.switchTo(deptId) → branded transition overlay → location.replace(eccPath)
 *   DeptNav.back()           → transition → location.replace(hallway)
 *   DeptNav.renderSidebar()  → injects fixed bottom nav rail into page
 *
 * HISTORY: uses location.replace() so Back exits to pre-ECC origin, not a
 * chain of replaced ECCs. No duplicate history entries.
 *
 * WORKSPACE BRIDGE: when a workspace iframe calls window.parent.DeptNav.switchTo(),
 * the ECC closes its workspace overlay first, then transitions departments.
 */

var DepartmentRegistry = [
  { id: 'security',    label: 'SECURITY OPS',  icon: '\u{1F6E1}',  folder: 'hq',           themeColor: '#9b6bff' },
  { id: 'commerce',    label: 'REVENUE OPS',   icon: '\u{1F4B0}',  folder: 'commerce',     themeColor: '#ff69b4' },
  { id: 'projects',    label: 'PROJECTS',       icon: '\u{1F4CB}',  folder: 'apartment',    themeColor: '#3498db' },
  { id: 'finance',     label: 'FINANCE',        icon: '\u{1F4B5}',  folder: 'finance',      themeColor: '#2ecc71' },
  { id: 'career',      label: 'CAREER INTEL',   icon: '\u{1F4BC}',  folder: 'housing',      themeColor: '#7b6bff' },
  { id: 'connections', label: 'CONNECTIONS',     icon: '\u{1F517}',  folder: 'connections',  themeColor: '#9cf6ff' },
];

var DeptNav = (function () {
  'use strict';

  var _transitioning = false;

  /* ── Lookup ─────────────────────────────────────────────────────────────── */
  function _getById(id) {
    for (var i = 0; i < DepartmentRegistry.length; i++) {
      if (DepartmentRegistry[i].id === id) { return DepartmentRegistry[i]; }
    }
    return null;
  }

  function _getCurrentId() {
    return window.ECC_CONFIG ? (window.ECC_CONFIG.dept || null) : null;
  }

  /* ── Path from current depth-1 ECC to target ────────────────────────────── */
  function _eccPath(dept) {
    return '../' + dept.folder + '/ecc.html';
  }

  /* Parse a dept id from an href string (e.g. '../commerce/ecc.html' → 'commerce') */
  function _deptIdFromHref(href) {
    for (var i = 0; i < DepartmentRegistry.length; i++) {
      var d = DepartmentRegistry[i];
      if (href.indexOf('/' + d.folder + '/ecc') !== -1 ||
          href === d.folder + '/ecc.html') {
        return d.id;
      }
    }
    return null;
  }

  /* ── Transition overlay ─────────────────────────────────────────────────── */
  function _showTransition(label, color, cb) {
    var el = document.createElement('div');
    el.id = 'dept-nav-transition';
    el.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99999',
      'background:#04000d',
      'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'opacity:0', 'transition:opacity .16s ease',
      'font-family:Courier New,monospace',
      'pointer-events:all',
    ].join(';');

    el.innerHTML =
      '<div style="font-size:8px;letter-spacing:5px;color:rgba(180,150,255,.3);margin-bottom:12px;font-weight:700">ENTERING</div>' +
      '<div style="font-size:14px;font-weight:700;letter-spacing:7px;color:' + (color || '#9b6bff') + '">' + label + '</div>' +
      '<div style="margin-top:18px;width:150px;height:1px;background:rgba(155,107,255,.08)">' +
        '<div id="dept-nav-prog" style="width:0;height:100%;background:' + (color || '#9b6bff') + ';transition:width .32s ease-out"></div>' +
      '</div>';

    document.body.appendChild(el);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.style.opacity = '1';
        var prog = document.getElementById('dept-nav-prog');
        if (prog) { prog.style.width = '100%'; }
        setTimeout(cb, 400);
      });
    });
  }

  /* ── Public: switch department ──────────────────────────────────────────── */
  function switchTo(deptId) {
    if (_transitioning) { return; }
    if (deptId === _getCurrentId()) { return; }

    var dept = _getById(deptId);
    if (!dept) { return; }

    _transitioning = true;

    /* If an EccEngine workspace overlay is open, close it first */
    if (window.EccEngine && typeof EccEngine.closeWorkspace === 'function') {
      try { EccEngine.closeWorkspace(); } catch (e) {}
    }

    _showTransition(dept.label, dept.themeColor, function () {
      window.location.replace(_eccPath(dept));
    });
  }

  /* ── Public: return to ORION hallway ────────────────────────────────────── */
  function back() {
    if (_transitioning) { return; }
    _transitioning = true;
    if (window.EccEngine && typeof EccEngine.closeWorkspace === 'function') {
      try { EccEngine.closeWorkspace(); } catch (e) {}
    }
    _showTransition('ORION', '#9b6bff', function () {
      window.location.replace('../hallway/index.html');
    });
  }

  /* ── Public: inject bottom nav rail (call once per ECC page) ────────────── */
  function renderSidebar() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _injectRail);
    } else {
      _injectRail();
    }
  }

  function _injectRail() {
    if (document.getElementById('dept-nav-rail')) { return; }

    var currentId = _getCurrentId();
    var rail      = document.createElement('div');
    rail.id       = 'dept-nav-rail';
    rail.setAttribute('role', 'navigation');
    rail.setAttribute('aria-label', 'Department Navigation');
    rail.style.cssText = [
      'position:fixed', 'bottom:0', 'left:0', 'right:0', 'height:34px',
      'background:rgba(4,0,10,.97)',
      'border-top:1px solid rgba(155,107,255,.1)',
      'display:flex', 'align-items:center',
      'padding:0 10px', 'gap:3px', 'z-index:500',
      'font-family:Courier New,monospace',
    ].join(';');

    /* ← ORION */
    var orionBtn = _btn('← ORION', 'rgba(155,107,255,.05)', 'rgba(155,107,255,.38)', 'rgba(155,107,255,.12)', null);
    orionBtn.onclick = function () { DeptNav.back(); };
    rail.appendChild(orionBtn);

    /* Divider */
    var sep = document.createElement('span');
    sep.style.cssText = 'width:1px;height:16px;background:rgba(155,107,255,.1);margin:0 5px;flex-shrink:0';
    rail.appendChild(sep);

    /* Department buttons */
    for (var i = 0; i < DepartmentRegistry.length; i++) {
      (function (dept) {
        var isActive = (dept.id === currentId);
        var bg     = isActive ? (dept.themeColor + '1a') : 'rgba(155,107,255,.04)';
        var color  = isActive ? dept.themeColor           : 'rgba(155,107,255,.38)';
        var border = isActive ? (dept.themeColor + '40') : 'rgba(155,107,255,.1)';
        var label  = dept.icon + ' ' + dept.label;
        var b      = _btn(label, bg, color, border, isActive ? dept.themeColor : null);
        if (!isActive) {
          b.onmouseenter = function () { this.style.color = 'rgba(200,175,255,.7)'; this.style.borderColor = 'rgba(155,107,255,.25)'; };
          b.onmouseleave = function () { this.style.color = 'rgba(155,107,255,.38)'; this.style.borderColor = 'rgba(155,107,255,.1)'; };
        }
        b.onclick = function () { DeptNav.switchTo(dept.id); };
        rail.appendChild(b);
      }(DepartmentRegistry[i]));
    }

    /* Push page content up so footer isn't hidden behind rail */
    document.body.style.paddingBottom = '34px';
    document.body.appendChild(rail);
  }

  function _btn(label, bg, color, border, glow) {
    var b = document.createElement('button');
    b.setAttribute('type', 'button');
    b.style.cssText = [
      'font-family:Courier New,monospace',
      'font-size:7px', 'letter-spacing:1.5px', 'font-weight:700',
      'padding:3px 8px', 'cursor:pointer',
      'background:' + bg,
      'border:1px solid ' + (border || 'rgba(155,107,255,.1)'),
      'color:' + color,
      'border-radius:2px', 'white-space:nowrap',
      'transition:color .1s,border-color .1s',
      glow ? ('box-shadow:0 0 10px ' + glow + '25') : '',
    ].join(';');
    b.textContent = label;
    return b;
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */
  return {
    registry:       DepartmentRegistry,
    switchTo:       switchTo,
    back:           back,
    renderSidebar:  renderSidebar,
    getById:        _getById,
    getCurrentId:   _getCurrentId,
    deptIdFromHref: _deptIdFromHref,
  };
}());
