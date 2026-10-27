# Work Milestones — OG web, 2026-10-27

Integrated on production main 60b4f66, preserving the existing Today desktop/mobile changes.

Add/delete milestones, including zero. Dynamic header, point maximum, progress segments and N+1 reset. Existing amount/point validation retained. Settings save as a dated entry effective tomorrow in the app timezone; current day, config log and historical records are not rewritten. Points resolve by date; Vacation and legacy partial values remain supported. No backend/schema/auth change.

Changed source/app.js, source/app.css, generated index.html and two hashed assets; updated work-single-control.test.cjs; added work-milestones.test.cjs and work-milestones-browser.test.cjs.

Validation on the release checkout: 10 Work tests pass; 2 Chrome browser tests pass. Covers 0/2/3/4/8 milestones, N+1 reset, cumulative points, repeated save, reload, preserved today/history, Vacation, editor add/delete/validation and mobile/desktop geometry. Earlier broad regression run: 159 pass, two unavailable due to missing @supabase/supabase-js. Two stale Settings People selector tests fail identically on the baseline. Physical iPhone not tested.

Publication authorized explicitly by the user: “desplega en og web”. GitHub Pages deploy and public-byte verification are recorded in the task report after publication.
