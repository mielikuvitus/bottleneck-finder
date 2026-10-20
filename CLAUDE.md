# Bottleneck finder

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

Deliberate performance traps are marked `// TRAP:`.
Don't fix or flag them unless I ask.

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

## To Do list

Day 4: the dashboard

[ ] Later, once the analyser works: a combined k6 test that runs the main and sign-up scenarios at the same time, to check the analyser can untangle mixed causes

## Day 5 tasks

### 1. Before/after fix run

Apply one fix per trap, re-run both tests, and compare with the
current runs. Keep the trap code commented as "before" so the
change is easy to show.

- [ ] Trap 2 (rates): cache CMS rates on the server for ~60s, and
      drop queued CMS requests whose visitor has already left
- [ ] Trap 3 (sign-up page): pre-render /signup at build time,
      like the homepage
- [ ] Trap 1 (email lookup): add an index on users.email
- [ ] Re-run main + sign-up tests, run the analyser, save as
      "after" runs
- [ ] Dashboard: before/after toggle per finding

### 2. LLM layer (designed, not connected)

- [ ] Define the input: a compact summary built from findings.json
      (no raw timeline data)
- [ ] Define the output schema the LLM should return
- [ ] Write the prompt template
- [ ] Fix ranking: hand the LLM each finding's metrics and
      `suggested_fixes` and have it rank them most recommended first
      (with a reason per fix) and add any fixes it thinks are missing.
      The analyser's lists aren't ranked today (some mix in checks like
      EXPLAIN QUERY PLAN or profiling), so it also separates "check
      first" steps from fixes. The dashboard title then says "most
      recommended first"
- [ ] Dashboard panel: "Prompt preview" (exactly what would be sent)
      and a canned response rendered in the same verdict card style
- [ ] Note in the UI: "Not connected. Shows the planned contract."

### 3. Ship it

- [ ] Re-publish the dashboard if the analyser changed or tests were
      re-run today: re-analyse the runs (main first), npm run
      dashboard:data, npm --prefix dashboard run build, then copy the
      contents of dashboard/dist/ into monzo/dashboard/ on the build
      log site
- [ ] Deploy the dashboard to Vercel as a static site (recorded
      runs only, no test site, no live tests)
- [ ] Make the repo public, with a README: what it is, how to run
      it locally, the traps, the assumptions, and attribution
      ("I direct; Claude Code types")
- [ ] Remove anything that shouldn't be public (local paths, .db
      files, large raw results)
- [ ] Remove unused components and tokens (`Stat`, `ScenarioTag`,
      the `--color-chart-1` to `-6`, `--color-chart-grid` and
      `--chart-height` tokens)

### 4. Write-up and presentation

- [ ] Day 4 and Day 5 build log entries
- [ ] Final summary at the top of the case study: what it found,
      what the fixes changed, what I learned
- [ ] Screenshots: dashboard, the collapse chart, before/after,
      a fallback screenshot
- [ ] Presentation slides

### Stretch (only if time allows)

- [ ] Trap 4 race test: many sign-ups with the same new email at once
- [ ] Blind test: plant an unknown trap and see if the tool finds it
- [ ] Confirm whether "couldn't connect" failures came from the
      macOS listen queue (somaxconn 128)
- [ ] One Toxiproxy run with ~100ms network latency
