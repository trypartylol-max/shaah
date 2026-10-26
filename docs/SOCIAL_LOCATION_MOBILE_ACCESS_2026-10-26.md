# Social location and mobile directory access — 2026-10-26

Base main: 00f2c4d (weekly Work cash change retained). Published HTML checked
before editing; no data or scoring changes.

WHO TO SEE now applies the existing Friends location membership rule to
Strangers too. Multi-location and unassigned contacts retain their existing
semantics. Family/Flirting exceptions and the full directory are unchanged.
Mobile Social (<=879px) reserves 96px plus safe-area at the bottom, keeping
People & Groups and its final controls above the fixed navigation.

Validation: 74 unit regressions passed (Social, historical scoring, migrations,
ordering, locations). Two Chromium browser tests passed: 48-contact fixture,
location switching, unchanged people/history/daily data, People & Groups and
Add Group accessible at 390x640 and 390x844; mobile layout and desktop geometry
regression. No runtime/CSP errors or live backend traffic in browser tests.
The location failure reproduced before the fix. No real-device iOS test.
Diff reviewed: two JS presentation/filter lines, mobile-only CSS, hashed
assets/index integrity, targeted tests and this record. Existing circular LOG
stylesheet retained when rebuilding. Deployment verified separately after push.
