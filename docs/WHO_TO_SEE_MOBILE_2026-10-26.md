# WHO TO SEE mobile layout — 2026-10-26

Base main: b32b797. Public index.html matched this commit byte for byte before editing.
CSS-only production change at <=600px: three columns, two rows per contact;
left symbol, centered 14px name, proportional pill and edit on second row.
Mobile hides the existing last-seen line. JavaScript, scoring, people and data
are unchanged. Names keep existing ellipsis for long content.
The earlier conversation returned text references without the approved image;
14px is the implementation interpretation, not a verified pixel match.

Validation: 54 Social/history/migration/order unit regressions passed.
Targeted Chromium layout test passed at 320/390/600px; desktop geometry matches
the previous production CSS at 601/880/1440px. Encounter and edit buttons work
with synthetic data, historical rows unchanged. Screenshot inspected at 390px.
No runtime/CSP/integrity errors or real backend requests in targeted browser QA.
Diff reviewed: CSS only plus stylesheet hash/SRI, test helper and layout test.
The existing mobile circular LOG stylesheet link is preserved in public HTML.

Existing social-browser.test.cjs uses obsolete UI selectors and fails; its
Friends selector timeout reproduced on unmodified b32b797 as well. No attempt
made to rewrite that unrelated suite. No real-device iOS or full application
production-certification run; this is a narrowly validated presentation update.
