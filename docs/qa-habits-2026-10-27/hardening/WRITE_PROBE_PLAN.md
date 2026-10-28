> Completed after the owner explicitly answered “Sí, solo ese registro temporal”. See [execution evidence](../../qa-habits-2026-10-28/write-probe/summary.json). The text below preserves the original proposed scope and rejection history.

# Authorized QA write probe — completed 2026-10-28

The automated approval review rejected execution because the original request explicitly asked to avoid touching Supabase data. No write probe was executed. The owner was asked separately whether to authorize the action below. Do not run `--write-probe` until that answer explicitly authorizes it.

Prepared script: `qa/supabase/check-existing-profiles.cjs`.

Scope:
- Use only existing synthetic QA A/B sessions from the owner-only SHAAH TEST Site. No password, admin key, profile provisioning, deployment or secret rotation.
- Only SHAAH-TEST `kpnwiwaiwnndpvtxkvva`, never production.
- One randomly selected future day in QA A, proven absent before insertion. A normal INSERT must return 201 before the browser is allowed to write; a duplicate causes an abort.
- The record carries a unique per-run note marker. Browser writes must match its exact owner, date and marker. Existing settings, backups, day rows and QA B writes are blocked.
- Confirm online save/reload and an offline edit/reconnect through the real client and backend.
- Compare all pre-existing rows before/after; do not reset or reseed either profile.
- Clean up only the newly created record, with owner/date/full JSON data equality in the DELETE predicate. If its contents changed unexpectedly, keep it for review rather than delete it.

Risk: this creates and deletes real data in the QA database, even though the row is synthetic and narrowly isolated. A failed run could leave that one marked row for review. No automatic cleanup of accounts, existing days, settings or tables is permitted.

The default execution mode is read-only and has already passed 9 authenticated checks, preserving A/B rows exactly. This does not substitute for the pending write probe or a physical iPhone check.
