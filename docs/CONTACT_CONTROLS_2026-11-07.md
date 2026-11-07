# Contact deletion control and optional frequency

Base: c8eda502199f7f5b6eda0e0082f7850efb2f48a1 (includes approved Pro mobile skin).

- Social contact editing now exposes an explicit Eliminar contacto button. The
  confirmation states that historical encounters remain. Cancelling keeps the
  editor and draft; confirming closes the editor and uses the existing revisioned
  deletion marker so old encounters or cached settings cannot restore the contact.
- New contacts can leave frequency blank or enter zero. Both save as `every: 0`.
  Editing an unscheduled contact displays a blank field with an explanation.
  Existing contacts can clear or later restore their frequency.
- Unscheduled contacts remain available in the directory, combo and discovery
  list. Their pill is neutral, labelled Libre with accessible description Sin
  frecuencia; they receive no due date or overdue status and sort after scheduled
  contacts. Directory cards spell out Sin frecuencia. Recorded encounters and
  scoring still work normally.
- Positive frequencies remain 1–3650 whole days; invalid form values are rejected.
  Missing legacy values retain their previous 14-day fallback. Explicit zero is
  preserved through the existing settings/cache/export paths and people import.
- Historical days and scoring rules are not rewritten. No database migration or
  new backend API is required. Production account records are not used in tests.
