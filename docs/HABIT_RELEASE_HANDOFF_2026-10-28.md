# Habit changes — final release handoff

This supersedes earlier frontend candidate identities in the reports. Physical/real QA evidence is retained with its original tested identity and exact scope.

## Exact base and candidate

Application integration checkpoint: `4709f86d9b2e1d2c95fa25868b7e576ef415d7a8`.

- Latest main reviewed: `9d4de5bd66492bba55b834d8404c03490bbd3db8` (approved Core Routines START modal and LOG timer orb).
- The new main changes after `6529de6`, including Core START and PRs #18/#19, are integrated locally, preserving all habit/history fixes and the complete already-published Core Routines implementation. HTML/template conflicts were limited to generated app references and resolved by the normal rebuild.
- Candidate HTML SHA256: `b25f6eb684c0db00a20e1105d05c54b61cebba25d80e086998d07cd0ff776b71`.
- JS: `assets/app.61d38c1f02625a8f.js`; CSS: `assets/app.448b3db19a6574cf.css`.
- Application source diff against new main remains surgical: JS **36 added / 18 removed**, CSS **24 added / 24 removed**. Core Routines execution semantics are preserved from main. The obsolete CSP routine test now checks the approved Next control and close-with-session-retained behavior; Move to End and discard controls were deliberately removed upstream.

## Validation and evidence

Evidence folder: `qa-habits-2026-10-28/release-pr-20/`.

- Latest full Chromium result: **380 passed, zero failed/skipped/cancelled** (`all-tests.log`), including upstream Core START browser and regression suites.
- Focused WebKit: **23 passed**, no failures/skips; dated habits, native-select keyboard flow, reload, offline retry, conflict choices, mobile disclosure and exact-main visual parity.
- Eleven habit/history/scoring/auth/persistence function bodies remain identical to the prior real-validated candidate (`continuity.json`).
- Existing real QA results: 11 temporary-day checks and 11 isolated-configuration checks passed; all original A/B rows preserved and both temporary scopes removed. No new QA or production data mutation was performed during this final integration.
- Owner confirmed Safari on iPhone 17 / iOS 27: native habit level change survives reload; repeated settings disclosure, text/keyboard access and rotation/no lateral overflow work. This was the preceding candidate. The habit controls and core persistence functions are unchanged in this integration; the newly published Core Routines timer has its upstream approval and current automated coverage, not a new physical-device certification here.
- Production OAuth return URL/provider configuration was inspected with explicit read-only authorization. No new interactive Google login was performed.
- Latest published HTML and all 18 public/transitive linked assets match main 9d4de5b; all declared SRI checks pass. Candidate direct assets and generated source hashes match (`asset-audit.json`, GET-only).
- Current production rollback archive contains **80 verified Git files**, pinned to 9d4de5b. Its path and SHA256 are in `rollback-verification.json`. This is frontend recovery only; no settings/data rollback and no new database migration.

During the preceding Core START integration, three initial failures were stale test expectations: the retired Next summary/compact timer markup, a routine title still pointing to Work instead of its synthetic runner, and a DOM-free navigation test missing the new dialog synchronizer stub. These test adapters were corrected while retaining injection, account isolation and navigation assertions. That complete 378-case run passed; the latest integration now passes all 380 cases. No app workaround was introduced for those failures.

## Release boundary

Draft PR [#20](https://github.com/trypartylol-max/shaah/pull/20) delivers this candidate for concrete review. Eight historical binary screenshots remain local after an automatic permission-review timeout; all application/source/test and text evidence bytes match the validated local tree. The remote commit is a connector-created snapshot, so its SHA differs from the local application checkpoint. Do not merge or deploy before the owner authorizes publishing this exact proposal. Recheck base/head identity immediately before any authorized merge; never overwrite a newer main or reuse stale artifact hashes. The local phone preview server has been stopped. Production has not been changed by this task.
