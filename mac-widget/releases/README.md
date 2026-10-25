# Release staging — SHAAH Today

The production release channel stays disabled until the actual ZIP is hosted and checked.

## Candidate 0.6.3 (not published)

- Package: `SHAAH-TODAY-v0.6.3-RELEASE.zip`
- SHA-256: `235021a13f411659bc659d1b0f68714ea688962673804077d35d159d396edb11`
- Changes: correct manifest path to `/shaah/mac-widget/manifest.json`, fix missing `update-config.json` crash, ship disabled opt-in template, avoid scheduling update checks by default.
- Tested: Python compile, ZIP structure and ZIP CRC.
- Not tested: production Google OAuth session, Supabase Realtime, scoring parity, macOS notifications.

Do **not** publish a stable `manifest.json` referring to this candidate until the release ZIP is present at `mac-widget/releases/SHAAH-TODAY-v0.6.3-RELEASE.zip` and SHA-256 matches after HTTPS download.

Future publishing steps: upload binary release to this directory, verify GitHub Pages, then publish manifest **last**, configure optional 72-hour notifications. No automatic download or install.
