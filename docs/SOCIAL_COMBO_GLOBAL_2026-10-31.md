# Application-wide Social Combo disclosure

The owner clarified that the single-open category menu and maximum two visible
rows are application behavior, independent of Pro Mode. This supersedes the
Pro-only disclosure scope in PRO_MODE_REFINED_2026-10-31.md. No sidebar reorder
is included: the proposed ordering remains unchanged pending the owner's choice.

The same transient, owner/day-scoped disclosure state now serves every theme
and every Social Combo panel, including Today, Social and historical editing.
Opening one category closes the previous one without changing selected people,
earned category credit, stored records or scores. Direct category-credit
controls remain separate. Changing themes preserves the currently open menu.
The contact list wraps into two visible rows with scrolling to the remaining
contacts/add action. Base geometry lives in application CSS; theme overrides
only determine the visual treatment and option size.

Validation: 237 logic/regression checks passed. 29 related browser checks passed
(Social, locations, strict CSP, history layout and Pro Mode). The two final
application-rule matrix checks passed at 390px/1440px across six themes and
Today/Social with long contact lists, no writes for disclosure, selected-person
preservation and reload. The first desktop matrix fixture did not contain
enough contacts to require scrolling in the wide Social view; the final matrix
uses 80 synthetic contacts and passes. Evidence is in social-combo-global/.
All test data/networking are synthetic/intercepted. No backend/Auth/schema or
scoring-rule changes; no real activities are modified by verification.
