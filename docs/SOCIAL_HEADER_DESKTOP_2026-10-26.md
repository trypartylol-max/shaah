# Social desktop header

Baseline OG: 19573cc606c09236154ba507b8fe24e7dd78afba.
Extends the approved mobile header presentation to desktop >=880px:
centered day label/back/forward, Who to See raised to the same row at its
existing left edge, header percentage hidden. The desktop date label retains
its full width; historical Today return is centered below with space reserved.
Only CSS changes; no scoring, persistence, account or backend changes.

36 targeted tests passed. Browser checks: 320,390,600,879,880,1024,1440,1920px,
header centering/alignment, original title x, historical navigation, no overflow,
unchanged data, unchanged mobile rendering with desktop rule enabled/disabled.
No browser runtime/CSP errors or unmocked requests. Desktop screenshot inspected.
Physical devices and live authenticated edits were not tested.
