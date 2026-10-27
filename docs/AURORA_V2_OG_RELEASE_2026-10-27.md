# Aurora V2 — OG release preparation (2026-10-27)

User authorized proceeding with OG following the private TEST v33 review.
Initial base main: 12fb367d2ace80b5b2385b5d44ce383d0ca75c70.
Integrated newer main 0311318bbcc0c6f975b1bbab3be52df860855921, preserving the People/Groups toggle and its CSS.
User explicitly approved merging PR #10 and publishing both OG deployments.
Rollback source retained in Git history and a local ignored Git bundle.

## Scope and safety evidence

Optional Aurora, native Appearance selection, Original restoration, Today / Work /
History / More navigation, consistent Daily Log and Settings, restrained static
glow, responsive inputs, reduced motion and keyboard modal behavior.

No production backend, schema, credentials, account migration or dataset changes.
Direct comparison with main's actual served app.aurora-20261026.js confirms 25
functions remain identical: signIn, signOut, saveCfg, saveCfgPref, loadAll,
rowToState, cfgForDate, calcScore, levelsFor, modePts, persistDay, flushCfgSaves,
upgradeShaahSocialCoreConfig, workPhaseAdvance, socialRecord, togglePerson,
setChecked, setPeople, setSocial, applyTravelMode, travelMode,
restoreLiveTravelMode, checkTravelAuto, setVacationStartOnce and exportData.

188/188 final OG release tests pass: all regression files, production parity,
Aurora, checkbox feedback, skins and strict style-policy browser checks.
67 historical days across three local backup accounts retain exact results,
IDs, categories and records. Responsive checks cover 320/390/879/880/1440px,
day/night, keyboard focus, reduced motion and skin persistence/restoration.
TEST v33 independently passes 52/52 tests and native deployment succeeded.

The entire historical browser suite and physical-device/backend release gates
are not claimed as certified. This is a bounded UI release with unchanged data
functions, not a backend repair or recertification.

## Exact expected publication artifacts

- HTML SHA256: 45e8b6fb2a8589571aa1974f5c863647a7cbb55aaa05c7b574dd678ea712a6e3
- Application: assets/app.db14f586356072b1.js
- Existing application CSS: assets/app.8933d41e39607261.css
- Aurora CSS version: cfa96523f4362394
- Aurora JS version: 4bd9c9af2781fcee
- CSP remains strict; versioned app and skin resources have SHA-384 SRI.
- Deterministic production rebuild and git diff --check passed.

Before publication, GitHub Pages matched baseline HTML hash
0bc8d970db075cb875a2433762e79ae1ade86759e017a95ae0cb8c871986c524;
Netlify served an older Aurora entrypoint with hash
8b89adee4be9e494d06ed080328c680d82d22585a7e389f5b6b54a779f3a217f.

Targets to verify after merge:
https://trypartylol-max.github.io/shaah/
https://shaahbydl.netlify.app/

A merge or successful preview alone is not deployment evidence for these URLs.
Confirm each published entrypoint and linked asset hashes before reporting live.
