# Social mobile header adjustment

Local baseline: 6c8ae6ee333cdc06e0c4215c063b9c7e1bff0beb in shaah-production.
Read sources/SHAAH-FINAL.html and the master handoff as read-only reference.
The supplied HTML predates the integrated Who to See workspace; changes target
this newer local repository. Live deployment parity was not checked; no publish,
remote push, database operation, or production-session interaction occurred.

Only mobile Social CSS changes at <=879px: center the day label and arrows,
raise Who to See onto that row at the same left edge, hide the header percentage.
Historical dates retain arrows and a separate centered Today return button;
long date text truncates within its existing full-text span to prevent overlap.
Scoring, data, Today and desktop code are unchanged. Versioned CSS and its HTML
integrity reference were rebuilt with the existing build script.

Validation: browser checks at 320,390,600,879,880,1440px; mobile centering,
heading alignment and horizontal position, no overflow, previous/Today actions,
unchanged records; desktop before/after header geometry equality. No browser
runtime/CSP errors or unmocked network requests. 35 Social integrated/scoring
regressions passed, including historical Work/Vacation fixtures and later Work.
390px screenshot inspected. Physical iOS and live deployment were not tested.

This is a local reviewable repository change, not a certified production release.
