# Pro Mode mobile demo — test only

Branch: `test/pro-mobile-skin-20261102`.
Base: `5337019be1748b05e26d93bf757a6abbb29e4547` (current origin/main when work began).
No merge or production publication is authorized by this change.

Reviewed PRO_MODE_2026-10-30.md, PRO_MODE_REFINED_2026-10-31.md,
PRO_MODE_WORK_CORNER_2026-10-31.md and the current source/styles/tests.
The linked ChatGPT conversation exposes user messages but its assistant/sketch
content is only unresolved content references; the sketch could not be inspected.
This demo therefore follows the existing Pro palette and real UI.

## Differences

A single mobile media block in assets/pro-mode.css, every selector scoped to
`html[data-skin='pro']`, at max-width:879px. Dark navy surfaces, lavender edges,
higher-contrast primary/secondary text, subtle inset/card shadows, score-track
contrast and glow, tabular score digits, tinted active rows and bottom navigation,
and visible keyboard focus. Existing score/grade semantic colors are retained.
Font family, size and line height stay native to preserve mobile metrics.

No DOM, layout, spacing, dimensions, order, event, scoring, storage, data,
application script or backend changes. index.html changes only the Pro stylesheet
cache key and integrity hash, using the existing build script. Desktop rules and
all other skins remain untouched.

## Validation

238 logic/regression tests passed (regression.log). New browser checks compare all
visible app-element rectangles/display/order/font metrics against the base Pro
stylesheet at 320/375/390/430/879px; check five tabs for horizontal overflow;
compare computed paint with the demo removed for all other skins and Pro desktop
at 880/1180/1440px; exercise the existing picker, navigation, draft preservation,
no account-data writes on switching, and reload persistence. Existing Pro browser
coverage exercises Work, routines, orb, note, Reset and desktop sidebar behavior.
All records are synthetic and browser requests are intercepted.

13 browser tests passed, zero failures/skips (browser.log). Mobile Work credit was also exercised.
Screenshots at all five requested widths are in pro-mobile-demo/.
No physical iPhone or Safari claim is made. No hosted test preview is configured
by this change; branch and captured UI are the review artifacts.
