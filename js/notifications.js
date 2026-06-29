/* CyberCookieOS — Notification UI (NUI) v1.0
   Visual notification bell + panel + toast for any CyberCookieOS page.
   Requires: COS (cybercookieos.js) already on page.
   Auto-injects all elements into document.body on load.
*/
window.NUI = (function () {
  'use strict';

  var _el  = {};
  var _toastTimer = null;

  // ── CSS ──────────────────────────────────────────────────────────
  var CSS = [
    '#nui-bell{position:fixed;top:12px;right:132px;z-index:9000;cursor:pointer;',
    'font-size:18px;line-height:1;user-select:none;',
    'filter:drop-shadow(0 0 5px rgba(156,246,255,.35));transition:filter .2s;}',
    '#nui-bell:hover{filter:drop-shadow(0 0 12px rgba(156,246,255,.75));}',

    '.nui-badge{position:absolute;top:-5px;right:-8px;background:#ff5050;color:#fff;',
    'font-size:8px;font-weight:700;font-family:Arial,sans-serif;padding:1px 4px;',
    'border-radius:8px;min-width:14px;text-align:center;',
    'box-shadow:0 0 6px rgba(255,80,80,.55);line-height:13px;pointer-events:none;}',
    '.nui-badge-hidden{display:none!important;}',

    '#nui-panel{display:none;position:fixed;top:46px;right:100px;width:300px;max-height:420px;',
    'z-index:8999;background:rgba(5,0,16,.97);border:1px solid rgba(150,80,255,.22);',
    'border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,.65),0 0 0 1px rgba(150,80,255,.06);',
    'overflow:hidden;flex-direction:column;}',
    '#nui-panel.nui-panel-open{display:flex;}',

    '#nui-panelHead{display:flex;align-items:center;justify-content:space-between;',
    'padding:9px 13px;border-bottom:1px solid rgba(150,80,255,.1);flex-shrink:0;}',
    '.nui-panelTitle{font-size:8px;font-weight:700;letter-spacing:2.5px;',
    'color:rgba(200,160,255,.65);font-family:Arial,sans-serif;}',
    '.nui-btnText{background:transparent;border:none;font-size:8px;',
    'color:rgba(156,246,255,.45);cursor:pointer;font-family:inherit;',
    'letter-spacing:.8px;padding:0;}',
    '.nui-btnText:hover{color:rgba(156,246,255,.8);}',

    '#nui-panelList{overflow-y:auto;flex:1;padding:4px 0;}',
    '#nui-panelList::-webkit-scrollbar{width:3px;}',
    '#nui-panelList::-webkit-scrollbar-thumb{background:rgba(150,80,255,.18);border-radius:2px;}',

    '#nui-panelFoot{padding:7px 13px;border-top:1px solid rgba(150,80,255,.07);',
    'flex-shrink:0;text-align:center;}',
    '.nui-emptyMsg{color:rgba(200,160,255,.25);font-size:8px;letter-spacing:1px;',
    'font-family:Arial,sans-serif;}',

    '.nui-item{display:flex;align-items:flex-start;gap:9px;padding:8px 13px;',
    'border-bottom:1px solid rgba(255,255,255,.03);cursor:pointer;transition:background .15s;}',
    '.nui-item:hover{background:rgba(150,80,255,.05);}',
    '.nui-item:last-child{border-bottom:none;}',
    '.nui-item.nui-read .nui-itemText{opacity:.4;}',

    '.nui-dot{width:5px;height:5px;border-radius:50%;',
    'background:rgba(156,246,255,.45);margin-top:5px;flex-shrink:0;}',
    '.nui-dot-high{background:rgba(255,220,50,.85);box-shadow:0 0 4px rgba(255,220,50,.5);}',
    '.nui-dot-alert{background:rgba(255,80,80,.85);box-shadow:0 0 4px rgba(255,80,80,.5);}',
    '.nui-itemBody{flex:1;min-width:0;}',
    '.nui-itemText{font-size:8.5px;color:rgba(215,185,255,.78);line-height:1.5;',
    'font-family:Arial,sans-serif;word-break:break-word;}',
    '.nui-itemMeta{font-size:7px;color:rgba(200,160,255,.28);margin-top:2px;',
    'letter-spacing:.4px;font-family:Arial,sans-serif;}',

    '.nui-dismiss{background:transparent;border:none;color:rgba(200,160,255,.28);',
    'font-size:13px;cursor:pointer;padding:0 2px;flex-shrink:0;',
    'line-height:1;transition:color .15s;}',
    '.nui-dismiss:hover{color:rgba(255,80,80,.65);}',

    '#nui-toast{display:none;position:fixed;bottom:22px;left:50%;',
    'transform:translateX(-50%);background:rgba(5,0,16,.97);',
    'border:1px solid rgba(150,80,255,.28);color:rgba(215,185,255,.82);',
    'padding:8px 20px;border-radius:5px;font-size:9.5px;letter-spacing:.35px;',
    'font-family:Arial,sans-serif;z-index:9998;max-width:420px;text-align:center;',
    'line-height:1.5;box-shadow:0 4px 14px rgba(0,0,0,.5);}',
    '#nui-toast.nui-show{display:block;}',
    '#nui-toast.nui-t-high{border-color:rgba(255,220,50,.45);color:rgba(255,220,50,.95);}',
    '#nui-toast.nui-t-alert{border-color:rgba(255,80,80,.45);color:rgba(255,80,80,.95);}',
  ].join('');

  // ── DOM INJECTION ─────────────────────────────────────────────────
  function _inject() {
    if (document.getElementById('nui-bell')) return; // already injected

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var bell = document.createElement('div');
    bell.id = 'nui-bell';
    bell.setAttribute('role', 'button');
    bell.setAttribute('tabindex', '0');
    bell.setAttribute('title', 'Notifications');
    bell.innerHTML = '<span>🔔</span><span id="nui-badge" class="nui-badge nui-badge-hidden">0</span>';
    document.body.appendChild(bell);

    var panel = document.createElement('div');
    panel.id = 'nui-panel';
    panel.innerHTML =
      '<div id="nui-panelHead">' +
        '<span class="nui-panelTitle">NOTIFICATIONS</span>' +
        '<button class="nui-btnText" id="nui-markAll">Mark all read</button>' +
      '</div>' +
      '<div id="nui-panelList"></div>' +
      '<div id="nui-panelFoot"><span id="nui-emptyMsg" class="nui-emptyMsg" style="display:none">No new notifications</span></div>';
    document.body.appendChild(panel);

    var toast = document.createElement('div');
    toast.id = 'nui-toast';
    document.body.appendChild(toast);

    _el.bell     = bell;
    _el.badge    = document.getElementById('nui-badge');
    _el.panel    = panel;
    _el.list     = document.getElementById('nui-panelList');
    _el.empty    = document.getElementById('nui-emptyMsg');
    _el.markAll  = document.getElementById('nui-markAll');
    _el.toast    = toast;

    bell.addEventListener('click', togglePanel);

    document.addEventListener('click', function (e) {
      if (!bell.contains(e.target) && !panel.contains(e.target)) closePanel();
    });

    if (_el.markAll) {
      _el.markAll.addEventListener('click', function () {
        var c = typeof COS !== 'undefined' ? COS : null;
        if (c) c.notifications.markAllRead();
        renderPanel();
      });
    }
  }

  // ── RENDER ───────────────────────────────────────────────────────
  function renderPanel() {
    if (!_el.list) return;
    var c    = typeof COS !== 'undefined' ? COS : null;
    var list = c ? c.notifications.get(true).slice(0, 20) : [];
    var unread = list.filter(function (n) { return !n.read; }).length;

    if (_el.badge) {
      _el.badge.textContent = unread > 9 ? '9+' : String(unread);
      _el.badge.className   = 'nui-badge' + (unread > 0 ? '' : ' nui-badge-hidden');
    }

    if (!list.length) {
      _el.list.innerHTML = '';
      if (_el.empty) _el.empty.style.display = 'block';
      return;
    }
    if (_el.empty) _el.empty.style.display = 'none';

    _el.list.innerHTML = list.map(function (n) {
      var dotCls  = n.priority === 'high' ? ' nui-dot-high' : (n.priority === 'alert' ? ' nui-dot-alert' : '');
      var readCls = n.read ? ' nui-read' : '';
      var ago     = _ago(n.ts);
      return (
        '<div class="nui-item' + readCls + '" data-id="' + _esc(n.id) + '">' +
          '<div class="nui-dot' + dotCls + '"></div>' +
          '<div class="nui-itemBody">' +
            '<div class="nui-itemText">' + _esc(n.text) + '</div>' +
            '<div class="nui-itemMeta">' + ago + '</div>' +
          '</div>' +
          '<button class="nui-dismiss" data-id="' + _esc(n.id) + '" title="Dismiss">&times;</button>' +
        '</div>'
      );
    }).join('');

    _el.list.querySelectorAll('.nui-dismiss').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-id');
        if (c) c.notifications.dismiss(id);
        renderPanel();
      });
    });

    _el.list.querySelectorAll('.nui-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var id = item.getAttribute('data-id');
        if (c) c.notifications.markRead(id);
        item.classList.add('nui-read');
        renderPanel();
      });
    });
  }

  function showToast(notif) {
    if (!_el.toast) return;
    _el.toast.textContent = notif.text;
    _el.toast.className   = 'nui-show' + (notif.priority === 'high' ? ' nui-t-high' : '') + (notif.priority === 'alert' ? ' nui-t-alert' : '');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () { if (_el.toast) _el.toast.className = ''; }, 4500);
  }

  function togglePanel() {
    if (!_el.panel) return;
    if (_el.panel.classList.contains('nui-panel-open')) closePanel();
    else openPanel();
  }

  function openPanel()  { if (_el.panel) { _el.panel.classList.add('nui-panel-open'); renderPanel(); } }
  function closePanel() { if (_el.panel) _el.panel.classList.remove('nui-panel-open'); }

  // ── EVENT WIRING ─────────────────────────────────────────────────
  function _wireEvents() {
    if (typeof COS === 'undefined') return;
    COS.events.on('notifications:new', function (n) { showToast(n); renderPanel(); });
    COS.events.on('notifications:changed', function () { renderPanel(); });
  }

  // ── UTILS ────────────────────────────────────────────────────────
  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function _ago(ts) {
    var d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60) return d + 's ago';
    if (d < 3600) return Math.floor(d / 60) + 'm ago';
    return Math.floor(d / 3600) + 'h ago';
  }

  // ── INIT ─────────────────────────────────────────────────────────
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { _inject(); _wireEvents(); renderPanel(); });
    } else {
      _inject();
      _wireEvents();
      renderPanel();
    }
  }

  init();

  return { renderPanel: renderPanel, showToast: showToast, openPanel: openPanel, closePanel: closePanel };
})();
