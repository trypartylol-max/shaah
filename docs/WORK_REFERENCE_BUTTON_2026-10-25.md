# Work follows the supplied screenshot

Replaced the three clickable-looking panels with the screenshot's compact
header, thin three-segment progress strip, amount labels underneath, and one
separate button. The button clearly names the next amount: Complete 400, 650,
800+. Cumulative score remains 10/20/25. At completion, the single button offers
undo of the last level only (25 -> 20), retaining the previous approved logic.
Legacy partial state, historical days and Vacation/account guards remain.

182 automated regressions pass. Synthetic browser verified the visible single
button, screenshot-style progress strip, all three amounts and last-level undo.
No schema, data migration or historical scoring change.
