# Desktop Today follow-up

Base: b9855b6ff4ac5d8390aeecf46c2a55b33df6f6e5.

The user's open production tab was still using the pre-fix HTML, without today-disclosure-20261027.css. Read-only inspection measured collapsed LVL 2 and 3 at 260px; reloading loaded the deployed stylesheet and reduced each to 82px. This follow-up trims closed-card padding/margin to about 66px, keeping only the header. Expanded cards retain their layout.

New desktop-only stylesheet improves div.sf-core-routine cards (Production and WOD): 18–20px titles, 16px summary, 14px step chips, 15px action text, 44px buttons, larger icons, top-aligned details and balanced full-width action rows. Work is excluded by element type and retains its approved card and progression. No application JavaScript, account data, scoring or history changes.

Browser validation: classic/Glow/Aurora at 880/1024/1440/1920px, closed-card dimensions, reopen, routine text sizes and inner overflow. LIGHT -> FULL -> Clear and START -> Back passed for both routines; history unchanged. Mobile 320/390/879px has no horizontal overflow. Existing Work geometry, progression, persistence and history test also passed. Synthetic data only; no production activity edited. Screenshot: docs/today-desktop-routines-glow.png (local QA, synthetic account).
