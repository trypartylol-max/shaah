> Superseded by [current release validation](HABIT_RELEASE_VALIDATION_2026-10-27.md). The 28 failures below were subsequently closed; the latest integrated local suite passed 363/363.

# Habit timeline safety — historical local validation, 2026-10-27

## Decision

The requested changes have passed their targeted tests. The full release gate has NOT passed: 28 existing failures remain. No push, merge, deployment, database change or production-data mutation was performed. Do not replace production with this candidate yet.

## Source and deployment identity

- Branch: `fix/habits-timeline-safety`.
- Initial inspected base: `b9855b6ff4ac5d8390aeecf46c2a55b33df6f6e5`.
- Main advanced during validation. The branch was rebased onto `60b4f66b4cd69a0c3bf654992f349267c11c7e9e`, retaining the new Today desktop/type styles and their browser regression.
- Source implementation commits after rebase: `9e772c5` and `7681aab`. Earlier reported commit `4105f5f` was rewritten by this local rebase.
- Final fetch still found main at `60b4f66`.
- Public Pages HTML SHA-256: `9c8cb85ef5f3ed451eec61ee1c1734336e944ae964e2fb39b0ff6441b78b1bb5`, byte-identical to main. All 12 directly linked local script/stylesheet assets were fetched and matched that commit. This is stronger than the initial HTML-only parity check; font files imported from CSS were not independently fetched by this audit.
- Candidate HTML SHA-256: `80f6e45f0dc5f75e2fe84dfba5e1a2c5a7c0a6da8f7263869043a6e6d86f6930`.
- Candidate application asset: `assets/app.474132f7b8d5e5fa.js`, SHA-256 `474132f7b8d5e5fa5eed54583cc2ecba77c01c84c33584c1fa1aa1685fe4f1fd`.
- All declared SRI hashes in the 12 directly linked candidate assets match. Some pre-existing optional styles/scripts do not declare SRI; the audit records this rather than treating absence as hash validation.
- Repository Master Handoff matches the read-only synced reference. No files under `sources/` were edited.

## Implementation and reviewed diff

`source/app.js` has 30 added and 13 removed lines against main. No application CSS, authentication, queue, schema, migration or backend implementation was changed.

- `weekReview` evaluates each date through `cfgForDate`. Eligible days, including unlogged eligible days, form the denominator. Paused/removed habits still participate on their earlier eligible dates. Completion uses `doneFrac`; averages and best-day ranking use normalized daily percentages.
- During validation, Stats was found to still display `/7` for consistency cards. Both cards now display the dated eligible denominator; the best-day label also uses normalized percentages.
- `cfgEdit` rejects edits during authenticated settings loading/conflicts and rejects invalid calendar dates, malformed era headers and duplicate date keys. It sorts before editing, replaces today's era deterministically, preserves future snapshots and rolls back callbacks that throw.
- `cfgLevel` accepts only integer levels 1–3, preserves the original habit ID, points, order, routine metadata and day records, and leaves previous/future eras intact. Combo stays in Level 3. Existing scheduled future eras can supersede today's change; that behavior is tested and intentional.
- Settings exposes a CSP-registered native level selector, placed below the order arrows to avoid consuming another horizontal column. Visible controls are tested at 320, 390, 879, 880 and 1440 pixels. Small-screen text inputs remain narrow, as in the base layout; this was not a Settings redesign.
- `index.html` and the new content-addressed app asset were rebuilt with the existing generator. All base assets remain. The unused intermediate asset created earlier on this branch was removed from the final tree.

Supporting files:
- `tests/habit-timeline-regression.test.cjs`: historical/current/future configurations, pause/add/reweight, fractional completion, normalized scores, zero maximum, modes, rollback, invalid timelines, load/conflict protection.
- `tests/habit-level-browser.test.cjs`: 10 responsive/skin cases plus failed-save reload/retry, two-session conflict/resolution and actual Stats labels.
- `tests/csp-events-browser.test.cjs`: updates the four obsolete flows to current Social, explicit Work-point fields and a synthetic general routine; six CSP cases now pass. The routine test uses a synthetic Level 1 routine rather than the Work milestone editor.
- `tests/csp-styles-parity-browser.test.cjs`: replaces an unavailable `/workspace/...` baseline with a verified Git export of exact main. Both renderers receive identical weekly-review data for presentation comparison, and only the intentional new selector is temporarily removed for geometry comparison. Independent tests check actual new review values and visible selector layout. This is parity with current main, not certification of every legacy version.
- `tests/browser-helpers.cjs`: removes the hardcoded legacy font CSS path in favor of a fixture-relative/explicit path.
- `qa/prepare-habit-baseline.cjs`: exports exact main and verifies the baseline HTML hash. It writes only ignored local test files.

The reviewable source/test patch is in `qa-habits-2026-10-27/final/review.diff`.

## Results

| Check | Result |
|---|---|
| Production build, JavaScript syntax, diff whitespace | Passed |
| Unit/regression files | 160 passed, 0 failed |
| Complete candidate suite | 352 tests: 324 passed, 28 failed, 0 skipped/cancelled |
| Habit level browser cases | 13 passed |
| Updated CSP event cases | 6 passed |
| Main-screen style/geometry comparisons | 6 passed across Classic/Matrix/Minimal, mobile/desktop, with the explicit comparison normalization above |
| Failure-control run in intact main checkout | 53 tests: 25 passed, the same 28 failed |
| Failure-name comparison | Identical; no candidate-only failing case |
| First diagnostic comparison | Identical for all 28 after ignoring elapsed timeout milliseconds |
| Public HTML/direct asset identity and declared SRI | Passed |

Tests use local Chrome and synthetic backend responses. HTTP and WebSocket requests outside the local fixtures are blocked by the browser helper. The dedicated public asset audit uses read-only GitHub Pages requests, not Supabase.

Example reproduction, with an available Node >=22 and installed dependencies:

```sh
node --check source/app.js
python3 scripts/build-production.py
CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node --test --test-concurrency=1 tests/*.test.cjs
node --test tests/*regression.test.cjs
```

The default project test scripts already use per-file isolation and serial file execution. An earlier progress note incorrectly attributed `--test-isolation=none` to the current repository script; that flag had been supplied manually in the initial run. It is not used in the final validation.

## Remaining failures and release risks

All 28 failures also reproduce in the intact main control. Matching names/diagnostics establish that these observed failures are not introduced by this branch; they do not establish that the failing behavior is harmless or that the program has no other defects.

| File | Failures |
|---|---:|
| `core-unboxed-browser.test.cjs` | 1 |
| `location-browser.test.cjs` | 9 |
| `matrix-icons-browser.test.cjs` | 1 |
| `security-browser.test.cjs` | 4 |
| `session-isolation-browser.test.cjs` | 1 |
| `settings-list-browser.test.cjs` | 2 |
| `social-browser.test.cjs` | 5 |
| `social-location-access-browser.test.cjs` | 1 |
| `social-mobile-layout-browser.test.cjs` | 1 |
| `steady-remote-skins-browser.test.cjs` | 2 |
| `supabase-guard.test.cjs` | 1 |

Many wait for earlier Social/Settings controls; others fail assertions involving routine metadata, appearance, account-session state or write counts. They require individual triage, not blanket dismissal as obsolete tests. Exact diagnostics are in `remaining-failures.json` and both complete logs.

The QA harness refuses its temporary HTML because a production reference remains. This safety guard was NOT bypassed. Consequently, this work does not certify live QA persistence or production backend permissions. Synthetic tests cover failed saves, retry, refresh, account isolation and concurrency; they do not prove real RLS, OAuth, realtime publication, cross-device durability or backup durability.

Real iOS input zoom, the native select popup on physical mobile devices, and full legacy parity remain unverified. Headless Chrome verified select changes and keyboard focus/Tab, not physical-device keyboard or touch-picker interaction. Timeline validation checks date/era headers, not every form of corrupt imported configuration. Rejected edits have no new explanatory user notification. Unrelated historic repair/migration issues in the Master Handoff were not expanded into this patch.

## Next gate and rollback preparation

Before deployment: triage/resolve the 28 existing failures, repair the isolated-QA fixture without weakening its production guard, complete backend checks and real-device validation required by the Master Handoff, then rerun against the exact merge candidate. Any later main changes require another integration review.

The known published rollback reference at this inspection is `60b4f66`. Preserve its exact Pages HTML/assets and verify public hashes after any eventual rollback. If deployment is later authorized, use an isolated QA build first; merge/deploy only after the gate passes. No rollback or deployment command was executed here.

# 🚨🚨🚨 ALERTA CRÍTICA — NO SUBAS / NO REEMPLACES TODAVÍA 🚨🚨🚨

Artifact: this branch's `index.html` and `assets/app.474132f7b8d5e5fa.js`, based on exact main `60b4f66`. Targeted checks passed, but 28 full-suite failures and the real backend/device checks remain open. Replacement is not certified safe. Daily/configuration data was not modified remotely.
