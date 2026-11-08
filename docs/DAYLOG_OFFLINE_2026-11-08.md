# Day Log untracked time and offline cold start

Base: bc65b15bab94d7a5bc420d4c1025549fc51008ff. Integrated main
ee20f10046e77115f58f60fe8847aa6e3d199261 before release, preserving the
seven-second welcome/click dismissal and control-tower icons. Subsequently
integrated main 3987f6794331e46eb0eefc73d7c5e817bdc886a8, preserving
the all-card Collapse All / individual disclosure changes.
Owner requested both remaining features; owner confirms the desktop redesign is
already complete. This delivery preserves that design and Collapse All.

## Untracked time

Log > Day Summary adds UNTRACKED TIME. Its window is midnight to now for Today,
the full local calendar day for past dates, and zero elapsed time for future
dates. Midnight boundaries use the configured SHAAH timezone; DST days may have
23 or 25 hours. Coverage is the union of valid timed intervals clipped to that
window, including closed overnight records stored on their starting date.

Activity time remains additive: concurrent work and a call both retain their
original durations. The untracked metric counts their shared clock time once.
An ongoing activity counts until now; an old missing end is unknown. Invalid
ranges, zero-duration events and Wake/Sleep point marks provide no interval
coverage. Sleep is therefore untracked unless explicitly recorded as a timed
activity. No records, scoring rules, historical scores or timestamps are changed
by this calculation. The summary refresh preserves typed drafts. The desktop
Log editor no longer stretches with summary height, keeping Save clear of the
floating routine control.

## Offline startup

After one completed online installation, the root page or index.html can reopen
without the network, including a /shaah/ deployment. The service worker caches
only the built HTML, referenced scripts/styles and their local font dependencies.
Every file has an enforced SHA384 integrity value. Failed installation removes
the partial new cache, leaving the previous complete release. Updates wait for
old clients to close rather than forcing a reload during a routine or draft.
Cache cleanup affects this application scope only. No account records, tokens,
API responses, control pages or arbitrary URLs enter Cache Storage.

Offline local access requires the existing SDK-persisted session AND that same
account's cached configuration and days. It never selects another cached account.
An expired session may open its local copy; it cannot authorize cloud writes.
Day edits/settings/routines keep their existing account-scoped durable queues.
Cloud writes wait for SDK session recovery, then existing reconciliation.
A changed account cannot replay the former account's queue. Logout prevents
local reopening, while the chosen keep/delete account-copy policy is preserved.
A failed account read can use the same saved copy even when the browser's online
indicator is misleading. Auth reads have a bounded deadline and a Reconnect
control is available on the local-copy notice. No first-ever offline login or
Google OAuth without a network is promised. Clearing browser site data removes
the installation/local data. No backend schema, RLS, Auth provider or billing
change is required.

## Validation and release

299 regression tests and 26 browser tests passed. Browser tests use synthetic
accounts only and a real local HTTP server for service-worker installation.
They cover offline close/reopen, offline edit/reload, reconnect/queue replay,
logout, and the actual pinned SDK with an expired persisted session. Day Summary
is checked at 320/390/1440px, including live updates without losing a draft.
Worker tests cover per-file integrity, atomic failed installation, private/API
request exclusion, auth-query handling and isolation from other application scopes.
The final browser report is kept with this delivery. After integrating the
new main, all 299 regressions and 14 affected browser checks passed, including
the new welcome-duration suite. After the all-card disclosure integration,
all 299 regressions and 13 relevant browser checks passed again. Physical iPhone/Safari and
two live production devices are not certified by these synthetic tests.

Prepared for review; no merge or deployment is claimed by this document.
Before release, rebuild with scripts/build-production.py, recheck main for
concurrent changes, and publish index.html, sw.js and all referenced static files
together. Rollback requires shipping a replacement service worker that clears
only this scope's shell caches/unregisters itself; reverting the HTML alone does
not retire an installed worker. Account caches/queues must not be deleted.
