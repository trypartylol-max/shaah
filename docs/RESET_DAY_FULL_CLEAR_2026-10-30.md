# Reset Day — full clear and animated confirmation

Explicit user decision: Reset deletes all data for the selected current day,
including activity records. This supersedes the earlier local proposal to keep
manual and incomplete routine entries when resetting.

## Behavior

- The × Reset control opens the same animated two-icon capsule concept used by
  the activity circle: × cancels and ✓ confirms. A visible warning says all data
  for today will be deleted. Escape cancels; opening/canceling changes no data.
- Confirmation is one-use, bound to date, account and session epoch. Navigation,
  account changes and a day rollover invalidate the pending decision.
- Confirmed Reset clears habits, Social check-ins, people seen that day, note,
  manual and linked Day Log events, including running/incomplete activity records.
- Today's routine sessions are discarded without recording an end event. Their
  stored session is cleared so reload/ticks cannot repopulate the cleared day.
- The per-account Day Log cache is updated and the existing owner-scoped queue
  enqueues deletion of the day row. Pending old debounce saves are superseded.
- Configured habits, point settings, contact directory, configuration eras and
  other dates are preserved. This is a day reset, not an account/config reset.
- Source changes remain local. No commits, push, deployment, schema changes or
  production account operations occurred.

## Verification

201 regression tests passed, including full-data deletion, owned-cache cleanup,
offline deletion intent, no legacy-cache resurrection, unchanged other dates and
settings, stopped sessions, no mutation before confirmation, stale-account/session
rejection and one-use confirmation. Seven Reset/sync browser tests passed at
320/390/879/1440 widths, with actual pointer controls, cancel, Escape, animation,
clear/reload and reachability above navigation. The four entry browser tests also
passed after the new Reset JavaScript was built.

The confirmation was visually inspected on desktop and mobile. It preserves the
trigger's place while expanding and reuses `product-end-pop`, including the
existing reduced-motion behavior. Bottom scroll clearance covers both form factors.

An initial desktop click exposed insufficient bottom clearance with long notes;
the final scoped Today padding fixes it. The final repeated browser suite passed.
