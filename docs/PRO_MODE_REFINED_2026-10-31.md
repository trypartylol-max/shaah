# Pro Mode refined

The owner approved publication of the refined design. Base: production
05e123928613ffc3668aaf2515aaf392461b89eb; retain the newer workout sync,
Day Log summaries, contact-deletion and zero-point Stats changes.

Desktop Pro Mode uses the available width and height, with a wider Next Level
card and narrower Log card. Date and day period are in the sidebar. The
existing Today note and confirmed Reset controls are positioned in the sidebar
without duplicating inputs: note, Work/sync status, Settings, divider, Reset.
Small windows allow content scrolling; mobile keeps its existing navigation,
note and Reset placement. Typography is unified, with larger habit names and
tabular secondary counts. The score alone retains its condensed display font.

Today Social in Pro Mode separates disclosure from earned credit. Clicking a
category name opens that category and closes the previous one, with no account
write. The separate category-credit control preserves the existing direct
category-credit action. Expanding/collapsing never clears encounters or points.
Disclosure is transient and scoped to account/day. Individual name chips are
the selection controls, purple when selected, with no separate checkbox or
checkmark. The scrollable chip list exposes at most two rows; all remaining
people and the existing add-person control remain accessible. Other skins,
the Social tab and history keep their original category behavior.

Native note persistence, scoring, Reset confirmation and routine actions stay
in place. The compact session tray is positioned above the viewport bottom
when navigation is a full-height sidebar. No backend, Auth, schema or stored
history migration is introduced.

Validation: 237 logic/regression tests and 34 browser tests passed, no failures
or skips. Pro checks cover 320–1920px widths, sidebar ordering, the full-height
desktop grid, typography, original mobile geometry, saved notes, confirmation
cancellation, mutually exclusive disclosure without writes, selected people,
two-row overflow, native Work/routine/orb controls, session-tray reachability,
skin persistence/restoration and draft preservation. Existing suites cover
strict CSP/styles, Social, Reset, remote rendering and workout-session sync.
All test records are synthetic; all browser traffic is intercepted. Physical
iPhone and Safari were not tested. Evidence: pro-mode-refined/*.log and
desktop-synthetic.png. Public deployment is verified separately.
