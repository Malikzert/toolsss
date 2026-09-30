/* Registers the COFDE service worker.
   Kept tiny and defensive so a failure here never breaks the page. */
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('pwa/sw.js').catch(function () {
      /* offline support unavailable; app still works online */
    });
  });
})();
