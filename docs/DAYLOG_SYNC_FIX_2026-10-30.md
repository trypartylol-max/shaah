# Day Log completion synchronization — 2026-10-30

Later clarification: see `DAYLOG_PRODUCT_RULES_2026-10-30.md`. Concurrent
activity totals are valid; automatic overlap subtraction is not required. The
mobile Reset obstruction noted below has since been fixed and pointer-tested.
The subsequent `RESET_DAY_FULL_CLEAR_2026-10-30.md` replaces the Reset rule below:
explicitly confirmed Reset now deletes manual activities and all other day data too.

Local candidate on `9933adf278a06bdee2fc0e1e3fc0dad896830a68`, including
the preceding Day Log entry fixes. No commit, push, deployment or production
data access. No scoring formula, configuration era or backend change.

## Rules implemented

- Individual and bulk completion of ordinary habits use linked events. Clearing
  removes their completion links, including duplicate links for the same habit.
- Partial Work milestones retain one event and update partial/full metadata.
  Existing start/end times are preserved when credit changes.
- Social creates one Combo event when Combo becomes checked. More contacts do
  not create duplicate Combo events. Existing category/contact scoring semantics
  are retained: removing a person does not automatically undo a checked category.
- Reset clears completion links, including stale links to removed habits, while
  preserving manual activities and independent records of routines ended early.
- Historical edits update existing linked completion metadata or remove links
  when explicitly cleared. They never create timestamps or close today's timers.
- Bulk Sleep completion changes credit without inventing Wake/Sleep timestamps.
  The remaining individual Sleep/Wake legacy metadata issues are a separate task.
- Deleting an event in Day Log preserves habit credit. This keeps the existing
  distinction between deleting a timeline record and undoing the activity.
  The user asked for a recommendation; this conservative default was explained.
- There is no load-time backfill, blanket migration or historical rewrite.

## Test approach

The new regression suite covers bulk on/off, reset with stale links, preservation
of manual/early-ended records, fractional milestones, historical edits without
fabricated times, Social deduplication, deletion without lost credit and bulk
Sleep without invented timestamps. Browser tests exercise the real delegated
level control, confirmed Reset, synthetic persistence and reload at 390/1440px.

The old timer baseline mixed root completion flags with nested metadata and could
retain light=true after completion. The parity test now compares canonical flags
and continues to assert original event IDs, titles, types, times, all other day
state, scores and session closure. Only the intentionally changed completion
hook is excluded from the old function hash guard; new behavior is tested directly.

The existing timer browser test sampled its entrance scale mid-animation. It
now waits for finite entrance animations before comparing fixed geometry.
Mobile pointer testing also exposed the existing fixed navigation covering Reset;
the persistence test uses its keyboard activation with the normal confirmation.
This candidate does not claim to fix that separate mobile layout issue.

## Remaining work

Individual Sleep/Wake metadata normalization and legacy compatibility, recap and
overlap/open-event calculations, deleted-contact recovery, zero-score-day
analytics, offline cold-start, physical iOS and live multidevice testing remain.

## Final verification

- 198 regression tests passed, including the 9 new completion-sync scenarios.
- 4 early-finish/timer tests passed.
- 17 browser tests passed across the relevant runs: 4 Day Log entry, 2 sync and
  reload, 1 Day Log/History, 9 security controls, and 1 routine test across skins
  and widths. Total: 219 passed, no final failed or skipped test in these suites.
- New sync browser tests used mobile 390px and desktop 1440px. The routine test
  covers 320/390/879/880/1440px and five skins with synthetic data.
- Corrected test-only issues: accepting Reset's confirmation, keyboard access
  where fixed mobile navigation covers Reset, waiting for finite entrance
  animations and scoping routine-menu controls to the active dialog.
- Syntax, whitespace and equality of source/built JavaScript/SRI passed.
  Current candidate asset: `assets/app.0fea8d80c14c4871.js`.
- Tests used isolated synthetic state with intercepted network. Nothing was
  deployed, and no real account activity or backend schema was changed.
