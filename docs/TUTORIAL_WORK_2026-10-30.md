# Work tutorial step — 2026-10-30

Base: d4971b4c1c2470f849acb80870280247e4010a31. Adds WORK & ITS GEOMETRY as step 4, expanding the tutorial to nine steps. The spotlight points to the current Work card when visible. Copy explains one segment per milestone, the three-milestone triangle, adaptation to the number of milestones, today's amount and weekly total.

A fixed three-milestone example reuses workGeometry(3, progress). The demo advances 0 → 1 → 2 → 3 → 0 in tutorial memory only. It never invokes real Work actions, scoring, timers or persistence. Previous tutorial navigation and account cleanup remain in place. Existing users can replay via Settings → VIEW TUTORIAL.

Checks: 17 Work milestone/control/CSP unit regressions, the existing Work geometry browser regression, and eight tutorial browser tests. The tutorial tests cover nine steps × five widths × five skins (225 combinations), progressive segment activation, completion and reset, unchanged account/config/history/session/queue/backend records, keyboard navigation, account cleanup and short viewports. Final copy was shortened and the tutorial matrix repeated for mobile visibility. No physical iPhone or screen-reader certification. No backend changes or real personal activity controls used.
