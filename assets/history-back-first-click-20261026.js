/* SHAAH desktop History: make the first Back click close the day view.
   Capture before delegated UI handlers to avoid a stale first-click dispatch. */
document.addEventListener('click', function (event) {
  const button = event.target instanceof Element
    ? event.target.closest('.edit-day-screen button[data-ui-click="closeEditDay"]')
    : null;
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (typeof closeEditDay === 'function') closeEditDay();
}, true);
