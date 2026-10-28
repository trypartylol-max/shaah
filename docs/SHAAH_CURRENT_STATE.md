# SHAAH current habit-validation state

Current local branch: `fix/habits-timeline-safety`.
Verified and locally integrated main: `5e42f014d7c5e1c07f8faaaa57d52b1fc73a586b`.
Integrated candidate commit: `b4b5cb5387d97e5dd74dabe481de0c1080048028`.
Real-validated pre-integration checkpoint: `b0f66f9`; eleven core function bodies remain identical after integration.
Candidate HTML SHA256: `9f40b9d5755ac8c62141bc245aaab29c9436db8adec89aa381eda5bf63de5cc3`.

- Requested habit changes implemented; 28 earlier failing regression cases closed.
- Latest integrated suite: **378 passed**, zero failed/skipped/cancelled. Focused desktop WebKit: **23 passed**. Earlier 363 is historical.
- Existing private Site QA A/B: nine authenticated read-only checks passed; no credentials needed from the owner.
- All existing QA application rows preserved. Three configuration RPC writes were deliberately blocked; configuration persistence is not certified by that read-only run.
- 2026-10-28: the owner explicitly authorized one temporary QA A day. All 11 real checks passed, including save/reload and offline/reconnect; only that new day was created/updated/deleted. Existing A/B rows were preserved.
- 2026-10-28: isolated configuration validation completed with explicit owner authorization: 11 real checks passed, covering move/save/reload, offline/disjoint merge, level conflict/reload/resolution, backups, revision race, owner isolation and Realtime. All existing QA A/B rows preserved; temporary namespace removed and independently verified absent.
- Current candidate review complete against the pinned main above; published HTML plus 17 public assets match it. A 76-file frontend rollback archive was prepared and verified locally.
- Production Google provider/return URL configuration inspected with explicit read-only authorization: enabled and consistent with the unchanged client. No accounts or provider secrets read and no settings changed; interactive Google login was not performed.
- Physical check requested in this chat passed by owner report: iPhone 17, iOS 27, Safari; native level move/reload, repeated habit disclosure, keyboard/control access and rotation/no lateral overflow. Other device scenarios were not individually confirmed. The synthetic preview clock issue was fixed without changing the app candidate; local server stopped and verified. See `HABIT_IPHONE_CHECKLIST.md` and `iphone-user-result.json`.
- Before a future deployment: recheck remote main/publication identity and obtain deployment authorization. Interactive Google login remains untested in this follow-up; only its configuration was inspected.
- This chat has not pushed, merged, deployed, changed Site access or provisioned accounts. Authorized remote mutations were the temporary QA A day and the separate synthetic configuration namespace; both were removed.

Current report: [Final release handoff](HABIT_RELEASE_HANDOFF_2026-10-28.md).
Historical 324/352/363 results and earlier candidate IDs are superseded for the integrated frontend by this report; real QA reports remain valid for the unchanged core functions.

Day-write result: [2026-10-28 write probe](HABIT_WRITE_PROBE_2026-10-28.md). Five configuration RPC requests were blocked during that historical run; the subsequent isolated run below verifies configuration persistence separately.

Configuration follow-up: [isolated probe results](HABIT_CONFIG_PROBE_2026-10-28.md). Eleven real checks passed and cleanup verified. Local focused runs: 26 checks, then 19 overlapping safety checks; latest integrated full suite is 378 passed, plus 23 focused WebKit cases. Cleanup required the Supabase dashboard after connector request-state errors; no cleanup migration history entry was created.
