# Social/Core promotion from TEST v28

User authorized production deployment on 2026-10-25. Baseline production main
963eb8a matched the live GitHub Pages HTML exactly before preparation.
TEST remains independent at its v28 commit 11ba11ce.

## Behavior

- Social order: Who to See, Social Combo, People & Groups. Direct directory,
  search, groups and frequency editing; global rules stay in Settings.
- Original category IDs, labels and weights remain. Multiple people can be
  recorded per category; category points are awarded once per day.
- Location focus filters Friends suggestions only. Family remains recommended.
- Romantic assignment capacity defaults to 1; existing excess contacts remain.
- Previously inactive people are restored with frequency 180 days, preserving
  IDs and encounters. Frequency remains individually editable. No status control.
- Today uses full-width Core, then Habits/Bonus/Social, then full-width Note.
  Mobile keeps compact Day Log before Note. Social expands smoothly.
- Work has cumulative phases 10/20/25. The previous scoring timeline is sealed;
  25 starts on each account's migration date. Vacation periods are retained.
- Contact pill: green before due, orange when due, red at 30% overdue (inclusive
  to match the approved 10/13-day example). Fill drains to zero when due.

## Migration and safety

Client configuration migration v1 is `upgradeShaahSocialCoreConfig` in
`source/app.js`, journaled as `shaahSocialCoreMigration`. It runs only after an
authoritative account load, only against the production project, and uses the
existing revision CAS RPC and backup mechanism. It does not update daily rows,
Auth, schemas or policies. No QA sessions, fixtures or TEST credentials are in
the production app. Google OAuth, persistence and score functions are identical
to the baseline (checked by regression).

Before publication, code was bundled and all 74 production app rows exported to
a private local backup outside this repository. Includes IDs, timestamps and
settings revisions; excludes Auth and infrastructure. Server fingerprint:
`6d273fd77b0a6feee927d273b327fc57`. Do not overwrite later activity with this copy.

## Validation

179 local automated tests pass, zero failures/skips. Includes config CAS,
Realtime echo/conflicts, ownership/account switches, settings, import/export,
Work/Vacation, Social behavior, effective dating and source/CSP separation.
All 67 historical days in the three production backup accounts retained their
scores in a local before/after comparison; IDs, categories and daily data match.

Browser review used isolated synthetic data and the candidate product code:
Work 10/20/25, multiple-person Social points, Family across location focus,
smooth reveal CSS, desktop layout and 390px mobile order/no horizontal overflow.
Authenticated personal production sessions, physical mobile and multi-device
live synchronization were not exercised. No personal account was used in QA.

## Build and rollback

`python3 scripts/build-production.py` generates hashed JS/CSS and matching SRI
from `source/`, retaining the production HTML shell and CSP. Previous assets
remain available. Rollback should preserve the current settings revision
protocol and migration journal; do not restore old data over subsequent edits.
