# Core Routines START — approved release · 2026-10-28

## Final behavior

This is the implementation approved after the interactive demo. It supersedes the initial October 27 specification wherever they differ.

- Native centered adaptive modal, tall with a dimmed/blurred background.
- Large individual step timer; Reset is an accessible 48px icon to its left. Smaller visual X retains its 44px hit area.
- Mobile: one set of Start/Pause/Resume and Next controls in a fixed bottom row; independently scrollable steps with the gray scrollbar hidden. Five one-line fixture rows fit the 400×694 web viewport. Desktop keeps controls beside the timer.
- Remove Move to End from the UI, repeated Session steps heading, UP NEXT, header Active/count line, and the bottom Pause/Discard row. Internal step position remains visible once.
- START prepares the first step stopped; Start Step runs it. Next starts the next timer. Natural expiry advances one step and leaves the next stopped. Final Next/expiry retain existing automatic routine completion.
- X/Escape close immediately and retain the timer's current execution state, with no confirmation; explicitly paused sessions stay paused. Reopening uses the same session and remaining time.
- Today: active session time and step live inside the Log Activity circle in mobile and desktop; the small + still opens Log Activity. Other tabs use the same compact session UI: desktop horizontal at right, mobile just above the dock. Clearance follows actual dock height (6px mobile, 14px desktop).
- Session paused flag remains local/account/day scoped. No new server data/schema. Steps remain execution guidance, not individually scored or logged.

## Latest production preserved

Base integrated for release: main `6529de6` (the complete SHA is recorded by Git). Includes the concurrent mobile widths/order/disclosures and Work card/skin parity/glow changes. The main served JS had newer presentation changes than source/app.js; those applySkin/workPhaseCard bodies were copied exactly from the actual main asset before regeneration. The current deployed base CSS and baseline source CSS match exactly.

The original baseline's protected scoring/history/Day Log functions remain unchanged. The protected workPhaseCard hash now uses latest production's already-published presentation body. Behavioral baseline fixtures still compare routine completion and scores/history/grades/rachas against unchanged outputs.

## Verification

119 selected checks pass on the combined release: 111 non-browser regressions, 8 browser cases. Includes synthetic account separation/reload, concurrent routines, bottom controls/responsive geometry in Original/Glow/Aurora, Next/expiry, compact across all tabs, LOG circle and activity shortcut. No personal Auth/data requests or activity writes were made. Existing 5 old Settings/Work browser failures had previously been reproduced in the unmodified baseline; no full-suite certification is claimed.

Physical iPhone suspension/audio and multi-device session synchronization are not certified. Device demo bars are simulated, not an exact Safari capture. Existing date rollover, historical configuration and routine-level Day Log semantics remain unchanged: start is captured on first START; completion spans waiting/pauses, updates an existing routine link or creates one, and sets the boolean daily check once. LIGHT/FULL/CLEAR retain existing handlers.

## Recovery

The pre-experiment visual savepoint remains local tag `core-start-approved-left-20261028` at `8437c38`. Revert the eventual release merge to return the web assets and entrypoint to the prior production state; there is no data/schema migration to undo.
