# Restore native SHAAH navigation in Aurora

The Aurora adapter incorrectly hid Log/Social/Stats and injected Work/More plus
a separate modal. Those controls were invented by the skin and have been removed.

The CSS no longer hides or reorders native destinations. The retired JS adapter
is inert so even cached entrypoints cannot inject its dock. Native Today / Log /
Social / Stats / History, event handlers, active states and configured Social
visibility remain owned by the application. Aurora keeps its colors, backgrounds,
ring glow and accessibility styling. The skin is still optional.

Base main 4484f43 includes the newer Work daily/weekly layout; it is preserved.
No app JS, app CSS, data functions, auth, schema or migration code is modified.

189 OG release checks pass, including direct native tab clicks at 320/390/879/
880/1440px, no injected DOM, skin restore, historical score/data preservation,
strict CSP, native Work persistence and approved Work layout. TEST passes 52/52
checks against its exact Worker. Updated screenshots are generated under
ignored test-results/aurora-v2/ and .runtime/aurora-v2/ respectively.
