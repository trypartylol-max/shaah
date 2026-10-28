# Today mobile density validation — 2026-10-29

Branch: work/mobile-today-compact-20261028
Starting HEAD: c1f1795032d0acf63581f45f34ddfe3ca7ab4035 (includes 52534012038232c6395a5c329ad8265f5a17e936).

## Finding and fix
At 375×667, the original compact CSS placed RESET DAY below the fixed dock. Added a max-height:740px rule, scoped to current mobile Today with Core, levels 2/3 and Social collapsed. It reduces closed card padding and Day Note height while preserving 44px level/Social controls and 16px note text. Core remains a transparent bare row. Desktop and expanded sections do not match the new rules.

## Validation
- Headless Chrome, synthetic local account; all external requests blocked by existing test helper. No live user data used.
- 375×667 and 390×844: RESET DAY fully above the dock at scrollTop=0; dock fixed and flush with viewport bottom; no horizontal overflow; Core background transparent, border zero and no shadow.
- Open Core, levels and Social at both mobile sizes: contents render, no horizontal overflow; screenshots reviewed.
- Desktop 1440×1000: closed/open screenshots reviewed.
- Existing disclosure test passed across classic/aurora/glow and widths 320,390,879,880,1024,1440, including keyboard toggling and Settings roundtrip.
- Existing desktop routine test passed across five skins and widths 880–1920, including routine actions and unchanged historical state.
- 3 browser tests passed, 0 failed; git diff --check passed.

No application JS, data, scoring, history, or dock positioning changed. No main merge or production deployment. This is Chrome viewport validation, not a physical iPhone/Safari or browser-toolbar/safe-area test. The no-scroll guarantee is checked for the two stated viewport sizes with empty synthetic Day Note and no extra day-log entries.
