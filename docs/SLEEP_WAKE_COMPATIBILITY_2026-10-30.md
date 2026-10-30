# Wake / Sleep compatibility

Base: published main `b330873a572d6d2b815f560668462a4124bebe10`.
User requested continuing the remaining fixes after the Day Log/Reset release.

Wake and Sleep remain complementary actions sharing the same habit score:
Wake gives half credit, Sleep completes the credit, and clearing removes it.
No scoring formulas, mode weights, eras, settings or backend schema change.

## Corrections

- New Wake/Sleep events write canonical nested metadata immediately. They no
  longer need an intervening Log render to establish which action happened.
- Legacy root-level roles are recognized, preserving their explicit meanings
  even when their clock times sort in the opposite order.
- A positive-duration legacy range uses its saved endpoints as Wake and Sleep;
  the original range is also retained in metadata. A single untagged point or
  a zero-duration completion cannot prove two actions and is not expanded.
- Ambiguous/reversed/invalid ranges remain untouched. Additional legacy records
  are retained instead of silently discarded. Unclassified extra points display
  RECORDED TIME and editing them does not invent a Wake or Sleep role.
- Normalization compares actual changes and persists once. Reopening Log does
  not repeatedly save an already-normalized day.
- Returning to half credit preserves the actual Wake timestamp and removes the
  complementary Sleep point. Explicit historical edits recognize root roles too.
- Full credit without a recorded Wake does not invent both timestamps at now.
  Bulk/historical completion retain the existing no-fabricated-time policy.
- No startup sweep/backfill of historical days is introduced. Compatibility runs
  through the existing current-day paths and explicit edits. Day rows/checks and
  other dates are preserved by compatibility-only normalization.

## Validation

Final suites: 210 regression and 17 browser tests passed, zero failures/skips.
Syntax and `git diff --check` passed. Candidate JavaScript is
`assets/app.40b0c4f3716c101e.js`, with matching SHA-384 integrity in both entrypoints.

Regression tests exercise the three-tap shared score, canonical and root formats,
legacy range provenance and idempotency, ambiguous/extra records, downgrade,
full-without-time, unclassified event editing and explicit historical edits.
Browser fixtures verify 07:00 Wake and 23:00 Sleep across reload at 390/1440px,
exact event identities/times, half/full points, exclusion from duration/running
activity, clear, and no new writes when reopening normalized Log.

All fixtures are synthetic, and browser networking is intercepted. No production
data is accessed by tests. Physical-device and live multidevice behavior are not
certified by these tests. Further recap, deleted-contact recovery and zero-score
analytics tasks remain separate; concurrent activity totals stay valid.
