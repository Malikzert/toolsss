/* Registers the COFDE service worker.
   Kept tiny and defensive so a failure here never breaks the page. */
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;

  /* The worker path must resolve from the repository root, not from the
     current page (/pages/*.html is one level deeper). Deriving the root from
     this script's own URL keeps it correct at any page depth and under any
     deployment sub-path (e.g. /toolsss/).
     currentScript is only valid while this IIFE runs, so capture it now. */
  var root = null;
  var self = document.currentScript;
  if (self && self.src) {
    var marker = 'assets/js/sw-register.js';
    var i = self.src.indexOf(marker);
    if (i >= 0) root = self.src.slice(0, i);
  }

  window.addEventListener('load', function () {
    var base = root || '';
    navigator.serviceWorker.register(base + 'pwa/sw.js', { scope: base || './' }).catch(function () {
      /* offline support unavailable; app still works online */
    });
  });
})();
