# Today, Work and Social compact layout

Continues authorized production release 04f7134.

- Removes legacy level translations, capped widths and outer margins in the
  migrated Today layout. Three equal cards align and stretch; desktop spacing
  from Core to the level row and from that row to Note is consistently 16px.
- Clarifies the Core container and individual routine borders using existing
  skin variables; preserves backgrounds, timer controls and mobile order.
- Work has exactly one button. Explicit clicks record 400 -> 650 -> 800+ with
  cumulative 10 -> 20 -> 25 points. At completion the button reads Deshacer and
  resets Work only. Existing partial values stay unchanged until a click; an
  existing 0.5 advances to the next threshold, 0.8. Vacation/history guards and
  existing account-scoped persistence remain in workPhaseSet.
- People and groups use responsive compact grids. Search, filters, edit actions,
  memberships and frequencies are retained. Group cards show member counts.
  On mobile both grids use two columns, with wrapping names and no overflow.

181 automated tests pass (zero failures/skips), including the full prior suite
and Work cycle/undo/legacy partial/Vacation/history tests. Synthetic browser QA
confirmed all three Work phases, one button, equal card widths/heights, 16px gaps
and two-column mobile directory/groups at 390px without horizontal overflow.

No schema, migrations, stored configuration, historical scores or daily data are
rewritten by this release. Browser interaction tests used synthetic data only.
Build retains original production auth, CSP, hashed assets and integrity.

Social-tab Combo person labels now match Who to See (19px desktop / 14px mobile, 48px targets), while Today retains its compact 12px labels.
