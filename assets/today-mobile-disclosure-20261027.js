/* Today Social Combo / Day Note disclosure. No day state or scoring writes.
   When the box has its own disclosure button (toggleTodayBox), the whole heading
   row forwards to it, like the LVL headings. The old panel-only collapse remains
   as a mobile fallback for a Today without box disclosures. */
(() => {
  'use strict';
  let expanded = true;
  const today = '.today.sf-today-v27:not(.history-day-editor)';
  const selector = today + ' > .t-social-independent > .sf-compact-combo';
  const heads = `${today} > [data-today-box="social"] .sf-combo-heading, ${today} > [data-today-box="note"] > .sec`;
  const boxButton = head => {
    const box = head.closest('[data-today-box]');
    return box ? box.querySelector(':scope > .today-box-disclosure') : null;
  };
  function sync() {
    for (const head of document.querySelectorAll(heads)) {
      if (!boxButton(head)) continue;
      head.classList.add('today-box-head');
      head.removeAttribute('role'); head.removeAttribute('tabindex');
      head.removeAttribute('aria-label'); head.removeAttribute('aria-expanded');
      head.closest('.sf-compact-combo')?.classList.remove('is-collapsed');
    }
    if (window.innerWidth >= 880) return;
    for (const panel of document.querySelectorAll(selector)) {
      const head = panel.querySelector(':scope > .sf-combo-heading');
      if (!head || boxButton(head)) continue;
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
      head.setAttribute('aria-label', 'Toggle Social Combo');
      head.setAttribute('aria-expanded', String(expanded));
      panel.classList.toggle('is-collapsed', !expanded);
    }
  }
  function toggle(e) {
    const forward = e.type === 'click' && e.target.closest('.today-box-head');
    if (forward && forward.matches(heads)) {
      const button = boxButton(forward);
      if (button) { button.click(); return; }
    }
    const head = e.target.closest('.sf-combo-heading');
    if (!head || !head.matches(selector + ' > .sf-combo-heading') || boxButton(head)) return;
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
