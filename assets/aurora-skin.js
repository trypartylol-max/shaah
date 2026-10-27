/* Aurora V2 navigation is presentation only; native actions own all data. */
(function () {
  'use strict';
  const root = document.documentElement;
  const nav = document.getElementById('nav');
  if (!nav || document.getElementById('aurora-more')) return;
  const button = (label, symbol, action) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'aurora-nav';
    const icon = document.createElement('span'); icon.textContent = symbol; icon.setAttribute('aria-hidden', 'true');
    b.append(icon, document.createTextNode(label)); b.addEventListener('click', action);
    return b;
  };
  const dialog = document.createElement('dialog');
  dialog.id = 'aurora-more'; dialog.setAttribute('aria-labelledby', 'aurora-more-title');
  const heading = document.createElement('h2'); heading.id = 'aurora-more-title'; heading.textContent = 'More';
  dialog.append(heading);
  const dismiss = () => dialog.close();
  for (const [label, tab] of [['Daily Log', 'log'], ['Social', 'social'], ['Stats', 'stats']]) {
    dialog.append(button(label, '◇', () => { dismiss(); setTab(tab); }));
  }
  dialog.append(button('Settings', '⚙', () => { dismiss(); openSettings(); }));
  dialog.append(button('Close', '×', dismiss));
  document.body.append(dialog);
  const work = button('WORK', '▣', () => {
    setTab('today');
    const disclosure = document.querySelector('.today .t-rout-toggle[aria-expanded="false"]');
    if (disclosure) disclosure.click();
    const target = document.querySelector('.today .sf-work');
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
      const control = target.querySelector('button'); if (control) control.focus({ preventScroll: true });
    }
  });
  work.id = 'aurora-work';
  const more = button('MORE', '⋯', () => dialog.showModal());
  more.id = 'aurora-more-trigger'; more.setAttribute('aria-haspopup', 'dialog'); more.setAttribute('aria-controls', dialog.id);
  nav.append(work, more);
  const syncCurrent = () => {
    const secondary = nav.querySelector('.nav-btn.active:is([data-tab="log"],[data-tab="social"],[data-tab="stats"])');
    if (secondary && root.classList.contains('shaah-aurora')) more.setAttribute('aria-current', 'page');
    else more.removeAttribute('aria-current');
  };
  new MutationObserver(syncCurrent).observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] });
  syncCurrent();
  new MutationObserver(() => { syncCurrent(); if (!root.classList.contains('shaah-aurora') && dialog.open) dismiss(); })
    .observe(root, { attributes: true, attributeFilter: ['data-skin'] });
})();
