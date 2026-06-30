/* workspace_ecc_bridge.js
 * Loaded by every department workspace page.
 * When the workspace is running inside the ECC workspace overlay (iframe),
 * the back button should close the overlay rather than navigate the iframe
 * to the ECC page (which would create a nested ECC).
 *
 * Detection: window !== window.parent AND parent has EccEngine.
 * If true: intercept all clicks on links that point to ecc.html
 *          and call parent.EccEngine.closeWorkspace() instead.
 */
(function () {
  'use strict';

  if (window === window.parent) return;           // not in iframe — nothing to do
  try { if (!window.parent.EccEngine) return; }  // parent is not an ECC page
  catch (e) { return; }                           // cross-origin — can't read parent

  // Intercept clicks on ecc.html back-links inside the workspace iframe
  document.addEventListener('click', function (e) {
    var a = e.target.closest
      ? e.target.closest('a[href]')
      : (e.target.tagName === 'A' && e.target.getAttribute('href') ? e.target : null);

    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('ecc.html') !== -1) {
      e.preventDefault();
      window.parent.EccEngine.closeWorkspace();
    }
  }, true);

  // Also patch window.navigateTo if it exists (used by housing/hq workspaces)
  var _orig = window.navigateTo;
  window.navigateTo = function (url) {
    if (url && url.indexOf('ecc.html') !== -1) {
      window.parent.EccEngine.closeWorkspace();
      return;
    }
    if (typeof _orig === 'function') _orig(url);
    else window.location.href = url;
  };

}());
