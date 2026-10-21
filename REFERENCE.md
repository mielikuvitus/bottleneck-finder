# Reference

The details behind the [README](README.md): routes, load test setup, server
metrics and how the analyser works. [DATAFLOW.md](DATAFLOW.md) shows how the
server files talk to each other, and [dashboard/COMPONENTS.md](dashboard/COMPONENTS.md)
lists every dashboard component.

## Setup notes

- **`npm run seed`** clears the table first, so it's safe to re-run, and you always get exactly 100,000 users: user1@example.com to user100000@example.com (ids 1 to 100,000). Users added since the last seed are deleted.
- **`npm start`** first runs `npm run build`: esbuild compiles the React sign-up page (`views/*.jsx` → `build/`) and `prerender.js` renders it once to `build/signup.html`. Then it runs the server with `NODE_ENV=production`. This matters for load tests: React's development build renders about 10 times slower.
- `curl localhost:3000/hello` should print `hello` once the server is up.

## Routes

"Quiet" is the median response time with nothing else hitting the server,
measured with `./baseline.sh` (1 warm-up request, then the median of 5; run
`npm run seed` afterwards). Before: 2026-10-18, with the planted traps. After:
2026-10-20, with the Day 5 fixes for traps 1-3. Both on an Apple M4, macOS
15.3.2, Node 24.21.0.

| Route                                                                   | What it does                                                                                                                                                                           | Quiet before | Quiet after |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -----------: | ----------: |
| `GET /hello`                                                            | `hello`, to check the server is up                                                                                                                                                     |        0.6ms |       0.8ms |
| `GET /metrics`                                                          | How busy the server was in the last second (JSON), not cached                                                                                                                          |            – |           – |
| `GET /`                                                                 | Homepage (HTML), a static file, cacheable for 1 hour. Its script `home.js` loads `/api/rates` and gives up after 3s                                                                    |        0.7ms |       1.4ms |
| `GET /styles.css`, `/home.js`, `/signup.js`, `/icons/*`, `/favicon.svg` | Static files, cacheable for 1 hour (time measured for `styles.css`)                                                                                                                    |        0.8ms |       1.1ms |
| `GET /api/rates`                                                        | Savings rates (JSON). Before: a fake CMS call on every request, 200-300ms (trap 2). After: cached for 60s, so one request a minute waits for the CMS                                   |        243ms |       1.0ms |
| `GET /signup`                                                           | Sign-up page (HTML). Before: rendered by React on every request, about 14ms (trap 3). After: pre-rendered at build time. Its script `signup.js` submits the form and gives up after 3s |         17ms |       0.9ms |
| `POST /api/signup` (new email)                                          | `201` created. Email lookup (before: a full table scan, trap 1; after: the index) plus fake email validation, random 50-150ms (trap 4)                                                 |        132ms |       114ms |
| `POST /api/signup` (taken email)                                        | `409` already taken: the email lookup only. `400` if it isn't an email                                                                                                                 |        4.3ms |       0.9ms |

The rates (before) and new-email times include random waits, so they vary by
a few dozen milliseconds between runs.

To try a sign-up from the terminal:

```sh
curl -i -H 'Content-Type: application/json' -d '{"email":"me@example.com"}' localhost:3000/api/signup
```

## Load tests

With the server running (`npm start`), in a second terminal:

```sh
npm run load:smoke   # 1 virtual user for 10 seconds: checks everything works
npm run load         # main test, about 9.5 minutes
npm run load:signup  # sign-up test, about 11 minutes
```

Both full tests reseed the database first. Run `npm run seed` afterwards to
remove the users they created. For a quick dry run: `RAMP=5s HOLD=5s npm run load`.

Both tests are _open_: k6 starts a set number of visits per second however
slow the site gets, like real public traffic.

|          | Main test (`main.js`)                                                                                                  | Sign-up test (`signup.js`)                                                                   |
| -------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Visitors | Land on `/` and load `/api/rates`; 30% go on to `/signup`; 60% of those submit                                         | Land straight on `/signup`, like an ad linking to sign-up; 75% submit                        |
| Levels   | 5, 12, 24, 35, 45, 57 visits/s: 24 is the expected peak and 57 the campaign peak; 35 and 45 sit around rates' capacity | 10, 25, 40, 55, 70, 100, 160 visits/s (about 70 is the expected peak, 160 the campaign peak) |

Every level ramps up for 30s and holds for 1 minute. Visitors think 1-3s
between steps, and 1 in 10 submissions reuses a seeded email (expects `409`).
The main test's levels come from the peaks in `test-config.json` (visitors at
once / `planning_visit_seconds`), so they move if you change the peaks.

- **Assumptions** are in [load-tests/test-config.json](load-tests/test-config.json): the peaks (110 visitors at once on a busy hour, 260 after an ad), the funnel percentages, visitor patience (3s) and the table size.
- **Route context:** [analyzer/route-context.json](analyzer/route-context.json) says what each route means to a visitor, its fallback, the site's own timeout, and what a visitor does when it fails (`on_failure`).
- **Names:** [analyzer/names.json](analyzer/names.json) gives the code names in the server's metrics (`cms`, `findUserByEmail`, …) plain-English names for the findings' wording; the evidence keeps the code name in brackets.
- **Patience:** visitors leave after 3s on the homepage, the sign-up page and the form. Rates fails quietly after 3s instead (the cards show the fallback), and the visit carries on as _degraded_. k6 uses the site's own timeout or the visitor's patience, whichever is shorter.
- **Counters:** `fallback_shown` counts every request where a visitor would see a fallback, by route and reason (`timeout`, `connection`, `server_error`). `funnel` records each step, including `left` and `degraded` (with where and why), and `signup_lost` for a failed submission.
- **Pass or fail:** a run fails if p95 goes over 500ms (overall or for any route), or if more than 1% of requests fail. Failing is expected: the point is to see which route crosses first.

**Results** go in `load-tests/results/<run>/` (ignored by git):

- `summary.json`: k6's end-of-test summary
- `raw.csv.gz`: every measurement, tagged with its `route`
- `metrics.jsonl`: the server's `GET /metrics`, once a second
- `timeline.json`: one entry per second, with each route's requests/s, p50, p95, errors and timeouts, merged with the server metrics
- `options.json`, `test-config.json`, `route-context.json`: what the run was set up with
- `findings.json`: written by the analyser
- `run.json`: which test it was, the git commit (and whether there were uncommitted changes), and whether the run is `superseded`

Older runs that no longer match the current setup are renamed `<run>-superseded`, with `superseded: true` and a reason in `run.json`. A dashboard should leave them out by default. The analyser still reads them, and labels their findings as superseded.

**Server metrics.** `GET /metrics` reports how busy the server was in the last
second ([metrics.js](metrics.js)):

| Field                                              | Meaning                                                                                                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cpuPercent`                                       | CPU the server process used. 100% is one core; it can go a little over because Node also uses helper threads                                                        |
| `eventLoop.utilization`                            | Share of the second the event loop was busy, 0 to 1. Near 1 means Node is saturated and every request waits                                                         |
| `eventLoop.delayP50Ms`, `delayP99Ms`, `delayMaxMs` | How late a 10ms timer fired: roughly how long a new request had to wait for the loop to be free. `null` when the loop was so busy the timer never fired that second |
| `eventLoop.samplerLateMs`                          | How late this 1-second sample itself ran. Also a measure of a blocked loop, and still works when the delay fields are `null`                                        |
| `windowMs`                                         | How long the sample actually covers. Usually 1000, longer when the loop is blocked: divide totals by this, not by 1000                                              |
| `db.<query>`                                       | For each database query: how many ran, their total, average and slowest time in ms, and `op` (`read` or `write`)                                                    |
| `render.<page>`                                    | The same for each server-side React render (`SignupPage`)                                                                                                           |
| `cms`                                              | Fake CMS slots in use (`inFlight` out of `limit`) and requests waiting (`queued`)                                                                                   |
| `memoryMb`                                         | Total memory (`rss`) and JavaScript heap in use                                                                                                                     |
| `pollMs`                                           | Only in `metrics.jsonl`: how long `/metrics` took to answer. A blocked server answers late                                                                          |

## Analyser

```sh
npm run analyze -- load-tests/results/<main run>     # first
npm run analyze -- load-tests/results/<sign-up run>  # then
```

**The sign-up test is a campaign scenario** (`scenario: "campaign"` in `test-config.json`). Every visitor goes straight to `/signup`, which only happens during a sign-up ad, so comparing it with a normal day would overstate the risk: normally about 30% of visitors reach sign-up. Its findings are judged at the campaign peak, and their normal-day impact and headroom come from the latest main run that isn't superseded. So analyse the main run first. If the two runs were made on different code (a different git commit, or uncommitted changes), the findings warn that the normal-day numbers may be out of date, and set `normal_day_confidence` to low.

It writes `findings.json` into the run folder and prints a summary. The code
is in `analyzer/`:

- [analyze.mjs](analyzer/analyze.mjs): the numbers, knees and visit model
- [rules.mjs](analyzer/rules.mjs): the findings
- [describe.mjs](analyzer/describe.mjs): the wording

The rules use only what was measured, never the names of the planted problems.

1. **Per-stage numbers** for each 1-minute hold, per route and for the server. Times and throughput count successful requests only: a refused connection fails instantly, so it isn't a wait or a completed request.
2. **The knee:** the first stage where a route's p95 is at least 1.5x the previous stage's _and_ at least 100ms slower, or where errors go over 1%.
3. **What was saturated at the knee:**
   - a pool with every slot busy and requests queueing, or
   - the event loop 90%+ busy (or requests waiting 100ms+ to start).

   Busy time is split between timed renders and queries. A timed operation belongs to the route whose successful requests match its call count.

4. **The visit model,** from the healthy stages before any knee: how long a visit lasts, and how many requests of each route it makes. Each stage also reports the _measured_ visitors at once (active virtual users), next to the planned number: when the site slows down, visits stretch and the measured number grows, a sign of people stuck waiting. Peaks are matched to stages by arrivals, using the planned number.

Each finding has:

| Field                                                                   | How it's worked out                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `knee_at`                                                               | The stage, its load, and the p95 before and after                                                                                                                                                                                                                                                                                                                                                                                                    |
| `evidence`, `likely_cause`, `suggested_fix`                             | Plain sentences with the measured numbers                                                                                                                                                                                                                                                                                                                                                                                                            |
| `suggested_fix_groups`, `cause.contributors`                            | When several timed operations fill the event loop, they're one finding (one event loop, one bottleneck): the main cause is the biggest share, `cause.contributors` lists each with its share, and the fixes are also grouped by cause. Fixing the main cause leaves the rest in the next run's finding, or as its own slow-lookup finding                                                                                                            |
| `confidence`                                                            | high: 2+ signals that weren't there at the previous stage; medium: 1; low: nothing measured was saturated                                                                                                                                                                                                                                                                                                                                            |
| `confidence_reason`, `confidence_signals`                               | One plain sentence on what the confidence rests on (shown in the dashboard's evidence), and the signals behind it, each marked new at the knee or already there before                                                                                                                                                                                                                                                                               |
| `user_impact_now`, `_at_campaign`, `_at_limit`                          | At the stage closest to the expected peak, the campaign peak and the highest load, first the outcomes: visitors who left (and why), lost sign-ups and degraded visits. Then the waits for those who got an answer ("half over X, 1 in 20 over Y") and visits with at least one wait in the slowest 5%, 1 - 0.95^(requests per visit)                                                                                                                 |
| `capacity`                                                              | The most successful requests/s reached at any stage up to the knee (past it, useful throughput can collapse), and visitors at once = visits/s x visit length (Little's law)                                                                                                                                                                                                                                                                          |
| `headroom`                                                              | (break point - peak) / peak, at both peaks; below 0 means already over                                                                                                                                                                                                                                                                                                                                                                               |
| `fallback_point`                                                        | Predicted: the wait reaches the timeout after timeout x capacity / (arrivals - capacity) seconds. Measured: the first timeout, when timeouts become sustained (1%+ for 3s), and refused connections. A closed test can't confirm the prediction                                                                                                                                                                                                      |
| `if_ignored`                                                            | "capacity cliff" (fine, then it tips over), "grows with data" (a slow single-row read suggests a full scan) or "stable"                                                                                                                                                                                                                                                                                                                              |
| `severity`                                                              | critical: over the limit or failing at expected peak; high: under 50% headroom at expected peak, or over at campaign peak; medium: under 50% at campaign peak; low: the rest. For a campaign scenario: high if over the limit or failing at campaign peak, medium if under 50% to spare there, low otherwise, but critical if the main test shows normal days failing too. A failure on a critical route (`POST /api/signup`) makes it at least high |
| `can_wait`                                                              | One sentence from the severity and headroom, plus `can_wait_title`, a short heading chosen from the reason (it only mentions a campaign when the campaign peak is the reason)                                                                                                                                                                                                                                                                        |
| `headline`, `load_levels`, `customer_view`, `evidence_summary`, `cause` | For the dashboard: what visitors experienced in one line, how much traffic it carries against both peaks (room only when it fits), which page and screenshot state to show, the evidence in one sentence, and what filled up                                                                                                                                                                                                                         |

`findings.json` also has the healthy routes (no knee): `healthy_up_to`, the
highest load tested, and per route its `p95` at that load (plus `note`, the
whole sentence).

When a run has no findings and no knees, `findings.json` also has
`all_clear`: `title` ("No problems found."), `summary` (tested up to which
load, and how many requests failed) and `keep_fresh` (it only holds for the
code that was tested).

`findings.json` also has the funnel: how many visitors reached each step, the
voluntary drop-off (left the sign-up page), and the lost sign-ups (the
submission failed or timed out) at both peaks. Each step has a `kind` (`path`,
`exit` or `degraded`) and `why`, its reasons in words ("878 couldn't connect,
13,585 got no answer within 3s").
