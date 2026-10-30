# Day Log activity summary

Initial base: `783b6b5bb90a96c7be9c53674aefae52ecb90b95`.
Integrated with newer main `fbaf38fb96b3ae91e39f3af64ff8c50b4be0dd0e`,
preserving its optional Pro Mode skin, stylesheet, build support and controls.

User requested continuing the remaining Day Log work. Concurrent activity counts
separately, as explicitly clarified earlier. The user did not choose a daily
window for "unrecorded time" after clarification attempts; that metric is deferred
instead of assuming that unrecorded periods mean inactivity or lost time.

## Behavior

- Log displays Day Summary: total activity time, event count and ongoing count,
  type totals and the longest actual activity durations.
- Simultaneous activities remain additive. One hour of work overlapping one hour
  of family conversation is two activity hours; nothing is subtracted.
- Open activities started today count up to now. An old record with missing end
  remains unknown rather than accumulating days of invented duration.
- Durations use actual timestamps, correctly spanning midnight and UTC offsets.
  Wake/Sleep remain point events with no duration and unchanged scoring.
- Internal gaps use the union of valid recorded coverage, including ongoing
  activity, avoiding false gaps inside a running activity. This preserves the
  old internal-gaps boundary; no all-day unrecorded metric is exposed in the new UI.
- Every 30 seconds, only the visible recap and duration text refresh. The editor
  is not rerendered, so draft values and focus are preserved. No activity writes,
  fabricated end timestamps or historical backfill occur during refresh.
- Read-only summaries do not create missing day rows. The refresh skips hidden,
  signed-out/loading and stale-account panels. Existing scoring/settings/eras and
  routine persistence APIs remain unchanged.

## Validation

The initial candidate passed 217 regression and 24 browser tests. New coverage
includes midnight/offset spans, running duration, old/future/invalid records,
concurrency, false-gap prevention, read-only missing days and account transitions.
Browser cases at 320/390/1440px check totals, live duration updates after advancing
the clock, no horizontal overflow, preserved unsaved input, unchanged day state
and no backend writes. Existing Day Log entry, Sleep/Wake, Reset, security and
account-isolation browser tests passed with synthetic data and intercepted network.

The final integrated candidate passed 217 regression and 27 browser tests,
including the incoming Pro Mode suite. Source syntax, diff whitespace and versioned
asset integrity were checked. Final assets are `app.3d2f3f43b01bf11b.js` and
`app.cb1ace2da4bd29f6.css`.

Further metrics for time not recorded, deleted-contact recovery, zero-score-day
analytics, physical iOS and real multidevice tests remain separate.
