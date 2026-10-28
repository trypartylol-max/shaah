# Candidate review after isolated QA validation

## Identity and integration

Integrated candidate commit: `a4d98ab89c78dc5e1848d821c481e199c22cb600`. Static deployment archive and SHA256 are recorded in `qa-habits-2026-10-28/release-candidate/summary.json`; it contains only this commit’s index and assets.

Reviewed remote main: `6529de614f3d0d75728add5ddf99c94ffde40b9f`, obtained through the GitHub connector and fetched by exact SHA. It adds 14 commits after the previously tested main `b0e8d74`: mobile width/layout/disclosure fixes and WORK geometry shared across skins, including completion lighting.

The local candidate integrates that exact main with the previously real-tested checkpoint `b0f66f9`. No push, remote merge, production deployment, Site publication or Supabase mutation was performed during this follow-up. The repository merge is local only.

Main changed its generated app directly while leaving `source/app.js` behind. The integration transfers its two behavior changes into source (shared WORK markup and preserving its DOM on theme changes), retains the new CSS/scripts, then rebuilds hashed assets. The HTML conflict was resolved around the generated app reference, keeping the habit fixes and all new main asset links. Source templates now retain those links on a rebuild.

- Candidate HTML SHA256: `c56752c95bf3f27cd89360ebd0dcf47617c824cea8039ebca1ff7b9df0ebc048`.
- Candidate app: `assets/app.0f84f7616010a1ed.js`.
- Candidate CSS: `assets/app.c6e54b40480c5759.css`.
- Previous real-validated checkpoint remains `b0f66f9`; its evidence was not overwritten.

## Validation

Evidence: `qa-habits-2026-10-28/release-candidate/`.

- Full Chromium suite: **370 passed, zero failed/skipped/cancelled** (`all-tests.log`).
- Focused integration: **21 passed**, including WORK milestones, dated persistence, all skins and local historical backup parity (67 days across three accounts; no production rows queried).
- WebKit 26.5: **23 passed**, covering habit-level selectors/keyboard/history/future eras/reload, connection failure and retry, conflicts and explicit resolution, mobile disclosure and exact-main visual parity.
- New disclosure tests: **2 passed** at 390 and 879 px, including keyboard control, actual hiding and preservation of configuration/day records/scores.
- Eleven core function bodies remain byte-for-byte equal to the real-tested checkpoint: config edits/level changes, weekly review, dated configuration/scoring, sign-in/out, day/settings persistence, conflict resolution and the existing startup migration (`real-validation-continuity.json`). The integration changes presentation and disclosure, not those persistence algorithms. No extra remote write test was needed for unchanged functions.
- Public deployed HTML matches pinned main, and all **17** referenced/transitive local assets match its Git bytes (`asset-audit.json`, 18 GET requests, zero writes). All declared SRI hashes match. Optional files without SRI are recorded as `not_declared`, not counted as SRI checks.
- Candidate's 17 direct asset references resolve locally; declared SRI and generated app JS/CSS hashes match their source files. `qa/verify-release-candidate.cjs` makes this audit reproducible and GET-only.

The first integrated run had two failures in the newly added test's `.t-rout-head` selector. The actual control is `.t-rout-toggle`; both cases passed after correction. The first WebKit run passed 19/23, with its four optional screenshot cases reporting CSP violations from Playwright screenshot synchronization. The functional assertions passed. Screenshots are now collected in Chromium only; WebKit retains strict CSP and the complete functional assertions. No application CSP or error checking was relaxed. Initial logs are retained with `-initial` names.

## OAuth inspection, read only

After explicit owner authorization, the production Supabase dashboard configuration pages were inspected without opening users or provider credentials and without changing settings. Site URL is `https://trypartylol-max.github.io/shaah/`; both that exact URL and `/shaah/**` are in the return allowlist. Google is enabled; the unchanged client uses `location.origin+location.pathname`. Existing Netlify/local preview entries were recorded without modification. Evidence: `oauth-config-readonly.json`.

This verifies configuration consistency, not a new interactive Google login or the Google Cloud client configuration. No real account sign-in was performed.

## Rollback prepared, not executed

The current published frontend is preserved locally at:

`.runtime/release-candidate/rollback-6529de614f3d0d75728add5ddf99c94ffde40b9f.tar`

SHA256: `c01e2b93609f4a848cc445e4f321a7accebe2f74b646d79e1be3fa63942ebcca`. All **74** archived files were compared with the pinned Git commit; all match (`rollback-verification.json`). It includes the complete original `index.html` and `assets/`, not credentials or account data.

If a future authorized deployment must be rolled back, publish that verified frontend through the normal hosting workflow and recheck public asset hashes against the pinned commit. Do not restore database rows, reset account settings, rewrite Git history or deploy the QA adapter. A frontend rollback does not undo users' legitimate habit moves or their data. No rollback or deployment has been executed here.

## Physical phone gate

Prepared `qa/phone-preview.cjs` and [the iPhone checklist](HABIT_IPHONE_CHECKLIST.md). The preview is a snapshot of this candidate plus the existing synthetic browser SDK; its CSP blocks every network connection. Its separate Chrome verification passed actual Settings level change and reload/history preservation with **zero external requests and zero runtime errors** (`phone-preview-check.json`). It uses synthetic data and a fixed fixture date, with a visible warning.

Only a loopback verification server was started and stopped. No LAN server or public/private hosting deployment was started. A physical iPhone still needs the native picker, keyboard/zoom, touch, safe-area/orientation and reload checks. Desktop WebKit does not certify those device behaviors. The checklist explains how to serve the synthetic copy temporarily from the Mac when the owner has the phone available.

Follow-up during the owner's physical-device session: the owner confirmed readiness, and the synthetic preview was opened on the local network only. A reported unresponsive Settings UI was reproduced with real touch events: the preview's frozen `Date.now()` made the app's existing 300 ms touch guard cancel every later touch. Fixed only the preview clock to advance with elapsed time, preserving the synthetic calendar date. Repeated touch controls, level save/reload and historical preservation then passed in both Chromium and WebKit, with zero external requests/errors. The initial click-only check did not catch this fixture defect. Evidence: `phone-touch-before.json`, `phone-touch-chromium.json`, `phone-touch-webkit.json`. Physical acceptance must be repeated on the corrected preview; the production candidate remains unchanged.

## Release decision

The owner subsequently confirmed the requested physical checks in **Safari on iPhone 17 / iOS 27**: move to level 3 survives reload; repeated habit disclosure, text/keyboard controls and rotation/no lateral overflow respond correctly. Evidence is user-reported in this chat, not device automation. All skins/WORK, historical comparison, safe areas and reduced-motion settings were not individually confirmed on that device. See `iphone-user-result.json` for precise scope. The local preview server was stopped and verified closed.

Keep production unchanged until the release decision. Recheck the remote main/deployed identity and obtain deployment authorization before a future merge or deployment. A new interactive Google login remains untested in this follow-up. These results do not imply deployment authorization or that future changes to main are covered by this candidate's evidence.
