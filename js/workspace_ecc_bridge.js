/* workspace_ecc_bridge.js — Workspace Integration Guard
 *
 * Loaded as the last script in every department workspace page.
 * Two responsibilities:
 *
 * 1. ALWAYS (standalone or iframe): enforce safe form/button behaviour
 *    — button type guard (no implicit submit)
 *    — global form submit blocker (all submits go through fetch, not page reload)
 *
 * 2. IFRAME MODE ONLY (when workspace loads inside ECC overlay):
 *    — gate all navigation: ecc.html links → closeWorkspace(), all else → toast
 *    — patch window.navigateTo so it cannot navigate the parent ECC
 *    — anchor click capture to catch href-based navigation before it fires
 *    — OAuth redirect guard: open external URLs in new tab, not iframe
 *
 * SECURITY: this script never accesses tokens, credentials, or private data.
 */
(function () {
  'use strict';

  // ── Detect iframe context ─────────────────────────────────────────────────
  var IN_IFRAME = (window !== window.parent);
  var PARENT_ECC = null;

  if (IN_IFRAME) {
    try { PARENT_ECC = window.parent.EccEngine || null; } catch (e) { /* cross-origin */ }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PART 1 — ALWAYS ACTIVE
  // ─────────────────────────────────────────────────────────────────────────

  // Button type guard: buttons without an explicit type default to "submit"
  // and will trigger form submission if ever wrapped in a <form>.
  // Fix all of them to type="button" at DOM ready.
  document.addEventListener('DOMContentLoaded', function () {
    var all = document.querySelectorAll('button:not([type])');
    for (var i = 0; i < all.length; i++) {
      all[i].setAttribute('type', 'button');
    }
  }, false);

  // Global form submit capture (capture phase fires before any bubbling handler).
  // No workspace form should ever do a traditional page-reloading POST.
  // All data submission must use fetch/XHR and update the workspace in place.
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    e.stopPropagation();
    console.warn('[WS Guard] form submit intercepted:', e.target.id || e.target);
  }, true /* capture */);

  // ─────────────────────────────────────────────────────────────────────────
  // PART 2 — IFRAME MODE ONLY
  // ─────────────────────────────────────────────────────────────────────────
  if (!IN_IFRAME || !PARENT_ECC) return;

  // ── navigateTo patch ─────────────────────────────────────────────────────
  // All workspaces define a navigateTo(url) that calls window.location.href.
  // When in the ECC overlay iframe, we intercept it:
  //   ecc.html link → close the workspace overlay
  //   anything else → block and show a toast (must use ORION to navigate)
  var _origNavigateTo = window.navigateTo;
  window.navigateTo = function (url) {
    if (!url) return;
    if (url.indexOf('ecc.html') !== -1) {
      PARENT_ECC.closeWorkspace();
      return;
    }
    _iframeToast('Use ORION to navigate between departments. Close workspace first.');
  };

  // ── Anchor href capture ───────────────────────────────────────────────────
  // Catches <a href="..."> clicks that bypass navigateTo (plain href anchors).
  // Fires in capture phase so it runs before onclick or DOMContentLoaded wiring.
  document.addEventListener('click', function (e) {
    // Walk up to find the nearest anchor
    var node = e.target;
    while (node && node !== document) {
      if (node.tagName === 'A') break;
      node = node.parentNode;
    }
    if (!node || node.tagName !== 'A') return;

    var href = node.getAttribute('href');
    if (!href) return;
    // Let in-page hash links and javascript: void anchors pass through
    if (href.charAt(0) === '#' || href.indexOf('javascript') === 0) return;

    e.preventDefault();
    e.stopPropagation();

    if (href.indexOf('ecc.html') !== -1) {
      PARENT_ECC.closeWorkspace();
    } else {
      _iframeToast('Close workspace to navigate to ' + _shortName(href) + '.');
    }
  }, true /* capture */);

  // ── window.location.href guard ────────────────────────────────────────────
  // Workspaces call window.location.href = url directly in two cases:
  //   1. navigateTo() after a 280ms transition delay — already patched above
  //   2. connections OAuth redirect: window.location.href = data.url (external)
  //
  // We cannot override window.location itself (browser security), but we can
  // patch the specific call sites by replacing the function that calls it.
  // The OAuth case is patched directly in connections/index.html (see below).
  //
  // Belt-and-suspenders: override the delayed navigateTo approach by patching
  // setTimeout to intercept the common pattern:
  //   setTimeout(function () { window.location.href = url; }, 280)
  var _origSetTimeout = window.setTimeout;
  window.setTimeout = function (fn, delay) {
    var args = Array.prototype.slice.call(arguments, 2);
    var wrapped = function () {
      // If this timeout tries to set location.href, block it in iframe mode
      var src = (fn || '').toString();
      if (src.indexOf('location.href') !== -1 || src.indexOf('location[') !== -1) {
        _iframeToast('Navigation blocked inside workspace. Close workspace to continue.');
        return;
      }
      return typeof fn === 'function' ? fn.apply(this, args) : void 0;
    };
    return _origSetTimeout.call(window, wrapped, delay);
  };

  // ── Helper: toast inside iframe ───────────────────────────────────────────
  function _iframeToast(msg) {
    var t = document.getElementById('ws-ecc-guard-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'ws-ecc-guard-toast';
      t.style.cssText = [
        'position:fixed',
        'bottom:70px',
        'left:50%',
        'transform:translateX(-50%)',
        'background:rgba(10,2,26,.97)',
        'border:1px solid rgba(155,107,255,.35)',
        'border-radius:3px',
        'padding:8px 20px',
        'font-size:11px',
        'letter-spacing:1px',
        'color:rgba(180,150,255,.9)',
        'font-family:Courier New,monospace',
        'white-space:nowrap',
        'z-index:99999',
        'pointer-events:none',
        'opacity:0',
        'transition:opacity .2s',
      ].join(';');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._tid);
    t._tid = _origSetTimeout(function () { t.style.opacity = '0'; }, 3200);
  }

  function _shortName(href) {
    var s = href.replace(/\.\.\//g, '').replace(/\/index\.html$/, '');
    return s || href;
  }

}());
