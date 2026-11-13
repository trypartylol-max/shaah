/* Presentation only. No account data, device detection or saved zoom preference. */
(() => {
  const root = document.documentElement;
  let pending = 0, fitPending = 0, band = false, scale = 1, fallback = '';
  // Today fit tiers (today-fit-20261111.css), least compact first. On desktop screens up to
  // 960px of effective height, Today uses the roomiest tier whose content fits without
  // scrolling; in Pro any space left over goes to the Day Note.
  const TIERS = ['roomy', 'mild', 'compact', 'compact tight'];
  function setFit(fit) { if (fit) root.setAttribute('data-today-fit', fit); else root.removeAttribute('data-today-fit'); }
  function fitToday() {
    fitPending = 0;
    if (typeof document.getElementById !== 'function') { setFit(fallback); return; }
    const scroll = document.getElementById('scroll');
    const today = band && scroll && scroll.querySelector(':scope>.today.sf-today-v27:not(.history-day-editor)');
    root.style.removeProperty('--today-fit-spare');
    if (!today) { setFit(band ? fallback : ''); return; }
    const nav = document.getElementById('nav');
    const room = () => {
      const top = scroll.getBoundingClientRect().top, n = nav && nav.getBoundingClientRect();
      const limit = n && n.height && n.top > window.innerHeight / 2 ? n.top : window.innerHeight;
      let bottom = top;
      for (const el of today.children) if (el.getClientRects().length && !/^(absolute|fixed)$/.test(getComputedStyle(el).position)) bottom = Math.max(bottom, el.getBoundingClientRect().bottom);
      return limit - bottom;
    };
    const keep = scroll.scrollTop; scroll.scrollTop = 0;
    root.style.removeProperty('--today-fit-gap');
    let chosen = TIERS[TIERS.length - 1], spare = 0;
    // A tier fits only if Today ends above the limit and #scroll itself does not overflow.
    for (const tier of TIERS) { setFit(tier); const r = room(); if (r >= 0 && scroll.scrollHeight <= scroll.clientHeight) { chosen = tier; spare = r; break; } }
    setFit(chosen);
    // Leftover space: in Pro the Day Note may grow up to three lines of text; the rest
    // spreads evenly between the blocks, keeping a margin at the bottom (Customize etc.).
    const pro = root.getAttribute('data-layout') === 'pro';
    let left = spare / scale - (pro ? 40 : 20);
    if (left > 0) {
      if (pro) {
        const ta = today.querySelector('.pro-today-grid textarea');
        if (ta && ta.getClientRects().length) {
          const cs = getComputedStyle(ta), px = v => parseFloat(v) || 0;
          const line = px(cs.lineHeight) || px(cs.fontSize) * 1.35;
          const max = 3 * line + px(cs.paddingTop) + px(cs.paddingBottom) + px(cs.borderTopWidth) + px(cs.borderBottomWidth);
          const grow = Math.max(0, Math.min(left, max - ta.getBoundingClientRect().height / scale));
          if (grow >= 1) { root.style.setProperty('--today-fit-spare', Math.floor(grow) + 'px'); left -= Math.floor(grow); }
        }
      }
      // The rest spreads between rows and under the Core heading; Standard also widens the
      // horizontal gaps by the same amount so boxes keep even spacing (today-fit-20261111.css).
      let gap = pro ? Math.min(24, Math.floor(left / 4)) : Math.min(20, Math.floor(left / 5));
      // The extra gap must never create scrolling: shrink it until #scroll no longer overflows.
      const overflows = () => room() < 0 || scroll.scrollHeight > scroll.clientHeight;
      const overflowBefore = scroll.scrollHeight > scroll.clientHeight;
      while (gap >= 1) {
        root.style.setProperty('--today-fit-gap', gap + 'px');
        if (!overflows() || overflowBefore && room() >= 0) break;
        gap -= 2;
      }
      if (gap < 1) root.style.removeProperty('--today-fit-gap');
    }
    scroll.scrollTop = keep;
  }
  function scheduleFit() { if (!fitPending) fitPending = requestAnimationFrame(fitToday); }
  function updateDisplay() {
    pending = 0;
    const width = window.innerWidth, height = window.innerHeight;
    // The approved 1440x900 laptop and all smaller windows are unchanged.
    // Both dimensions constrain enlargement, including short ultrawide windows.
    scale = Math.max(1, Math.min(2, width / 1600, height / 900));
    const active = scale > 1.001;
    // Today fit uses the effective (post-zoom) viewport. Without a measurable Today the
    // tier falls back to the screen height alone.
    const effW = width / scale, effH = height / scale;
    band = effW >= 880 && effH <= 960;
    fallback = band ? (effH <= 760 ? 'compact tight' : 'compact') : '';
    root.toggleAttribute('data-wide-display', active);
    if (active) {
      root.style.setProperty('--app-display-scale', String(scale));
      root.style.setProperty('--app-vw', (width / scale / 100) + 'px');
      root.style.setProperty('--app-vh', (height / scale / 100) + 'px');
    } else {
      for (const name of ['--app-display-scale', '--app-vw', '--app-vh']) root.style.removeProperty(name);
    }
    fitToday();
  }
  window.addEventListener('resize', () => { if (!pending) pending = requestAnimationFrame(updateDisplay); });
  updateDisplay();
  // Re-fit whenever the app re-renders (Today opened, a section folded, layout changed).
  if (typeof MutationObserver === 'function') {
    new MutationObserver(scheduleFit).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-layout', 'data-skin'] });
  }
})();
