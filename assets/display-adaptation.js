/* Presentation only. No account data, device detection or saved zoom preference. */
(() => {
  const root = document.documentElement;
  let pending = 0;
  function updateDisplay() {
    pending = 0;
    const width = window.innerWidth, height = window.innerHeight;
    // The approved 1440x900 laptop and all smaller windows are unchanged.
    // Both dimensions constrain enlargement, including short ultrawide windows.
    const scale = Math.max(1, Math.min(2, width / 1600, height / 900));
    const active = scale > 1.001;
    root.toggleAttribute('data-wide-display', active);
    if (active) {
      root.style.setProperty('--app-display-scale', String(scale));
      root.style.setProperty('--app-vw', (width / scale / 100) + 'px');
      root.style.setProperty('--app-vh', (height / scale / 100) + 'px');
    } else {
      for (const name of ['--app-display-scale', '--app-vw', '--app-vh']) root.style.removeProperty(name);
    }
  }
  window.addEventListener('resize', () => { if (!pending) pending = requestAnimationFrame(updateDisplay); });
  updateDisplay();
})();
