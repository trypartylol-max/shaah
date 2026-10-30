# Day Log — explicit product clarifications, 2026-10-30

These later user decisions supersede any earlier interpretation of the audit.

Further explicit Reset decision: `RESET_DAY_FULL_CLEAR_2026-10-30.md` supersedes
the earlier manual-activity-preserving Reset proposal. Reset now deletes all data
for today after the animated ×/✓ confirmation, preserving settings and other days.

1. Reset must be reachable above the fixed mobile navigation with sections
   minimized. With expanded/long content, normal scrolling must reach it.
2. Wake and Sleep are distinct complementary actions sharing one habit score.
   They are not duplicate completions of the same action and must not award the
   full habit twice. Preserve the current partial/full scoring model.
3. Concurrent activities are legitimate. Working while speaking with family or
   friends counts as both activities. Summed activity duration may exceed wall
   clock duration. Do not automatically subtract overlaps from activity totals.

The earlier example of two overlapping one-hour activities totaling two hours
is therefore valid activity accounting, not a confirmed calculation defect.
An optional wall-clock coverage metric would need a separate name and purpose.

## Local implementation and validation

The mobile Today container now reserves bottom scroll space above the dock,
including safe-area padding. Reset has a 44px minimum target and a bottom scroll
margin. Scoped below 880px and excluded from the historical editor; desktop,
navigation placement, scoring and stored data are unchanged by this CSS fix.

Three browser scenarios at 320x740, 390x844 and 879x900 confirm Reset is visible
and hit-testable with collapsed sections, reachable with long expanded content,
and opens its confirmation by a real pointer click. No horizontal overflow.
The existing sync browser tests now use pointer clicks instead of the prior
keyboard workaround. All fixtures are synthetic and no production was changed.

Candidate remains local, without commits, push or deployment.
