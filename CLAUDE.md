# Bottleneck finder | Load Testing Tool

A 5-day learning project: a concept tool that load tests a fictional
fintech site and explains what breaks first.

## Where things are

Read the docs before the code: [README.md](README.md) (setup, tests, metrics
fields, analyser fields), [DATAFLOW.md](DATAFLOW.md) (how the server files talk),
[dashboard/COMPONENTS.md](dashboard/COMPONENTS.md) (every component, its props
and data).

- **Test site:** `server.js` (routes), `db.js`, `cms.js` (fake CMS, trap 2),
  `emailValidation.js` (trap 4), `metrics.js` (GET /metrics), `seed.js`,
  `views/SignupPage.jsx` (trap 3), `public/` (homepage, `home.js`, `signup.js`)
- **Load tests:** `load-tests/` — `main.js`, `signup.js`, `smoke.js`, `lib.js`
  (shared), `run.sh` (runs k6 and saves results), `poll-metrics.mjs`,
  `test-config.json` (assumptions)
- **Analyser:** `analyzer/` — `analyze.mjs` (numbers, knees), `rules.mjs`
  (findings), `describe.mjs` (wording), `timeline.mjs` (builds timeline.json),
  `route-context.json`, `names.json`
- **Dashboard:** `dashboard/src/` — `components/{atoms,molecules,organisms,page}`,
  `data/` (useRun, `series.js` chart rows), `styles/tokens.css`;
  `dashboard/scripts/copy-data.mjs` (npm run dashboard:data)
- **Run results:** `load-tests/results/<run>/`. Read `findings.json` or
  `run.json`; `timeline.json` is large, so search it rather than reading it whole.
- **Don't read:** `node_modules/`, `dashboard/dist/`, `build/`, `*.db`,
  `raw.csv.gz`, `metrics.jsonl`, `dashboard/public/data/` (copies of results)

## How to help me

- I'm learning these concepts. Explain the approach before writing code.
- Keep explanations concise unless I ask for more.
- When a to-do is done, delete it from the To Do list below. Don't keep a
  list of finished to-dos.

## Stack

- Express + better-sqlite3 (test site)
- React server-side rendering for the sign-up page (JSX compiled with esbuild)
- k6 (load testing)

## Planted problems

Deliberate performance traps were marked `// TRAP:`. On Day 5, traps
1-3 were fixed: the old code is kept as `// BEFORE (trap N)` comments next
to `// FIXED (trap N)`. Trap 4 is still in place. Runs made after the fixes
are labelled `VARIANT=after` (folder suffix `-after`).
Don't fix or flag the remaining trap unless I ask.

1. No index on email: sign-up checks for an existing email with a full
   table scan.
2. Uncached CMS call: rates are fetched from a fake CMS on every request.
   The fake CMS allows only a limited number of requests at once and
   queues the rest, like a real rate-limited service.
3. Uncached server-side rendering: the sign-up page is rendered from React
   on every request, blocking the event loop.
4. Bonus, correctness under load: an awaited fake "email validation" call
   between the existence check and the insert lets duplicate emails
   through under concurrency.

### Stretch (only if time allows)

- [ ] Trap 4 race test: many sign-ups with the same new email at once
- [ ] Blind test: plant an unknown trap and see if the tool finds it
- [ ] Confirm whether "couldn't connect" failures came from the
      macOS listen queue (somaxconn 128)
- [ ] One Toxiproxy run with ~100ms network latency
- [ ] A combined k6 test that runs the main and sign-up scenarios
      at the same time, to check the analyser can untangle mixed
      causes
