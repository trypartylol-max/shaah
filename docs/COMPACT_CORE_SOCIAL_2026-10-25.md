# Compact Core / Social refinement

People & Groups is now a collapsible card, initially closed, with a smooth
reveal. Its transient open state survives edits/renders and resets on account
switches. The direct grid, filters and group editing remain available inside.
Removed the explanatory comment below Who to See.

Contact capsules explicitly display the signed balance (days elapsed minus
frequency): negative before due, zero on the due day, positive when overdue.
Fill drains from 100% to zero on the due day and stays empty while overdue.
Green before due; orange from zero; red at 30% overdue, inclusive to satisfy the
approved day-13/every-10 example. Colored outlines improve empty-pill visibility.
No contact history or scoring changes.

Core uses the same skin-aware panel palette as the other Today boxes, compact
padding/type/step chips, and clearer inner borders. Work adopts the same
icon/title/subtitle/chips/action layout as the other routines, retaining one
button and all three cumulative amounts (400/650/800+ -> 10/20/25). Legacy
partials, Vacation behavior, historical scores and account persistence remain.

181 automated regressions pass, including capsule thresholds/fill/signed labels,
Work cycle/undo/legacy partials and historical/account isolation checks.
Synthetic browser QA verified closed/open People & Groups and Core/Work layout.
No database migration or bulk data update is part of this refinement.
