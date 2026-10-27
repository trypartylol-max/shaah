# Today disclosure and mobile legibility

Base: 71ab0dd6aa302e9f09b54fb710db9294fc49256f, matching the public GitHub Pages HTML before this change. Publication requested explicitly in this chat.

CSS-only behavior change: remove max-height/opacity disclosure clipping; hide collapsed content with display:none; stop collapsed level cards stretching to the grid row height. Preserve existing open-card desktop layout. Improve Today mobile labels, control text, long-label wrapping and 16px form fields; keep mobile order consistent. No application JavaScript, auth, backend, scoring, historical records or Work progression changes.

Preserves concurrent Glow skin publication and the already deployed Stats/Social refinement stylesheet.

Validation: new browser test covers 320/390/879/880/1024/1440px, classic, Aurora and Glow, mouse/keyboard disclosure, shrink geometry, Settings return, input text size and horizontal overflow. Passed. Existing Work browser test and six skin browser tests passed. 32 targeted Core click, CSS/CSP, privacy and realtime regressions passed. Full regression attempt encountered missing @supabase/supabase-js dependency in this environment; no full-suite pass is claimed. Physical iPhone and real-account writes not tested. Browser tests use synthetic transport only.

Deployment destination: https://trypartylol-max.github.io/shaah/ (main). Netlify is not claimed updated.
