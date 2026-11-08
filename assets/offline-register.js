// Static shell only. Account records and tokens never enter Cache Storage.
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'}).catch(() => {});
  }, {once:true});
}
