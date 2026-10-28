# Isolated configuration validation — passed and cleaned up

Application checkpoint remains `f451b0e`, based on main `b0e8d7470288e1349bfb0a909b2847757868dbb9`. No app bundle or deployment changed. Following the owner's explicit authorization, a separate temporary namespace was created in the existing SHAAH-TEST project, exercised with synthetic data, and removed. Existing QA A/B application rows were preserved.

## Real-server result

**11 authenticated checks passed**, using the actual candidate app, pinned SDK, real QA Auth/REST/RPC and Realtime. The local test copy changed only its destination table/RPC names; it was not published. HTML SHA256 remained `c7ee61cba5eede92e37d09123fc7e9712e0c62eb0b17b8eac6e499febd930621`.

- Synthetic configuration and dated history were stored only in the new table.
- Anonymous access, both directions of cross-account reads, and a mismatched request owner were rejected. Direct settings overwrite was blocked.
- Two simultaneous saves using the same revision produced exactly one success and one HTTP 409. Stale recovery was rejected; valid recovery advanced the revision and preserved backups.
- Moving meditation through the actual Settings control saved to the server and survived reload, preserving its ID/metadata, all day records, past eras, future era and historical scores.
- Separate sessions merged disjoint edits after a connection failure.
- Conflicting habit levels retained both choices, blocked further edits, survived reload, and resolved through the real confirmation UI.
- Choosing saved settings retained the discarded local version in a backup.
- A real Realtime settings update reached its own account without appearing in the other account.
- Complete original QA A/B row hashes matched before and after, including the final preservation check. No original-table writes, production requests or app runtime errors occurred. Two socket errors occurred while deliberately disconnecting a test session; subsequent reconnect/merge/conflict checks passed.

Evidence: `qa-habits-2026-10-28/config-probe/real-report.json`. The raw runner report says cleanup pending because deletion deliberately happens separately after catalog inspection. `cleanup-verified.json` is the final cleanup result.

**Cleanup verified:** temporary public table absent, private schema/history absent, zero temporary public functions and zero publication entries. The connector returned `Invalid or expired requestState` on two raw cleanup calls and one migration call. The exact guarded SQL was then executed successfully in the already-authenticated SHAAH-TEST SQL Editor. Independent catalog queries confirmed removal; no cleanup migration history entry was created. Screenshot: `qa-habits-2026-10-28/config-probe/cleanup-confirmed.png`.

Six existing QA protocol function bodies matched the repository migration bodies exactly before setup (`live-protocol.json`, `protocol-comparison.json`). Final advisors returned to the pre-test findings: informational private tables with no direct policies and the existing [leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Neither Auth settings nor existing schemas were altered to address unrelated findings.

## Completed locally

- Added offline generator `qa/supabase/config-probe-plan.cjs`. It accepts only the SHAAH-TEST project reference and a strict 16-character hexadecimal run identifier.
- Generated reviewable `install.sql`, `cleanup.sql` and `manifest.json` in `qa-habits-2026-10-28/config-probe/`. Installation and cleanup have now been executed. The generator itself has no network client.
- The proposed isolated table and private revision history use fresh names. The three existing settings-protocol migrations are reused with namespace substitution; their source hashes are recorded. Existing application settings and accounts are not copied or reset.
- The proposed table has ownership policies, RLS, no anonymous access, and the same revision-conflict and request-owner checks. Creation is transactional and fails on name collisions. Cleanup checks run identity and uses explicit drops without CASCADE, so unexpected dependencies abort the transaction.
- Focused rerun: **26 passed, zero failed/skipped/cancelled**, including browser habit-level persistence, historical/future era preservation, two-session conflicts and reload, plus three offline generator safety checks. Log: `qa-habits-2026-10-28/config-probe/local-tests.log`.
- Subsequent focused safety check: **19 passed**, covering the generator, canonical integrity hashes and QA destination guards (`safety-tests.log`). These overlap with earlier tests and are not a new full-suite total.

The initial local browser attempt omitted the installed Chrome path and could not launch the browser. The corrected invocation used `CHROMIUM_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` and passed all 26 cases. This is an environment correction, not an application fix.

## Procedure followed

1. Obtain authorization for the new temporary namespace. The previous permission was limited to one temporary day and has already been consumed and cleaned up.
2. Recheck QA schema/advisors and current protocol definitions; compare against the recorded migration sources before creating anything. If different, stop and revise the plan.
3. Review and install the generated SQL only on `kpnwiwaiwnndpvtxkvva`. Inspect created ownership/grants/functions and verify the Data API schema refresh.
4. Adapt the existing real-backend browser harness to a strict allowlist of this run's table and three RPCs. Retarget only the local candidate's table/RPC references; do not deploy or modify the published QA Site. Preserve original QA A/B rows with before/after content hashes.
5. Seed synthetic configuration only in the new table. Verify habit ID/history/future eras after move/save/reload; disjoint concurrent edits; conflicting edits with explicit resolution; stale revision rejection; owner/anonymous isolation; actual Realtime behavior.
6. Verify original QA A/B rows unchanged. Remove only the run's resources using the guarded cleanup, confirm absence from catalogs/publication and retain sanitized results. If cleanup aborts, report remaining names and do not broaden deletion.

## Limits and risks

The SQL was compiled and exercised by PostgreSQL; the new `run-config-probe.cjs` executed the browser scenarios. Tests on the copied, verified protocol establish configuration persistence in an isolated namespace without writing existing settings; they do not claim a write to the actual QA `day_logs/settings` row. Production/QA schema differences remain as recorded in the release report. Physical iPhone validation and a final check against the deployment candidate remain open. No deployment approval is implied. Do not rerun against the old manifest without checking absence and explicitly preparing a new authorized test run.

Reference documentation checked during preparation: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [database functions](https://supabase.com/docs/guides/database/functions).
