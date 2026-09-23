# SHAAH — MASTER HANDOFF
## Canonical engineering context
**Canonical date:** 2026-09-22  
**Status:** CANONICAL CONTEXT — application itself is NOT yet certified production-ready.

> **Core principle:** COPY THE RULES AND DATA, NOT THE LEGACY MESS.

---

# 0. HOW TO USE THIS DOCUMENT

This is the durable context for any engineer, ChatGPT, Codex, or other coding agent working on SHAAH.

It separates:

- **PRODUCT RULE** — what SHAAH is required to do.
- **OBSERVED IN SUPPLIED BUILD** — behavior/structure found in the supplied `SHAAH-FINAL.html`.
- **KNOWN DEFECT** — reproducible or strongly evidenced defect in that build.
- **BACKEND / RUNTIME UNKNOWN** — cannot be established from the HTML alone.
- **FUTURE DIRECTION** — architectural improvement, not proof of current behavior.

A bug in current code does not override a PRODUCT RULE. Code tells us what happens; product rules tell us what should happen.

Never infer production state from filenames, comments, old handoffs, or memory. Establish the exact repo commit/build first.

---

# 1. PRODUCT

**PRODUCT RULE**

SHAAH is a habit/productivity PWA.

The current application model is a single self-contained `index.html` using vanilla JavaScript with HTML/CSS/JS together.

The desired product is the complete working application — never a prototype, shell, partial rewrite, or tiny loader that omits existing functionality.

Preserve existing functionality, historical meaning, and user data.

Priority order:

1. Correctness
2. Data preservation
3. Historical accuracy
4. Maintainability
5. UI consistency
6. Performance
7. File size

Do not delete functionality merely to reduce KB.

Splitting HTML/JS/CSS is a separate future decision. Do not silently perform it during bug fixing.

---

# 2. PROJECT LOCATIONS

**REPORTED — VERIFY CURRENT STATE**

- Live: `https://trypartylol-max.github.io/shaah/`
- Repo: `trypartylol-max/shaah`
- Deployment: GitHub Pages
- Supabase project ref: `llpyxktcfubhmthqujpa`

Before editing:
- identify exact current `main` commit;
- identify exact deployed build;
- compare them with the supplied artifact;
- never assume a prior chat artifact was uploaded.

The supplied build contains an embedded label `20260919-sleep-wake-checkbox-fix-v1`, but that is not deployment provenance.

---

# 3. EVIDENCE / AUTHORITY MODEL

Use each source for the question it can answer.

## What SHOULD happen
1. Explicit PRODUCT RULES in this document
2. Later explicit user decisions
3. Approved design/behavior decisions

## What DOES happen
1. Reproduced runtime behavior
2. Current production source at a known commit
3. Current build under examination
4. Tests
5. Comments and old handoffs only as supporting context

Do not let a reproducible bug redefine intended product behavior.

Comments are intent, not tests.

---

# 4. CURRENT SUPPLIED BUILD

**OBSERVED IN SUPPLIED BUILD**

`SHAAH-FINAL.html` is roughly 313 KB / ~5.3k lines and contains the actual application.

Major areas observed:
- Today
- Log / Day Log
- Social
- Stats
- History
- Settings
- habits
- routines
- people
- Work/Vacation modes
- scoring / grades / Next Move
- Supabase auth/data
- realtime
- local storage/cache
- offline day-write queue
- backups
- migration/repair logic

**IMPORTANT**

The supplied build has not passed the full production validation gate below. The filename `FINAL` does not make it production-safe.

---

# 5. ABSOLUTE HISTORICAL PRODUCT RULE

**PRODUCT RULE**

Vacation began on:

`2026-09-08`

Required known fixtures:

- 2026-09-07 → Work
- 2026-09-08 → Vacation
- 2026-09-15 → Vacation
- 2026-09-16 → Vacation
- 2026-09-17 → Vacation
- 2026-09-18 → Vacation

September 16 and 17 must not be recalculated as Work merely because today's mode is Work.

Today's Work/Vacation switch controls today, not completed history.

`resumeOn` is a future auto-return mechanism. It is not historical truth.

Do not hardcode displayed percentages to hide a mode/config bug.

**IMPORTANT SCOPE RULE**

The known September Vacation fixtures do NOT authorize an indefinite rule that every later historical day must be Vacation.

A legitimate later Work era must remain Work.

Before broad historical repair is allowed, its account, start date, end/boundary, and affected eras must be explicitly established.

---

# 6. CONFIGURATION TIMELINE CONTRACT

**PRODUCT RULE**

Historical scoring/configuration is date-specific.

A valid configuration timeline must have:

- valid date keys;
- deterministic chronological ordering;
- a baseline covering supported history;
- no accidental duplicate/same-date ambiguity;
- deterministic same-date edits;
- preservation of legitimate future transitions;
- no retroactive edits without explicit authorization.

Changing configuration from date `D` forward must not silently change eras before `D`.

A settings edit today must not reorder or invalidate an already-configured future era.

Historical calculations must not depend on:
- today's switch;
- current UI state;
- current localStorage live mode;
- current `CFG.travel.mode`;
- current `resumeOn`;
- current auto-mode state.

---

# 7. CURRENT MODE/CONFIG IMPLEMENTATION

**OBSERVED IN SUPPLIED BUILD**

Relevant abstractions/functions include:

- `DateEngine`
- `ModeEngine`
- `ConfigEngine`
- `ModeEngine.historical(key)`
- `ModeEngine.forDate(key)`
- `ConfigEngine.modeForDate(key)`
- `ConfigEngine.eraForDate(key)`
- `cfgForDate(key)`
- `cfgLog()`
- `editFrom(from, fn)`
- `_dayCfgCache`
- `travelMode()`
- `persistTravelMode()`
- `restoreLiveTravelMode()`
- `applyTravelMode()`
- `checkTravelAuto()`
- `setVacationStartOnce()`

The implementation is attempting to separate live Today mode from dated historical eras.

---

# 8. CRITICAL KNOWN DEFECTS — MODE / HISTORY

## 8.1 Vacation repair is over-broad

**KNOWN DEFECT**

`setVacationStartOnce()` rewrites configuration eras beginning between `2026-09-08` and yesterday to Vacation and disables Work.

It has no proven legitimate return-to-Work boundary and no per-account historical scope.

A legitimate later Work era can therefore be rewritten as Vacation.

The September 16/17 fix must not destroy later Work history.

## 8.2 `travelV` is not a migration gate in this build

**OBSERVED IN SUPPLIED BUILD**

- `applyTravelMode()` writes `CFG.travelV = 6`.
- `setVacationStartOnce()` writes `VERSION = 9`.
- Prior handoffs referenced version 8.
- In the reviewed build, `travelV` is written but not used to gate the repair.

`setVacationStartOnce()` returns `changed || true`, so a nonempty timeline causes the caller to treat the repair as successful/changed every load and call `saveCfg()`.

Do not “fix the version number” without redesigning/understanding the actual migration gate.

## 8.3 Auto-resume representation disagreement

**KNOWN DEFECT**

`checkTravelAuto()` can call `applyTravelMode('work')` without synchronizing the authoritative local live-mode value.

Because `travelMode()` prioritizes localStorage, the app can simultaneously contain:
- Work in `CFG.travel.mode`;
- Work in the dated era;
- Vacation from `travelMode()`;
- Vacation from `cfgForDate(today)`.

Auto-resume requires an explicit synchronization fix and regression tests.

## 8.4 Future-era ordering can break

**KNOWN DEFECT**

At least one configuration-edit path can append a Today era after an existing future era, leaving the timeline unsorted.

Mode/config readers assume chronological order.

Timeline writers must enforce the timeline contract.

---

# 9. SCORING MODEL

**PRODUCT RULE / OBSERVED IMPLEMENTATION**

SHAAH includes:
- Level 1
- Level 2
- Level 3
- mode-specific Work/Vacation points
- Social Combo
- streaks
- grades
- Next Move

Relevant functions include:
- `modePts`
- `ensureModePts`
- `levelsFor`
- `calcScore`
- `GRADE`
- `nextMove`
- `safePts`
- `doneFrac`

Grade thresholds are based on normalized completion percentage:

- S+ >= 95%
- S >= 85%
- A >= 72%
- B >= 45%
- C >= 30%
- D >= 15%
- F otherwise

**DO NOT CONFUSE RAW POINTS WITH NORMALIZED PERCENTAGE.**

`GRADE(score,max)` evaluates score relative to maximum.

A display such as “95%” must not be assumed to mean 95 normalized percent if the UI is actually appending `%` to raw points.

There is no permanent invariant that the maximum is always 118. Maximum depends on active configuration, mode, weights, Social parts, and historical era.

For historical acceptance tests, record:
- active items;
- mode-specific weights;
- Social configuration;
- checks;
- earned raw points;
- maximum raw points;
- normalized percentage;
- grade.

---

# 10. SCORING EDGE CASES REQUIRING TESTS

**OBSERVED / KNOWN RISK**

Test explicitly:

- boolean `true` = full completion;
- fractional completion behavior;
- numeric `1` versus boolean `true`;
- per-item rounding;
- fractional label versus rounded score;
- half-completed items in level-completion logic;
- zero maximum;
- Social combo with zero selected positive-point parts;
- Social sub-items without explicit historical point values.

A reviewer reproduced a legacy Social fallback problem where unpriced parts could resolve to zero instead of an intended even split.

Legacy rebalancing also needs review because changing legacy `p` may not change effective `pWork` / `pVacation`.

Do not “clean up” these paths without fixtures.

---

# 11. WORK HABIT RULE

**PRODUCT RULE**

In the user's configuration, `work` is in LVL1 and is NOT a routine.

Never hide LVL1 merely because of routine-related logic.

Distinguish:
- level membership;
- `i.routine`;
- Work/Vacation eligibility;
- mode-specific points.

---

# 12. SOCIAL COMBO

**PRODUCT RULE / OBSERVED RISK**

Social Combo contributes to Level 3.

Social sub-items are historically sensitive. Adding/removing/reweighting them today must not recalculate old days incorrectly.

`comboBlock()` is shared by Today and Social rendering. Treat that as VERIFIED shared-renderer behavior.

A condition designed for Today can regress Social.

Current Social placement behavior requires cleanup/decision: settings can imply “Own tab” versus “In TODAY,” while the reviewed build can still render the block in Today.

Do not change Social placement or scoring casually.

People can affect Social state/scoring through person interactions; do not assume people are score-neutral.

---

# 13. TODAY / HISTORICAL SHARED RENDERING

**OBSERVED IN SUPPLIED BUILD**

Historical editing uses `renderToday(editDayKey, true)`.

Therefore `renderToday` does NOT mean “today only.”

Any code inside `renderToday` that reads today's live mode/state without respecting the rendered date can corrupt historical editing.

This is a high-risk shared renderer.

---

# 14. DESKTOP TODAY UI

**PRODUCT RULE**

Preserve the approved desktop direction:

- prominent score ring;
- centered score text;
- score/info presentation;
- Log Activity on desktop;
- efficient horizontal space;
- compact aesthetic spacing;
- no unnecessary empty space;
- avoid unnecessary main-view scrolling.

The approved LVL-row baseline must not be casually redesigned.

Historical instruction:
> “la linea de los lvls me entendiste perfecto, ya no lo toques mas.”

“Fits without scrolling” is a design target, not an unconditional guarantee for arbitrary custom content. Test defined supported viewport/content fixtures.

---

# 15. MOBILE TODAY UI

**PRODUCT RULE**

Conceptual mobile order:

1. Routines
2. Habits
3. Day Log
4. Day Note

Preserve:
- routines collapsible on mobile;
- routines not collapsible on desktop;
- compact layout;
- readable score/ring;
- centered score text;
- Day Log entry after Habits and before Day Note;
- mobile-specific omission of desktop Log Activity where intended.

**KNOWN DEFECT / REGRESSION RISK**

The reviewed CSS has nighttime-specific selectors whose specificity can violate the desired mobile sequence.

Test daytime and nighttime separately.

Test the 879/880px boundary and medium desktop widths.

---

# 16. MOBILE INPUT / iOS ZOOM

**KNOWN DEFECT IN SUPPLIED BUILD**

The previously reported “all relevant inputs fixed to >=16px” state is not present in the reviewed build.

Examples reported from the build include:
- `#dayLogInput` at 13px on mobile;
- Vacation resume-date input at 14px;
- `.logdesk-input` at 12px;
- Day Note at 15.5px.

Actual iOS zoom/stuck-zoom behavior requires real-device testing.

Do not mark this bug fixed solely from an old handoff.

---

# 17. SCORE RING / RESPONSIVE GEOMETRY

**KNOWN REGRESSION RISK**

The generated SVG dimensions and CSS container dimensions differ across desktop/mobile breakpoints.

Test mathematical/visual centering rather than assuming CSS centering proves SVG centering.

Also test desktop Log content near the desktop breakpoint for hidden horizontal overflow.

---

# 18. DAY LOG — PRODUCT INTENT

**PRODUCT RULE**

Day Log exists to reconstruct the day and expose where time is lost.

Desired capabilities:
- integrate with Habit Tracker;
- automatically reflect appropriate completed habits/routines;
- allow manual one-off activities;
- support daily recap/analysis;
- timeline/agenda representation;
- Today entry point plus detailed Log area.

Synchronization rules must eventually be explicit for:
- single habit taps;
- half/full cycles;
- bulk completion;
- reset;
- Social actions;
- historical edits;
- deleting linked events;
- editing linked events.

Do not assume current behavior is internally consistent.

---

# 19. DAY LOG — KNOWN DEFECTS / RISKS

The reviewed build has multiple Day Log issues requiring targeted work:

1. A resumed paused habit calls `dayLogHookHabitCompletion(id)`, but that function was not found in the supplied build. Mutation can occur before the resulting ReferenceError.
2. The first “ADD ACTIVITY” flow can no-op because local render mode and global panel mode disagree.
3. `openDayLogStart()` targets an input ID that is not the one used on the destination page.
4. Event metadata shape is inconsistent across producers/consumers.
5. Bulk completion/reset/historical edits do not have one clearly consistent linked-event synchronization policy.
6. Sleep-cycle behavior can depend on event records.
7. `dayLogV2` is written but was reported not read.
8. Legacy migration timing can race later cache/server loading.
9. Active Log UI and recap/gap analysis are not fully wired as one coherent feature.
10. Duration/untracked-time calculations need explicit semantics for open events and overlaps.
11. Export/import currently requires special attention to `_daylog` round-trip preservation.

Treat Day Log as a subsystem, not a cosmetic widget.

---

# 20. SETTINGS / POINT EDITING DEFECT

**KNOWN DEFECT**

A field labeled Work can route through generic `cfgSet(id,'p',value)` logic that chooses the actual destination based on current mode.

In Vacation mode, editing a Work-labeled field can therefore modify Vacation points instead of Work points.

Mode-specific settings controls must write explicit mode-specific fields independent of the current live mode.

---

# 21. PERSISTENCE MODEL — DO NOT OVERSTATE IT

The code comments describe Supabase as the source of truth and localStorage as cache.

That is an architectural intention, not a complete description of current behavior.

**OBSERVED IN SUPPLIED BUILD**

localStorage also participates in:
- live travel-mode preference;
- unsent day writes;
- local backups;
- UI/preferences;
- routine/session-related state;
- cached configuration/data.

Therefore future documentation must distinguish:
- local cache;
- local authoritative preference;
- pending unsent write;
- acknowledged remote state;
- backup snapshot.

---

# 22. SUPABASE / AUTH / REALTIME

**OBSERVED IN SUPPLIED BUILD**

The build uses Supabase JS v2 and includes:
- persistent auth;
- PKCE;
- Google OAuth;
- `day_logs`;
- settings row;
- `cfgbak`;
- realtime subscription;
- local cache;
- offline day-write queue.

**BACKEND / RUNTIME UNKNOWN**

HTML alone does NOT prove:
- RLS policies;
- `(user_id,date)` uniqueness;
- ownership enforcement;
- realtime publication configuration;
- DELETE payload contents;
- backend response limits;
- OAuth redirect configuration;
- successful remote backup persistence.

These require backend inspection/testing.

Never treat client `.eq('user_id',...)` filtering as proof of RLS.

---

# 23. `_cfgReady` SAFETY

**OBSERVED / LIMITED GUARANTEE**

`_cfgReady` prevents one class of premature configuration write after a historical incident where good configuration could be overwritten before server state loaded.

Do not remove this guard casually.

However it is not a complete account-specific lifecycle guarantee:
- it is global;
- lifecycle reset behavior requires review;
- cached UI can be interactive during loading;
- day writes have different guards.

Treat it as one protection, not proof that loading is race-free.

---

# 24. OFFLINE QUEUE — CRITICAL ACCOUNT ISOLATION DEFECT

**KNOWN DEFECT**

The reviewed offline day-write queue is global and keyed by date without owner identity.

A queued change created under account A can be restored/flushed under account B and submitted using B's current identity.

This can misattribute an upsert or deletion even if backend RLS correctly restricts each user to their own rows.

**PRODUCT RULE**

All queued/pending/offline state must be scoped to account identity.

Define behavior for:
- reload;
- sign-out;
- account switch;
- failed write;
- concurrent devices;
- stale queued entry;
- queued deletion.

---

# 25. OFFLINE RETRY / CONCURRENCY RISKS

**KNOWN DEFECT / HIGH RISK**

Review and test:

- successful direct writes versus older queued snapshots;
- queue removal only if the entry being removed is still the same revision;
- concurrent flush prevention;
- newer local edit while older flush is in flight;
- deletion behavior;
- incoming realtime event while an offline write remains unsynced.

Settings currently do not have an equivalent durable offline queue/conflict strategy.

---

# 26. SETTINGS CONFLICT / RECONCILIATION RISK

**KNOWN RISK**

A settings save can upload the entire configuration.

A failed settings save may leave local and remote configuration divergent.

Server/local reconciliation must not use “timeline has more entries” as a proxy for “timeline is newer/correct.”

Future conflict resolution should use explicit revision/time/account semantics, not array length.

---

# 27. BACKUPS / RECOVERY

**PRODUCT RULE**

Distinguish:

1. **configuration snapshot backup**
2. **complete data backup/export**

They are not interchangeable.

A configuration restore can leave daily rows physically untouched while changing how those days recalculate.

Therefore wording such as “daily logs are not touched” must not imply historical scores are guaranteed unchanged.

Complete export/import acceptance must round-trip all required fields, including:
- day data;
- `_daylog`;
- notes;
- people;
- fractional checks;
- Social state;
- mode-specific weights;
- historical eras/configuration.

Remote backup execution/durability must be tested, not inferred from an unawaited call.

---

# 28. PEOPLE / DELETION SEMANTICS

**KNOWN RISK**

Recovery logic can reconstruct people referenced by historical days.

Local/server merging can also reintroduce locally known people.

Without tombstones, an intentional deletion can be mistaken for missing/corrupt data and resurrected.

Define deletion semantics before changing recovery behavior.

---

# 29. STARTUP / MIGRATIONS

**OBSERVED IN SUPPLIED BUILD**

Startup includes multiple repair/migration operations, including:

- `ensureBaseline()`
- `setVacationStartOnce()`
- `widenBaseline()`
- `addFamilyOnce()`
- `addJunkFoodOnce()`
- `rebalanceOnce()`
- `restoreLiveTravelMode()`
- `normalizeTravelResume()`
- `checkTravelAuto()`
- `recoverPeopleFromDays()`

**FUTURE DIRECTION**

Migration/repair logic should become:
- explicit;
- versioned;
- idempotent;
- scoped;
- testable;
- separated from ordinary deterministic runtime.

Do not refactor all migrations simultaneously during stabilization.

---

# 30. AUTH / LOAD LIFECYCLE RISK

**HIGH-RISK AREA**

Review:
- boot load versus auth-state-change load;
- duplicate subscriptions;
- realtime cleanup on account change;
- account identity after awaited requests;
- edits made while loading;
- state replacement during `loadAll()`;
- pagination/completeness of `day_logs` fetches.

Introduce lifecycle isolation only with tests; this area can cause data loss if changed casually.

---

# 31. HISTORICAL ANALYTICS

**KNOWN RISK**

Historical score calculation and historical analytics are not necessarily using the same eligibility/normalization definitions.

Review:
- normalized averages versus raw-point averages;
- whether zero-score days are included;
- habit consistency based on today's habit list versus each historical era;
- truthy versus fractional completion;
- whether changing today's mode/config changes historical analytics.

Historical analytics must eventually consume date-specific eligibility/configuration just as historical scoring does.

---

# 32. SECURITY / REPRODUCIBILITY REVIEW

**OBSERVED / REVIEW REQUIRED**

The supplied artifact includes:
- a Kaspersky-injected external script;
- a floating Supabase `@2` CDN dependency;
- no proof from the HTML alone of service-worker registration/offline cold-start support.

Review before production:
- remove browser-injected artifacts from canonical source if they are not actually part of the repo;
- consider dependency pinning/reproducibility;
- escape OAuth/error text before inserting into HTML;
- validate imported identifiers before embedding them in inline handlers;
- do not assume HTML escaping alone safely encodes JavaScript string contexts.

Never expose privileged Supabase credentials in the client.

---

# 33. LEGACY REFERENCE

**REPORTED**

Prior project context identifies:
- `index(20260920-021200).html`
- preserved `index_legacy.html`
- roughly 327 KB / ~5,714 lines

Do not destroy the legacy reference.

Use it as a behavioral reference, not an architectural template.

Prior audit reported many accumulated CSS overrides, media queries, `!important`s, duplicate patches, overlapping travel representations, and startup repairs.

The goal is not to preserve the mess.

---

# 34. CHANGE STRATEGY

During stabilization:

1. Inspect before editing.
2. Reproduce when possible.
3. Identify exact data flow/callers.
4. Prefer minimal surgical changes.
5. Keep unrelated UI/logic untouched.
6. Test the affected subsystem.
7. Run relevant historical/persistence regression tests.
8. Review the diff.
9. Do not combine refactor + bug fix unless necessary.
10. Update current-state documentation after verification.

Do not regenerate the entire application for a narrow bug.

The user does not want to manually manage branches. Engineering tooling may use safe Git workflows without requiring the user to coordinate them.

---

# 35. HIGH-RISK FUNCTIONS / AREAS

Inspect callers and side effects before editing:

- `renderToday`
- `renderEditDay`
- `comboBlock`
- `saveCfg`
- `saveCfgPref`
- `loadAll`
- `rowToState`
- `cfgForDate`
- `cfgLog`
- `cfgEdit`
- `editFrom`
- `applyTravelMode`
- `travelMode`
- `restoreLiveTravelMode`
- `checkTravelAuto`
- `setVacationStartOnce`
- `calcScore`
- `levelsFor`
- `modePts`
- `resolveSubs`
- `ensureModePts`
- offline queue functions
- realtime handlers
- backup/recovery
- import/export
- Day Log producers/consumers

---

# 36. REQUIRED HISTORICAL TEST MATRIX

At minimum test:

| Date | Required Mode |
|---|---|
| 2026-09-07 | Work |
| 2026-09-08 | Vacation |
| 2026-09-15 | Vacation |
| 2026-09-16 | Vacation |
| 2026-09-17 | Vacation |
| 2026-09-18 | Vacation |

For each fixture capture:
- era/config ID or effective config;
- active habits;
- mode-specific point values;
- Social parts;
- checks;
- raw score;
- raw maximum;
- normalized percentage;
- grade.

Also create a fixture for a **legitimate later Work era** to prove Vacation repair does not overwrite it.

Test:
- Today switch Work → Vacation;
- Vacation → Work;
- refresh;
- logout/login;
- historical edit;
- auto resume;
- stale local travel mode;
- future era present;
- no timeline/baseline edge case.

---

# 37. REQUIRED PERSISTENCE TEST MATRIX

Test at minimum:

### Account isolation
- A queues offline upsert → sign out → B signs in
- A queues offline deletion → B signs in
- ensure no cross-account replay

### Loading
- edit while server load is in flight
- auth state change during load
- duplicate load/subscription
- failed settings fetch
- missing settings row

### Offline
- edit offline
- edit same day again
- reconnect
- newer edit while old flush is in flight
- realtime event during pending/offline state

### Settings
- save online
- failed save
- reconnect
- concurrent device change
- shorter but valid timeline from server
- future era present

### Backup/recovery
- configuration backup
- configuration restore
- complete export
- complete import
- `_daylog` round-trip
- people/deletion semantics

---

# 38. REQUIRED DAY LOG TEST MATRIX

Test:

- first ever ADD ACTIVITY;
- LOG ACTIVITY then save;
- manual event edit/delete;
- habit completion;
- routine half/full;
- Sleep cycle;
- paused habit resume;
- bulk completion;
- reset;
- Social action;
- historical edit;
- linked-event delete;
- refresh;
- export/import;
- legacy migration;
- overlapping events;
- open event duration;
- recap/untracked time.

---

# 39. REQUIRED UI TEST MATRIX

## Desktop
- Today ring
- score/info
- Log Activity
- LVL row
- routines
- reset
- spacing
- alignment
- main-view overflow
- Log table near desktop breakpoint

## Mobile
- daytime order
- nighttime order
- Routines → Habits → Day Log → Day Note
- collapse behavior
- score/ring centering
- 879px
- 880px
- long/custom content
- input focus/zoom on real iOS
- Day Log first-entry flow

---

# 40. PRODUCTION VALIDATION GATE

Never call a build FINAL/production-ready because:
- syntax passes;
- it rendered once;
- a model says the bug is fixed;
- its filename says FINAL;
- comments claim a fix;
- file size looks plausible.

Required gate:

### Source identity
- exact commit/build established

### Structure
- HTML valid enough for target browsers
- no broken script/style boundaries
- critical elements present

### JavaScript
- syntax passes
- critical functions present
- no missing references in tested paths

### Historical correctness
- required September fixtures pass
- later Work boundary fixture passes
- current switch cannot rewrite history

### Persistence
- existing data loads
- writes survive refresh
- account isolation passes
- offline/reconnect passes
- settings conflict paths tested
- backup/export/import tested

### UI
- desktop regression matrix
- mobile regression matrix
- real-device iOS input test

### Backend
- RLS inspected
- ownership/uniqueness inspected
- OAuth redirects inspected
- realtime behavior inspected

### Legacy parity
- compare major required features with preserved legacy/reference build where available

---

# 41. DEPLOYMENT WARNING

If validation is incomplete and an artifact could overwrite production, use:

# 🚨🚨🚨 ALERTA CRÍTICA — NO SUBAS / NO REEMPLACES TODAVÍA 🚨🚨🚨

State:
- exact artifact;
- exact source commit/build;
- changes;
- tests passed;
- tests not run/failed;
- data risks;
- whether replacement is safe.

Do not use “FINAL” casually.

---

# 42. CURRENT OPEN ITEMS

**VERIFY BEFORE ACTING**

- Establish current GitHub `main` and deployment parity.
- Determine whether prior Sep 18/Sep 22 fixes reached production.
- Resolve the over-broad Vacation historical repair.
- Resolve live-mode/auto-resume inconsistency.
- Enforce sorted timeline/future-era integrity.
- Fix/scoped offline queue account ownership.
- Review settings conflict/offline behavior.
- Fix Day Log missing hook / first-entry / metadata / recovery paths.
- Fix Work-labeled point editor routing.
- Verify/fix mobile input sizes and iOS zoom.
- Verify nighttime mobile ordering.
- Verify export/import `_daylog`.
- Inspect RLS/backend schema.
- Add Lior in Flirting only if still required by current product state.
- Establish clean local development workflow.
- Decide later, separately, whether to split the single file.
- Retention testing before optional Apple distribution remains a product decision.

---

# 43. AGENT STARTUP PROTOCOL

Every coding session:

1. Read this document.
2. Identify exact repo/build/commit.
3. Read current source.
4. Read current-state/open-task document.
5. Do not assume old handoff fixes are present.
6. Reproduce the issue when feasible.
7. Separate PRODUCT RULE from current buggy behavior.
8. Inspect callers/data flow.
9. Make the smallest safe change.
10. Preserve user data and historical eras.
11. Run targeted + relevant regression tests.
12. Review diff for unrelated changes.
13. Report evidence and remaining unknowns.
14. State deployment safety explicitly.
15. Update current-state documentation only after verification.

---

# 44. CODING AGENT — DO / DO NOT

## DO
- reason from current code/data;
- keep diffs narrow;
- preserve historical eras;
- scope persisted state to account;
- distinguish raw points from normalized percent;
- inspect Supabase/cache effects;
- make migrations idempotent and bounded;
- test shared renderers in every context;
- test desktop/mobile branches;
- report uncertainty.

## DO NOT
- regenerate the whole app for a one-line bug;
- replace it with a shell;
- silently modularize/split files;
- rewrite historical dates from today's mode;
- use `resumeOn` as historical truth;
- hardcode a score/percentage to hide a bug;
- assume 118 is universal;
- remove backup/offline/realtime for simplicity;
- alter RLS blindly;
- expose secrets;
- trust comments as tests;
- assume localStorage is “only cache”;
- call a build production-ready without the gate.

---

# 45. RECOMMENDED REPO DOCUMENTATION

Keep durable rules separate from changing status:

`/docs/SHAAH_MASTER_HANDOFF.md`
- this document; durable product/engineering rules

`/docs/SHAAH_CURRENT_STATE.md`
- current commit/build
- deployment parity
- active defects
- verified recent fixes
- next task

`/docs/SHAAH_TEST_MATRIX.md`
- executable/manual regression fixtures

`/docs/SHAAH_DECISIONS.md`
- durable product/architecture decisions and rationale

Do not turn the Master Handoff into a chronological bug diary.

---

# 46. FINAL PRINCIPLE

SHAAH's history, configuration, and user data are product behavior.

A “cleaner” implementation that changes historical meaning or loses data is a regression.

A “working” UI that writes the wrong account, wrong era, wrong mode-specific field, or incomplete backup is not working.

**COPY THE RULES AND DATA, NOT THE LEGACY MESS.**
