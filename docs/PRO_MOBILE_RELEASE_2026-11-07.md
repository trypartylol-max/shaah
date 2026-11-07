# Pro mobile visual release

The owner approved applying the final mobile Pro demo to the product on 2026-11-07.
Base: 51bd1974a08253fae046b8b9db0803d0e19a5dd5. Retains the latest network safety,
local speed diagnostics, performance work and application navigation icons.

Ported the approved demo's mobile-only presentation into assets/pro-mode.css:
canvas #0c0e18, cards #161927, inset fields #10131f, consistent borders and copy,
subtle violet active states, clearer score track and Log action. Removed the
mixed gradients and nested routine-container backgrounds. The same surface
scale covers Today, Log, Social, Stats, History and relevant overlays.

Every added selector is scoped to html[data-skin='pro'] under max-width:879px.
No layout metrics, markup, application logic, stored settings, scoring, account
records, Auth, backend or desktop behavior are changed. The production build
updates only the Pro CSS query version and SRI in index.html. No demo adapter,
seeded records, fixed demo date or demo shell is included.

Validation: 274 regression tests passed. 18 browser tests passed, zero failures/skips. Browser evidence is in
pro-mobile-release/browser.log. New checks compare every visible element's
geometry with the previous stylesheet, check all five tabs and uniform card
surfaces at 320/375/390/430/879px, verify no horizontal overflow, check other
skins and Pro desktop at 880/1180/1440px, preserve drafts/account data when
switching and persist the selected skin through reload. Existing Pro and skin
suites cover routine/Work interactions, sidebar controls, notes, Reset, semantic
grade contrast and icons. Browser records and network traffic are synthetic.
Physical iPhone and Safari are not covered.

Rollback: revert this release's stylesheet/entrypoint changes and rebuild using
the repository's normal production asset script; no data rollback is needed.
