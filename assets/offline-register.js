// Static shell only. Account records and tokens never enter Cache Storage.
// Release updates: a new worker waits until this page lets it take over, so an app
// that is never fully closed does not stay on an old release.
// - Just opened (no tap or key yet, first 15 s): activate it and reload once, silently.
// - Otherwise: activate it when the app goes to the background; the next open uses it.
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    const startedAt = Date.now();
    let touched = false;
    const mark = () => { touched = true; };
    window.addEventListener('pointerdown', mark, {once:true, capture:true});
    window.addEventListener('keydown', mark, {once:true, capture:true});
    const fresh = () => !touched && Date.now() - startedAt < 15000;
    navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'}).then(reg => {
      if (!navigator.serviceWorker.controller) return; // first visit: nothing to replace
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloading && fresh() && document.visibilityState === 'visible') { reloading = true; location.reload(); }
      });
      const activate = () => { if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING'); };
      const whenFresh = () => { if (fresh()) activate(); };
      whenFresh();
      reg.addEventListener('updatefound', () => {
        const next = reg.installing;
        if (next) next.addEventListener('statechange', () => { if (next.state === 'installed') whenFresh(); });
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') activate();
        else reg.update().catch(() => {});
      });
    }).catch(() => {});
  }, {once:true});
}
