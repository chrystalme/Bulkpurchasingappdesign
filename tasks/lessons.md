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
  crashing a screen.
