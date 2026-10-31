# Work status above Log

Owner approved the preview moving Work plus the existing sync-status dot to a
small top-right band above Log Activity. On Pro Today desktop (1180px+), the
band takes 36px plus an 8px gap from the existing Log column. Ring and Next
Level dimensions are retained. Log and active-routine controls remain usable
inside the shortened card. The note gains 46px of sidebar height; Settings,
divider and confirmed Reset keep their positions. Other themes, mobile and
other tabs retain their existing composition.

CSS-only change, with a versioned/integrity-protected stylesheet reference.
No application script, scoring, storage, backend or account-data change.
The existing sync dot retains its real green/warning/error semantics.

Six focused browser tests passed: widths 320–1920, precise mode/Log alignment
at 1180/1280/1920, note persistence and draft preservation, Reset cancellation,
skin/mobile restoration, routine credit and active orb, plus the six-theme
Social matrix with application-wide disclosure and two-row scrolling. All data
and browser traffic are synthetic. Physical Safari/iPhone not tested.
