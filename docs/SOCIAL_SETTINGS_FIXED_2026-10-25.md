# Fixed Social placement and dedicated settings

Removed the obsolete Own tab / In Today option and its UI action. Social is
always present, including for accounts with a legacy socialTab:false preference.
That legacy field is ignored without rewriting saved settings or history.

Moved category rules, Work/Vacation weights and romantic capacity from Habits &
Weights into Settings -> Social Settings. Removed the generic combo habit row
from Habits & Weights so controls are no longer duplicated. Added a direct
Social Settings shortcut from Social. People/groups/frequencies stay in Social;
the existing compact Today recording block remains available.

No scoring, category identity, historical snapshots, configuration migration,
Auth or backend changes. Existing subSet/subToggle revision-save paths remain.
182 automated regressions passed, including legacy optional-tab visibility and
history preservation. Synthetic browser verified the direct shortcut, dedicated
rules section and absence of the obsolete selector.
