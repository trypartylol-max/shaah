> Superseding frontend review: [2026-10-28 integrated candidate](HABIT_CANDIDATE_REVIEW_2026-10-28.md), based on main 6529de6, with 370 Chromium and 23 WebKit checks passed, public asset parity, read-only OAuth configuration inspection and verified local rollback archive. Physical iPhone remains open; no deployment occurred.
>
> Update 2026-10-28: the owner authorized the single QA-day probe (11 real checks passed, row removed) and subsequently the separate synthetic configuration namespace (11 real checks passed, namespace removed and independently verified absent). Existing A/B rows were preserved in both. See [write-probe report](HABIT_WRITE_PROBE_2026-10-28.md) and [configuration results](HABIT_CONFIG_PROBE_2026-10-28.md). Earlier pending-authorization/no-mutation/configuration-gate statements below describe the historical pre-approval state.

# SHAAH habit release validation — current result

## Result

The four habit tasks and the 28 previously failing regression cases are closed in the local candidate. The final integrated run passed **363/363 tests, with zero failures, skips or cancellations**. Production has not been changed by this chat.

Implementation is on `fix/habits-timeline-safety`, integrated with main **b0e8d7470288e1349bfb0a909b2847757868dbb9**. Code checkpoint: **a77e867**. Earlier local commit IDs were rewritten when integrating the separate Work milestones and Original Work geometry releases. Do not use the earlier reports' commit IDs as the current release identity.

## What changed for the app

The original changes remain: dated weekly review, safe `cfgEdit` boundaries, and moving habits between levels while retaining IDs/history. Follow-up validation corrected:

1. Bulk group search lost typed characters because a repaint closed its native details panel. The panel now preserves its open state during Settings renders, including keyboard typing and selection.
2. A contact with a retired/unknown category could not save a group edit. Its existing category can now be retained, with its relationship, unknown group references, custom metadata and historical encounters preserved. Assigning a new invalid category remains rejected.
3. Some newer Social/Core styles used raw Classic colors. They now use the existing skin variables, preserving the exact Classic fallback colors and integrating with Matrix/Minimal. Glow-specific artwork was left intact. No dimensions or responsive rules were changed by this palette fix.
4. The isolated QA fixture rejected the new production-only migration guard's second URL literal. Only that exact, counted guard is retargeted in the temporary copy. Any additional production reference still aborts. Production HTML and the network allowlists are not weakened.

The latest Original Work geometry from main was retained. Existing progress-bar presentation tests explicitly run on the non-Original skin where that presentation remains; the new Original Work suite covers its native button, adaptive shapes, click/keyboard/touch activation, points, persistence and skin switching.

## Regression repair was not 28 product fixes

The 28 failing cases were triaged individually. Most used retired Social/Settings controls, assumed pre-migration inactive profiles, selected a routine by unstable object position, compared against unrelated older CSS, or counted writes across a browser reload even though the synthetic logger resets on reload. They were updated to exercise the current UI while retaining data, identity, scoring, reload, RLS-boundary and keyboard assertions. Obsolete Inactive UI was not reintroduced: tests verify the already approved restoration migration retains identities and assigns the intended frequency.

Source diffs against main: `source/app.js` (36 added / 18 removed lines), `source/app.css` (24 changed lines), `qa/supabase/guard.cjs` (6 added lines), updated browser fixtures and tests, and a new optional authenticated checker. The generated CSS/JS and `index.html` were rebuilt with the normal content hashes and SRI. No schema, RLS, Auth configuration or backend function was changed.

## Final evidence

Evidence directory: `qa-habits-2026-10-27/hardening/`.

- `all-tests-integrated.log`: final uninterrupted integrated suite, **363 passed / 0 failed**.
- `work-integration.log`, `glow-integration.log`: focused coverage of the separately published Work update and retained skins.
- `real-qa-readonly.json`: **9 real authenticated checks passed** using existing QA A/B.
- `asset-verification.json`: published Pages HTML and all 12 directly linked assets match main b0e8d74. All declared candidate SRI hashes match. Some pre-existing optional assets have no declared SRI; absence is recorded rather than called a successful hash check. Fonts imported by CSS were not independently fetched by this audit.
- `qa-schema.json`, `production-schema.json`: read-only catalog evidence for RLS, owner/date uniqueness, restrictive settings policies, authenticated RPC grants and Realtime publication.
- `qa-public-preflight.json`: real QA Auth settings returned 200; anonymous table access returned 401, requesting zero application rows and performing zero writes.
- `private-qa-site.json`: the existing Site is owner-only (custom audience, one allowed owner, no groups), version 35. Its publication and access were not changed.
- `WRITE_PROBE_PLAN.md`: exact pending scope for one temporary QA write test.
- `review.diff`: reviewable source/test diff without generated application bundles.

Earlier runs and reports are historical. One integrated run exposed six stale Glow comparisons after Original Work changed, then the corrected Glow cases passed 6/6. Another run accumulated 16- and 53-minute waits in browser operations and was cancelled; it does not count as passing. The final uninterrupted 363/363 run is the result above.

Candidate identities:

- HTML SHA-256: `c7ee61cba5eede92e37d09123fc7e9712e0c62eb0b17b8eac6e499febd930621`.
- App: `assets/app.7ec01d955365977a.js`.
- CSS: `assets/app.c6e54b40480c5759.css`.

## Existing QA accounts: no passwords needed from the owner

The user correctly identified QA A/B already available in the TEST chat. Their credentials are held in the private Site's runtime secrets. The earlier local `--check` result only showed that the separate empty-account seeding runner lacked environment values; it did not mean the owner needed to supply credentials for the published QA profiles. The unused blank local credential template was removed.

This session retrieved supported Site service access through the Sites connector. That proof was kept in memory and sent only to that exact Site, through hidden stdin to the checker. The Site returned normal QA user sessions, not passwords or privileged Supabase keys. Supabase received only its public key and ordinary QA user JWTs. No service credential, password, session or existing row content was written to these evidence files.

The checker loaded the **local candidate**, not a new deployment, with real QA sessions. It verified authentication for A/B, RLS denial in both cross-account directions, anonymous denial, live Realtime subscription, actual A→B→A account changes, mobile/desktop rendering and exact preservation of all existing QA rows. Nine checks passed, zero application writes were forwarded, and no production requests were sent by the checker.

Important scope: the read-only guard blocked **three `shaah_save_settings_v1` requests** and the candidate retained a local pending configuration. This controlled run therefore does **not** certify the persistence of startup/configuration updates. It confirms authenticated reads, account boundaries, rendering and preservation. An isolated configuration-write/conflict test remains part of the release gate; the two published profiles must not be reset or reseeded to obtain it.

## Backend inspection limits

Both QA and production have RLS enabled on `day_logs`, authenticated ownership predicates for all four operations, restrictive rules requiring settings writes through RPC, owner/date uniqueness, and a `supabase_realtime` publication entry. Production additionally uses a legacy identity primary key; its separate owner/date unique index is present. The schemas are not claimed identical.

The public wrappers are security invokers; private save/restore/backup functions have an empty search path, use `auth.uid()`, and have explicit authenticated grants. This metadata review did not execute writes, modify policies, or query production application rows. It is not a substitute for real client mutation and event-delivery tests.

The existing advisor warning about [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains a platform configuration item. Informational no-policy notices concern private recovery/backup tables; no grants were added in response. Google OAuth redirects and physical iPhone behavior were not revalidated in this session.

## Authorization boundary and remaining gate

The automatic approval review rejected the proposed `--write-probe` execution: the trusted initial instruction explicitly said to avoid touching Supabase data, and did not clearly authorize a real QA insert/delete. No such probe was executed, and no workaround was used. An explicit approval question for that exact action is pending.

Prepared scope, only if approved: one preflight-absent future day in QA A, claimed by a normal INSERT that rejects duplicates, uniquely tagged per run, verified through online save/reload and offline/reconnect, then deleted only with owner/date/full-data equality. Existing day rows, settings, backups, QA B and production are excluded. If anything changes the probe unexpectedly, retain it for review rather than delete it. The script must not reset or seed either existing QA profile.

Remaining before deployment:

- User decision on the single temporary-day write probe; if approved, execute it and retain its report.
- A separately isolated configuration-save/migration/conflict exercise; do not overwrite existing manual QA settings merely to turn a test green.
- Physical iPhone checks for native inputs/select, zoom, keyboard/touch and supported responsive layouts, plus any remaining OAuth/legacy-parity gate in the Master Handoff.
- Review the exact merge candidate against any main changes after b0e8d74 and prepare rollback to the verified published artifact.

No push, merge, deployment, Site edit, account provisioning, destructive seed, application-data mutation or backend configuration change was performed by this chat. Normal QA Auth sessions were created for the authorized read-only checks.

# 🚨🚨🚨 ALERTA CRÍTICA — NO SUBAS / NO REEMPLACES TODAVÍA 🚨🚨🚨

The local regression gate is green. The real write/configuration/device gate is incomplete. Replacement of production is not certified safe yet.
