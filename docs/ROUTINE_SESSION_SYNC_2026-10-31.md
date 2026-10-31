# Active routine synchronization — 2026-10-31

Starting a workout on desktop now makes its active session available on mobile
under the same account. Step queue, completed steps, absolute countdown deadline,
paused seconds, start time and running/paused state are synchronized. Modal visibility
stays local. Next, Reset and closing/ending sessions propagate between devices.
Closing a modal still leaves its session running; natural expiry advances one step
and waits, as before.

Each routine uses one reusable account-owned `routine:<encoded-id>` row in the
existing `day_logs` JSONB table. Daily scores/history exclude these metadata rows.
No schema, Auth, RLS, settings RPC or scoring formula change. The live production
constraints were inspected read-only and permit the metadata key. Existing owner
policies and account filters apply. No production activity data was read or changed
by the tests.

Writes compare against the complete prior JSONB value and return the affected row.
Concurrent changes on separate routines are independent. A stale conflicting device
adopts the cloud session instead of resurrecting an ended timer. Tombstones retain
closures; monotonic sequences reject older snapshots. Actions made during a save
are serialized, and account/day-scoped pending copies survive offline reloads.
Every displayed running countdown derives from the shared end timestamp: ticks do
not issue writes. Realtime updates are supplemented by focus/foreground/reconnect
reads and five-second visible-tab polling. Online automatic and Next transitions
claim a revision before producing routine completion/Day Log side effects.

First opening after upgrade publishes an existing local session only if no cloud
session/tombstone exists. Account switching retires requests/claims/timers from the
previous account. Account day rollover retains the prior discard-at-midnight rule.

Validation on integrated base `e4915942acfb109b09deea96bb0138dc20d71efd`:
246 existing/targeted regression tests plus one pinned-SDK request-shape check passed;
14 of these cover active-session concurrency, offline retry/reload, stale ends,
account isolation, rollover and the real SDK's JSONB compare-and-swap serialization.
Six integrated browser checks passed: desktop/mobile round-trip, cold reopening,
existing runner/responsive controls, pause/concurrency/expiry, Today circle and the
recent zero-point-statistics changes. The early-finish browser test also passed
before integration. Browser tests use isolated synthetic accounts/transport, including
separate desktop and mobile contexts. Existing expiry tests now move the browser
clock rather than mutating an unsaved deadline, and await shared Next transitions.

Physical iPhone/Safari, locked-screen audio and live authenticated cross-device
transport were not certified. Simultaneous automatic completion is protected for
online sessions; fully offline devices cannot exchange actions until reconnect.
