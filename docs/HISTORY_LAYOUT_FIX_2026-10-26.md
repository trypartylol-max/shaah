# History day editor layout correction

Base: main 96939a230acbfcc57b6ffb63f847ae467945a37a. Before the fix,
GitHub Pages index SHA-256 matched that commit exactly:
c054605371dbb4f011942bdb21df46aee142e758b621ff64f2127e966ee7373b.

renderToday(key, true) now marks only the nested History editor. Its desktop
tracks reserve separate rows for summary, levels, Social Combo/Day Note, and
optional current-day controls. Remove inherited level translations in that
editor. Previously Social occupied row 2 alongside the score hero; descendant
summary placement and legacy level shifts produced intersecting cards.
Today markup and styles outside the editor are preserved. No persistence,
scoring, historical configuration or migration behavior changed.

Synthetic Chrome browser checks pass at 390, 879, 880 and 1440 pixels with
levels/categories open and closed: pairwise card rectangles never intersect,
no horizontal card overflow, original historical note retained. Tests use a
synthetic account and do not contact the backend. 150 unit regressions pass;
http409 regression cannot load because @supabase/postgrest-js is absent locally.
Diff whitespace check passes and production asset hashes/SRI rebuilt.

This validates the scoped layout correction, not the complete production gate
in the master handoff. Real-device iOS and full backend/offline validation were
not repeated for this CSS-only behavior change.
