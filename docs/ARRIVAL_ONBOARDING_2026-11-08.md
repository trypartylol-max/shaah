# Account arrival and onboarding — 2026-11-08

Base: repository main `695718c11fc1278f424dbbe3d1134eebd129a1d1`.
Public application: https://trypartylol-max.github.io/shaah/

Before editing, fetched the public HTML and application JavaScript and compared
bytes against this source. Public HTML SHA256:
`4c224b6b81d649524c01c17b79bee0439c491dc433b5bbbf70679d34a370707f`.
Public JS SHA256:
`8e229638045919ae` (the filename's SHA256 prefix).
Current main's subsequent control-tower commit changes only `control/index.html`;
that current control version is retained. This change does not use the legacy
single-file artifact or the previous onboarding-review candidate.

## Behavior

Existing initialized accounts show a dismissible Welcome Back on successful
account load, including in a browser without a local tutorial flag. It appears
in 200 ms, exits in 140 ms, and dismisses automatically after 2.2 seconds. The
application is interactive throughout; there is no greeting gate or fixed wait.
The overlay survives ordinary render calls without restarting its animation.
Its local greeting receipt includes account ID and the Auth sign-in timestamp,
so refreshes and token-refresh events do not replay it. The display name is
escaped. Missing sign-in timestamps use a per-account fallback receipt.

First-time empty workspaces retain the published Starter choice screen. The
existing revision-based `shaah_save_settings_v1` initializer atomically records
`starter.tutorial = {version:1,state:'presented'}` in the new profile. Only the
initializer holding the winning persisted token queues the automatic tutorial.
The losing concurrent device adopts the saved profile without merging habits or
replaying the tour. Lost acknowledgements recover through the existing reread.
Normal loads of existing or legacy profiles never enqueue the automatic tour.
No additional row, timestamp-based age heuristic, migration, or RLS change is
introduced. Existing accounts with no saved application data continue the
published Starter classification contract; this is application first use, not
an inference about when a Google identity was created.

The account receipt means “automatic tutorial consumed,” not “all steps
completed.” Skip/Escape/refresh consume it. A crash after server confirmation
can consume it before it is seen. Settings and Today retain manual replay.
The nine-step tutorial's entry takes 180 ms; its exiting visual copy takes
140 ms and cannot receive input or focus. The underlying app resumes immediately
with a 160 ms fade. The copy has no IDs, is inert/hidden to accessibility APIs,
and is removed on completion or account switch. Reduced-motion and the Minimal
skin bypass these new animations.

Auth callbacks synchronously invalidate identity but defer loading and channel
cleanup. A boot revision prevents a late session snapshot from resurrecting a
signed-out account or replacing a newer account. Duplicate auth events share a
scheduled activation and the existing single-flight loader/subscription.
Arrival timers, pending presentation and visual copies reset on account change.
Existing account-scoped settings/day/offline/routine persistence is retained.

## Validation

- 283 logic/regression tests passed, including existing historical fixtures,
  config revision conflicts, day/offline queues and identity isolation.
- 17 focused browser cases passed for arrival, Starter, settings sync and stable
  realtime rendering. All five arrival cases passed again after final CSS QA.
- Three additional mobile-network cases passed in the preceding combined run:
  mobile 4G, constrained mobile, and stalled-load/retry isolation. That run also
  contained an initially misconfigured new test fixture, corrected before the
  clean 17-case run; it is not reported as a wholly passing run.
- Full production HTML, generated assets and SRI are used by browser tests with
  synthetic accounts and blocked external requests. Desktop/mobile screenshots
  inspected; reduced motion and clean-browser behavior exercised.

Not performed: interactive real Google signup/sign-in, new real user creation,
physical iPhone/Safari testing, production account mutations or deployment.
The existing backend initializer's absence-of-other-rows check is not a single
transaction with concurrently arriving day rows; this unchanged backend contract
is not expanded or certified by these UI tests.

No production deployment is part of this change. Review the source diff and run
the real-auth release checks before merging/publishing.
