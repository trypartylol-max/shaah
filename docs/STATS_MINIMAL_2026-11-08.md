# Stats Minimal and desktop widget positioning

Base: 6f3723e5277e69e791b99aec10549e0991183d78. Public GitHub Pages index matched main byte-for-byte before edits.
References read: synced sources/SHAAH_MASTER_HANDOFF.md and sources/SHAAH-FINAL.html (legacy, not production source). The original /mnt/data paths are absent on this Mac.

Four highlighted metrics confirmed by the user: current streak, average, best day, days logged. Existing weekday chart remains on the main Stats screen; most/least consistent habits, grade distribution and four-week trend remain in keyboard-accessible native details.
All application JavaScript outside renderStats is byte-identical to base. No changes to history, calculations, auth, settings, migrations, database or data writes.

Validation: 299 logic regressions; 24 browser checks covering Stats, zero days, CSP, account isolation, offline queues and widget drag/keyboard/reload; 5 additional responsive Stats checks after final spacing adjustment. Screenshots reviewed at 390 and 1440; widths tested 320,390,768,880,1440 and skins classic,aurora,glow,matrix,minimal. JSX compiled with installed Übersicht Babel.
Not performed: real iPhone, full application browser suite, live-account writes or complete backend certification. Scope is presentation and local desktop positioning, not certification of unrelated legacy behavior.

Desktop widget: installed SHAAH-TODAY-LIVE.widget/index.jsx, formerly top 44px/right 34px. Adds drag handle and keyboard arrows, localStorage persistence, coordinate clamping. Position storage is separate from PWA and agent data. The existing score/Next Move provisional warning is preserved. Installed control verified through Übersicht accessibility; native automated drag unavailable (noWindowsAvailable). Drag/reload/keyboard tested in Chromium.
Original installed widget backup: /tmp/shaah-widget-before-position.jsx.

Deployment status must be verified against the resulting exact commit and public asset hashes before reporting published.
