# Stats mobile legibility — 2026-10-30

Base: `6ea40126e8aa8135b6c41aeeb982bae600113534`.

At widths below 880px, metric labels and subtitles now use 13px text. Labels and subtitles wrap instead of truncating. Internal content uses the available space while keeping the existing six-card grid, order, gaps and minimum card heights. At 601–879px the content inside each card uses two rows. Desktop rules are unchanged. Extremely long custom copy can naturally increase card height to remain visible.

Validation: 18 browser tests passed using isolated Brave Chromium and synthetic records: nine Stats viewport cases (320, 375, 390, 600, 601, 768, 879, 880, 1440), four CSP/style cases and five History-order cases. Each Stats case checked all five skins. The ordinary fixture's card x/y/width/height matched exactly with the new rules enabled and disabled. Mobile labels/subtitles measured at least 13px without horizontal clipping. Additional long-copy and four-digit streak checks passed. Desktop computed copy and card geometry remained identical. Mobile and desktop screenshots were visually inspected; the saved previews show the Minimal skin.

Before the change, GitHub Pages HTML and all 20 referenced assets matched the base checkout byte for byte. Evidence: `stats-mobile-public-baseline.json`. This confirms the baseline publication only; this candidate has not been deployed.

Application JavaScript, scoring and persistence code were not changed. No production account session or personal activity was used. Physical iPhone/Safari was not tested.
