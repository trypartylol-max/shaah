# Habit changes — final release handoff

This supersedes earlier frontend candidate identities in the reports. Physical/real QA evidence is retained with its original tested identity and exact scope.

## Exact base and candidate

Application integration checkpoint: `b4b5cb5387d97e5dd74dabe481de0c1080048028`.

- Latest main reviewed: `5e42f014d7c5e1c07f8faaaa57d52b1fc73a586b` (approved Core Routines START modal and LOG timer orb).
- The two new main commits after `6529de6` are integrated locally, preserving all habit/history fixes and the complete already-published Core Routines implementation. HTML/template conflicts were limited to generated app references and resolved by the normal rebuild.
- Candidate HTML SHA256: `9f40b9d5755ac8c62141bc245aaab29c9436db8adec89aa381eda5bf63de5cc3`.
- JS: `assets/app.e08867f4c7271da0.js`; CSS: `assets/app.0be129ce330bc295.css`.
- Application source diff against new main remains surgical: JS **36 added / 18 removed**, CSS **24 added / 24 removed**. Core Routines execution semantics are preserved from main. The obsolete CSP routine test now checks the approved Next control and close-with-session-retained behavior; Move to End and discard controls were deliberately removed upstream.

## Validation and evidence

Evidence folder: `qa-habits-2026-10-28/final-release/`.

- Latest full Chromium result: **378 passed, zero failed/skipped/cancelled** (`all-tests.log`), including upstream Core START browser and regression suites.
- Focused WebKit: **23 passed**, no failures/skips; dated habits, native-select keyboard flow, reload, offline retry, conflict choices, mobile disclosure and exact-main visual parity.
- Eleven habit/history/scoring/auth/persistence function bodies remain identical to the prior real-validated candidate (`continuity.json`).
- Existing real QA results: 11 temporary-day checks and 11 isolated-configuration checks passed; all original A/B rows preserved and both temporary scopes removed. No new QA or production data mutation was performed during this final integration.
- Owner confirmed Safari on iPhone 17 / iOS 27: native habit level change survives reload; repeated settings disclosure, text/keyboard access and rotation/no lateral overflow work. This was the preceding candidate. The habit controls and core persistence functions are unchanged in this integration; the newly published Core Routines timer has its upstream approval and current automated coverage, not a new physical-device certification here.
- Production OAuth return URL/provider configuration was inspected with explicit read-only authorization. No new interactive Google login was performed.
- Latest published HTML and all 17 public/transitive linked assets match main 5e42f01; all declared SRI checks pass. Candidate direct assets and generated source hashes match (`asset-audit.json`, GET-only).
- Current production rollback archive contains **76 verified Git files**, pinned to 5e42f01. Its path and SHA256 are in `rollback-verification.json`. This is frontend recovery only; no settings/data rollback and no new database migration.

Three initial failures were stale test expectations: the retired Next summary/compact timer markup, a routine title still pointing to Work instead of its synthetic runner, and a DOM-free navigation test missing the new dialog synchronizer stub. These test adapters were corrected while retaining injection, account isolation and navigation assertions. The final complete 378-case run passes. No app workaround was introduced for those failures.

## Release boundary

Deliver this candidate as a draft PR for concrete review. Do not merge or deploy before the owner authorizes publishing this exact proposal. Recheck base/head identity immediately before any authorized merge; never overwrite a newer main or reuse stale artifact hashes. The local phone preview server has been stopped. Production has not been changed by this task.
