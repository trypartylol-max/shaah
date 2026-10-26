# Who to See — Location visibility

Release base: 2e6f54d80efdec3aa87f1eb0fead8e873615bdb5; live HTML matched exactly before release. Retains newer Core, History and location/access changes.

Added a small Family text-only show/hide button immediately beside Location in Social > Who to See. It hides only the Location label/dropdown; the button remains available. Visibility is transient and resets on account change. The selected location, Family recommendations, all contacts, config, dated records and scoring remain unchanged. No persistence call is made by the toggle. Legacy shared location selectors remain unchanged. Synced sources/ references were read only.

Validation: 67 tests passed across location regression, Social migration/regression and new browser checks at 390px and 1440px. Browser checks cover actual click/keyboard interaction, button placement, no overflow, Family retention across location focus, and exact snapshots of config, day state, score, suggestion list and mock writes before/after toggles. Screenshots inspected at both sizes. Local asset build regenerated SRI hashes; git diff --check passed.

User authorized applying to OG. Integrated validation: 169 checks passed initially; one test file could not resolve an installed dependency. Rerunning that file with the existing dependency path passed all 4 checks (173 total passing checks). No database or real-account writes. The existing History helper script is retained in both the source shell and generated HTML. Publication verification recorded separately.
