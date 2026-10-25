# Core button event correction and compact Work reference

Reproduced the reported bug with synthetic Production/WOD routines using the
real UI dispatcher and repaint path. Clicking FULL/DONE repainted the action
container into the Clear control while the same delegated click was still
walking its captured ancestors. It then ran Clear as a second action, reverting
the completion immediately. Stopping propagation for setHabitState and
startRoutine prevents that second action. Work advancement already had this
guard. Other UI propagation behavior is retained.

Preserved the locally prepared Work reference design: compact header/points,
thin three-segment strip, amount labels and one separate button naming the next
amount. It advances 400/650/800+ for cumulative 10/20/25; the completion action
undoes only the last phase. Existing partials and historical scoring stay intact.

184 automated regressions passed, including two new reproductions of the
mutating-ancestor click. Synthetic browser verified LIGHT -> FULL remains set,
Clear, WOD Done, Production Start/Back, and all three Work phases. No real
activity or contacts were changed in browser QA. No migration, auth, backend or
stored-history change. Candidate Work asset/doc present at task start retained.
