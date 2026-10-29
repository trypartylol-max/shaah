# Today desktop TEST

Branch: test/today-desktop-20261029
Current production base: main c31d2a9737945c976dd023bc635266cc047d0022 (read only).
Initial base was aaef3663157b282739e381ef7702524e734f5f3b; it has now been superseded.

Inspected source/index.html, source/app.js, source/app.css, optional skin and responsive assets, and preview documentation. Implementation is an additive desktop stylesheet loaded by the source entrypoint and generated index. No application logic, handlers, configuration, storage keys, historical data or backend were changed. Existing native navigation becomes a sidebar from 1180px; below that the current tablet/mobile layout remains. Core routines, levels 2/3, Social Combo and Day Note use their existing live markup.

Browser checks use the existing isolated synthetic backend, never live user records. They cover responsive widths 320–1920, column geometry, native Log navigation, routine credit and runner, habits/history/reload, Day Log and Social contacts.

No branch preview workflow or Vercel/Netlify/hosting manifest exists in this GitHub checkout. qa/preview/README.md describes a separate private Site with a separate Worker/source repository and runtime credentials; pushing this TEST branch does not update that Site. No production deployment or main update was performed. An authenticated preview would retain the existing backend unless separately configured; this branch is code isolation, not a newly provisioned data environment.

The earlier conversation's assistant mockup could not be retrieved as an image (only content-reference markers were returned); implementation follows the explicit approved composition in the user's continuation request.

## Desktop revision 2

Refined charcoal surfaces, visible workspace navigation, SHAAH wordmark, TEST badge, consistent panel headings, and a compact hero with existing score, next grade, completed count and streak. The hero facts use calcScore/getStreak directly. Preserved current skin choices, all action bindings and the mobile composition. Fixed the previous desktop override that could force navigation visible on Settings or signed-out screens. Auth configuration and backend are unchanged in this revision.

Validation: realistic legacy configuration plus all selectable skins, widths 320–1920, routine credit and finish behavior, Log navigation, Settings navigation visibility, note editing, contact editing, and strict CSP interactions. The existing routine test's desktop idle-button color expectation was updated to the intentional new design; its mobile expectation stays gray.


## Production synchronization — 2026-10-29

Merged all 11 upstream commits through c31d2a9737945c976dd023bc635266cc047d0022 into TEST. Confirmed the live GitHub Pages entrypoint references app.88876c70945c5da1.js and ui-refinement hash 132f1247efe5d7ef, matching the fetched production base.

Preserved production Social capsule contrast/label sizing, exact 84px WORK geometry and centered SVG, and Core inline names/metadata plus 56px desktop controls. The proposal gives Core a wider desktop column and uses the existing compact production pattern on smaller desktop widths to avoid truncation.

Source parity check: after removing the single dt-hero-copy markup line, source/app.js is byte-for-byte identical to the production base. source/app.css, ui-refinement, social-capsules and build-production.py are unchanged from production. Auth/backend unchanged.

Validation: all 10 targeted checks pass across the two runs after the Core width correction, and all 9 final interaction/CSP/layout checks pass. Tests used isolated synthetic records. Upstream screenshot/measurement files were restored after test execution, so production QA evidence remains unchanged.
