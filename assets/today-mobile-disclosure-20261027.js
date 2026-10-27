/* Today-only Social Combo disclosure. No day state or scoring writes. */
(() => {
  'use strict';
  let expanded = true;
  const selector = '.today.sf-today-v27:not(.history-day-editor) > .t-social-independent > .sf-compact-combo';
  function sync() {
    if (window.innerWidth >= 880) return;
    for (const panel of document.querySelectorAll(selector)) {
      const head = panel.querySelector(':scope > .sf-combo-heading');
      if (!head) continue;
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
      head.setAttribute('aria-label', 'Toggle Social Combo');
      head.setAttribute('aria-expanded', String(expanded));
      panel.classList.toggle('is-collapsed', !expanded);
    }
  }
  function toggle(e) {
    const head = e.target.closest('.sf-combo-heading');
    if (!head || !head.matches(selector + ' > .sf-combo-heading')) return;
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    if (e.type === 'keydown') e.preventDefault();
    expanded = !expanded;
    sync();
  }
  document.addEventListener('click', toggle);
  document.addEventListener('keydown', toggle);
  const observer = new MutationObserver(records => {
    if (records.some(r => r.addedNodes.length || r.removedNodes.length)) sync();
  });
  observer.observe(document.body, {childList:true,subtree:true});
  sync();
})();
