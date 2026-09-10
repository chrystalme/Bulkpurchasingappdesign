# Lessons

- [2026-09-10] **"Kill the services" does not mean "kill everything listening".** I stopped my own
  vite dev server *and* the pre-existing backend API (:3001) that was already running before the
  session, and the user's app then failed to load. Pattern: before killing anything, check each PID's
  start time / parent (`ps -o pid,ppid,lstart,command`) and only stop processes this session started.
  Shared infrastructure (backend, database) needs an explicit confirmation, even inside a
  "kill the services" instruction.

- [2026-09-10] **`src/index.css` is a committed build artifact and drifts.** It was 45 selectors behind
  the sources (`.p-5`, `.bg-emerald-100`, `.sm:items-center`, …), so those classes rendered as nothing.
  After adding component classes or syncing from Figma Make, regenerate it:
  `node node_modules/@tailwindcss/cli/dist/index.mjs -i src/styles/globals.css -o src/index.css`,
  then confirm the size (~168KB, not the ~60KB v4 skeleton).

- [2026-09-10] **Triage "app not loading" from the console's first exception, not from infra.** The
  real failure was `VendorAnalytics.tsx:124 — Cannot read properties of undefined (reading
  'toLocaleString')`: React unmounts the entire tree when a render throws and there is no error
  boundary, so one bad screen looks like a dead app.

- [2026-09-10] **API/type convention mismatch, second occurrence.** The Express backend answers in
  `snake_case` while the frontend types promise `camelCase` (already known for orders → normalised in
  `ordersSlice.ts`). `/vendors/:id/dashboard` returned *none* of the eight `VendorStats` keys, so
  `stats.totalRevenue` was always `undefined`. Normalise at the API boundary (`src/lib/api.ts`) so
  every consumer gets the shape its types promise, and missing fields degrade to `0` rather than
  crashing a screen. Products had the same defect (prices arrive as strings) — the vendor list was
  rendering `₦undefined`; `/products` and `/products/:id` now normalise on read and map back to
  `snake_case` on write, per `FRONTEND_INTEGRATION_GUIDE.md`.

- [2026-09-10] **A GET that nothing invalidates must not be cacheable.** `backend/middleware/caching.js`
  sent `Cache-Control: public, max-age=300..900` on reads and every write only set `no-store` on
  *itself*, so an edit stayed invisible in the UI for up to 15 minutes (`transferSize: 0` in
  `performance.getEntriesByType('resource')` proves the refetch never reached the server). Symptom to
  recognise: mutation persists in the DB but the list does not change. Fix = `no-store` on mutable,
  auth-scoped reads (products, vendors, orders, groups, escrow).

- [2026-09-10] **Verify with the API and the DOM, not just the UI.** "Saved successfully" toast + a
  stale list made the edit look broken when the write had landed. Reading the row back from the API
  separated "did the write persist" from "did the UI refresh" in one step.

- [2026-09-10] **Rate limits block automated UI verification.** `generalApiLimiter` = 100 requests /
  15 min / IP and `loginLimiter` = 10 logins / 15 min / IP. A role sweep (many reloads, each firing
  5-10 API calls) exhausts them and every request answers `429 {"error":"Too many requests..."}`, so
  logins start failing mid-sweep for no apparent reason. Both stores are in-memory: restarting
  `node server.js` clears the counters. Budget ~1 login and ~6 screen visits per backend restart.

- [2026-09-10] **Headless Chrome dies after ~8 rapid `Page.reload` cycles.** Run sweeps in chunks of
  ~6 screens, each chunk its own process, appending results to a JSON/log file so a crash cannot lose
  the completed part.

- [2026-09-10] **Check `git status` for other people's in-flight work before committing.** This repo
  had 11 uncommitted files from a parallel session (`usersSlice`, `TransactionHistory`, backend
  routes, `tasks/*.mjs`). Stage explicit paths for your own change instead of `git add -A`, so the
  history stays honest and half-finished work is not swept into your commit.

