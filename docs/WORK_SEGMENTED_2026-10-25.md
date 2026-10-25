# Single segmented Work button

Approved for OG/production. Work now has one full-width tactile button showing
three visual segments: 400 / 650 / 800+, with cumulative 10 / 20 / 25 points.
Each click fills the next segment; completed segments show a check, the next
segment gets a subtle highlight. Header shows Work and points; a discreet hint
shows the next amount or Completed. Removed the separate chips/Register button.

After completion a further click undoes only the last phase, returning to 20
points; it no longer clears the whole day's Work progress. Existing partial
values are retained until an explicit action. Date, Vacation, per-account
persistence and historical scoring guards are unchanged. No data migration.

181 regression tests passed. Synthetic browser checks verified 10 -> 20 -> 25
and undo -> 20, exactly one button, and three equal 64px-high visual segments
at 390px with no horizontal overflow. Reduced-motion is respected.
