# WORK sizing correction — 2026-10-29

Root cause: 927b5ae added selectors with specificity (1,4,0) to work-skin-parity, but the later ui-refinement stylesheet uses (1,5,0). Its 70px default / 58px <=380px SVG and grid declarations win. Reproduced in Chromium at 320px: visible SVG 58×58 and grid 58px, instead of 84px. 6167bda only changes a URL; it cannot override the cascade and its change was absent from source/index.html.

Correction: update the winning WORK-only rules: 72px default, 84px <=879px; remove obsolete 58px and ineffective duplicate sizing. Let WORK card height accommodate its content (mobile minimum 142px), preventing clipping. Preserve typography, cash, colors, animation and all application JS. Build now content-versions and integrity-checks both affected CSS files from canonical source/index.html on every build. Rebuilding is deterministic.

GitHub Pages serves repository root via branch deployment; no .github/workflows or additional build output is present in the repo. Before correction, Pages already served 6167bda and enlarged CSS, proving deployment/cache alone was not the primary fault. Netlify production was independently stale (old work-complete-glow-1 link, CSS without size block).

PWA: current shell has a data manifest but worker-src 'none', no serviceWorker registration code or service-worker file. Do not clear user storage or unregister unrelated workers. Pages HTML has Cache-Control max-age=600; changed CSS content URLs prevent reuse of old stylesheet bytes on the next document load.

Validation: baseline visual-size test fails at 58px; fixed test passes 40 combinations: Classic, Glow, Aurora, Matrix, Minimal × 320/375/390/600/879/880/1024/1440. Exact SVG width/height, matching grid track, card containment and absence of horizontal overflow asserted. Screenshots use synthetic data. 14 targeted tests pass including milestone editor, 0/2/3/4/8 milestones, dated cash/points/history, reset, persistence, touch and keyboard. Chrome baseline; Brave/Chromium final (Chrome became unavailable during task). Physical iPhone/Safari not tested.
