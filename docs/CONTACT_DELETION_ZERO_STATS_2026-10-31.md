# Contact deletion and recorded zero-point days

Base: 64848f81e863f20269e31f7fb97c5667a557acfd.

Contact deletion now writes an ID-only `deletedPeople` marker in the existing
revision-protected settings JSON. Historical encounter IDs, notes, Social flags,
configuration eras and scores remain intact. Both orphan recovery from days and
stale local contact rescue respect the marker. Genuine missing contacts without
a deletion marker can still be recovered. No database schema or API change.

Markers survive export/import validation and cache reload. An explicit confirmed
people import can restore the same contact ID and clear its marker; a full settings
restore remains an intentional restore. Concurrent delete-versus-edit conflicts
retain the existing conflict handling. Contacts deleted before this release have
no marker: delete a recovered contact once to persist that decision.

Statistics use a separate recorded-day history: saved notes, people, Day Log or
positive checks/Social count even when their points are zero. Empty or Reset-cleared
days and future dates are excluded. Overall/weekly/weekday averages, grade counts,
weekly review and trend charts include recorded zeros. A zero weekly average is
valid data; missing weeks stay missing. Best/worst weekly days compare normalized
percentages so changing historical point maxima does not bias ranking. Score-only
history and streak thresholds are unchanged. No historical rows are rewritten.

Validation: 223 regression tests and 22 browser tests (390/1440 new cases,
existing Social/sync/Pro Mode and Stats geometry across nine widths). Browser data
and backend are synthetic; no production accounts or records are changed by tests.
Physical iOS and two real simultaneous devices were not tested.
