# Authorized real QA write probe — 2026-10-28

Result: **11 real authenticated checks passed**. This extends the earlier 9 read-only cases with real client save/reload and offline/reconnect checks. The existing 363-test application regression run was not repeated because application source and generated assets did not change.

## Authorization and exact scope

The owner explicitly answered **“Sí, solo ese registro temporal”** to creating and deleting one temporary day in SHAAH-TEST, QA A, without modifying existing rows or production. This approval superseded the earlier automatic rejection for that exact probe only.

- Project: `kpnwiwaiwnndpvtxkvva` (SHAAH-TEST).
- Profile: existing synthetic QA A; QA B used for read/isolation checks only.
- New day: **2099-05-26**.
- A normal INSERT returned 201 after the day was proven absent, rejecting any duplicate race.
- Browser mutations were restricted to that owner, date and unique marker. Settings, backups and all other days were blocked.
- Service access was obtained through the existing owner-only private Site. Proof and ordinary user sessions stayed in memory; no passwords, privileged Supabase keys or session values were saved in evidence.
- No account, schema, policy, Site publication or production deployment was changed.

## Verified behavior

1. Existing private QA gateway and configured accounts work.
2. QA A and QA B authenticate with normal user sessions.
3. Real RLS denies cross-account reads in both directions.
4. Anonymous table access is denied.
5. The local candidate loads QA A and subscribes to Realtime.
6. Actual A → B → A account changes preserve the correct server configuration base.
7. Existing QA data renders on mobile and desktop.
8. The new note saves to the real QA backend and survives a full browser reload.
9. A later note edit remains queued while offline and becomes the saved value after reconnecting.
10. Every pre-existing row of both profiles is unchanged.
11. No candidate browser runtime errors occurred.

The temporary row was then removed. Cleanup required its exact owner/date and complete JSONB content to match the latest test payload; the DELETE returned exactly one row. Cleanup did not reset, seed or clear either account.

The raw counter `applicationWrites: 5` counts **attempted requests on this one row**, including the deliberately offline attempt and final deletion. It does not mean five rows were changed.

## Cleanup integrity refinement

Before execution, JSONB's object-key reordering was accounted for by canonical JSON hashing. Object key order is ignored; array order, membership, notes and checks remain significant. Two focused integrity tests passed: equivalent reordered JSON matches, while content changes do not. This refinement only changes the QA checker, not application behavior.

## Limits

Five configuration-save RPC attempts were deliberately blocked by the read-only guard for existing settings, and a local configuration draft remained pending. Therefore this probe certifies **daily-note persistence/reconnect**, not configuration-save/migration/conflict persistence. The user authorized one temporary day, not writes to existing settings; that boundary was preserved.

Realtime subscription was established. These cases do not certify every Realtime UPDATE/DELETE payload or Google OAuth path. Physical iPhone checks and an isolated configuration-write exercise remain open before a production release. No deploy or push was performed.

Evidence: [raw report](qa-habits-2026-10-28/write-probe/raw-report.json), [normalized summary](qa-habits-2026-10-28/write-probe/summary.json).
