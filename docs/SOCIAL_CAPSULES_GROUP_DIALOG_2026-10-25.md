# Contact capsules, group organization and modal editor

User clarified the capsule model in this turn, superseding the earlier 30%
threshold and always-empty overdue representation. Remaining days are positive:
fill drains green to zero on the due day. At zero the pill is orange and empty.
After due, negative remaining days refill the pill orange through 40% overdue,
red strictly after 40%. At twice the contact interval (one full interval overdue)
the pill reaches 100% and stays full until the next encounter. Every-10 example:
day 6 green 40%, day 10 orange 0%, day 14 orange 40%, day 15 red 50%, day 20+
red 100%. No-history stays neutral. Only presentation changes; encounter dates,
IDs, frequencies, Work/Vacation and score calculations remain untouched.

Moved bulk Organizar varias personas por grupo from Social to Social Settings.
Renaming/adding a group opens a native modal dialog attached directly to body,
centered in the viewport top layer with a dimmed backdrop and focused input.
Escape, Cancel and backdrop dismiss without saving; Save uses the existing
per-account config revision path. It cannot be clipped by the directory reveal
or positioned at the bottom of the page. Modal state resets on account switch.

Core inner cards now share the level palette without an extra background fill.
Work retains the user-approved single control but uses a continuous, lower,
neutral segmented bar (48px); all three amounts and 10/20/25 scoring remain.

182 regressions passed, including clarified capsule thresholds/fill/cap/signs,
group identity/history preservation, settings conflicts, account isolation and
Work/Vacation. Browser synthetic QA verified modal centering, save, Escape
cancel and bulk tools in Social Settings. Missing screenshot was not available
for exact visual matching; no claim is made to reproduce it.
