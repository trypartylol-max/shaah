# Today desktop TEST

Branch: test/today-desktop-20261029
Base: main aaef3663157b282739e381ef7702524e734f5f3b (read only).

Inspected source/index.html, source/app.js, source/app.css, optional skin and responsive assets, and preview documentation. Implementation is an additive desktop stylesheet loaded by the source entrypoint and generated index. No application logic, handlers, configuration, storage keys, historical data or backend were changed. Existing native navigation becomes a sidebar from 1180px; below that the current tablet/mobile layout remains. Core routines, levels 2/3, Social Combo and Day Note use their existing live markup.

Browser checks use the existing isolated synthetic backend, never live user records. They cover responsive widths 320–1920, column geometry, native Log navigation, routine credit and runner, habits/history/reload, Day Log and Social contacts.

No branch preview workflow or Vercel/Netlify/hosting manifest exists in this GitHub checkout. qa/preview/README.md describes a separate private Site with a separate Worker/source repository and runtime credentials; pushing this TEST branch does not update that Site. No production deployment or main update was performed. An authenticated preview would retain the existing backend unless separately configured; this branch is code isolation, not a newly provisioned data environment.

The earlier conversation's assistant mockup could not be retrieved as an image (only content-reference markers were returned); implementation follows the explicit approved composition in the user's continuation request.
