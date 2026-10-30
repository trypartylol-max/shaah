# Hybrid tutorial — 2026-10-30

Base: main 9933adf278a06bdee2fc0e1e3fc0dad896830a68. The current product was updated directly; the legacy standalone reference was not substituted for the product.

Eight steps combine onboarding, spotlight and isolated habit/routine/Day Log demos. Navigation supports Back, Next, Finish, Skip and Escape. Background controls are inert; focus remains in the dialog, survives ordinary rerenders and returns to Settings or the original tab. Demo state is memory-only and cleared on closure/account reset. The existing account-specific seen preference is retained. No automatic replay for people who already completed the prior tutorial. Open Settings → VIEW TUTORIAL to replay.

All new events use the existing typed UI registry under strict CSP. Application assets are rebuilt with content hashes and matching SRI. No changes to scoring, dated configuration, sync, backend, personal records or active timer logic.

Validation: 59 targeted regression tests passed (Core, CSP, dated habits, backups, privacy and account sessions); six existing CSP browser tests passed; eight new tutorial browser tests passed. The tutorial matrix exercises all eight steps across 320/390/879/880/1440px and Classic/Aurora/Glow/Matrix/Minimal (200 combinations), including no account/history/session/queue/backend changes, safe text rendering, retained drafts, return focus, replay and Escape. Additional tests verify missing spotlight target, account-reset cleanup and 400px-high layouts. Startup migration/backup writes are allowed to settle before tutorial write measurements. Browser uses only synthetic accounts and intercepts all network requests. No personal activity controls touched. Mobile and desktop screenshots included.

Limits: real iPhone/Safari, assistive technology and live-account persistence were not tested. Existing application defects outside the tutorial are outside this change. Public file verification is recorded separately after publication.
