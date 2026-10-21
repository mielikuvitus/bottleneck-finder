# Bottleneck finder | Load Testing Tool

A concept tool made for Monzo in a five-day mini hackathon. It load tests a
fictional fintech site, finds the first part to run out of room and its cause,
and leads with the impact on visitors, plus suggested fixes.

[Live dashboard](https://pixelation.io/monzo/dashboard/) ·
[Case study, day by day](https://pixelation.io/monzo)

Flooding a real bank with fake traffic would count as an attack, so I built a
fictional fintech site, **tomorrow**, to the same shape and hid four realistic
traps in it. Each one stays quiet on a normal day and only shows up
under peak traffic.

## Learnings

1. **Performance has many angles.** I come from frontend, so I'm used to
   looking at the React side. On the server, a heavy component blocks the
   event loop, and every other visitor waits in the queue behind it.
2. **Systems break all at once.** Response times stayed flat at low traffic
   and jumped past a certain point. Testing at normal traffic says little
   about peak traffic, and finding that point is the reason to load test.
3. **k6 (new to me).** It can model realistic visitors and traffic peaks. My
   first test used a [closed model](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/),
   with each visitor waiting for the site before moving on, so the
   pressure eased as the site slowed down. Switching to an open model, with
   visitors arriving at a set rate, made the breaking points show up. k6 has no
   view of the page, so browser screenshots show the page each visitor sees.
4. **Even percentiles lie (thanks Gil Tene).** The talk "How NOT to Measure
   Latency" changed my reading of p95. p95 hides the slowest 5% of requests and
   the share of real people running into them. I now read p95 as the best case for
   the unlucky visitors, and use the number of visitors giving up for the rest.
5. **Showing the data.** I wanted each trap to show its cost in people, such
   as the number of visitors giving up on sign-up. Reading up on presenting
   performance data taught me to state the meaning first and show the chart
   after, so every dashboard card opens with the impact and the graphs follow
   as evidence.

## Findings

The site handled a normal busy hour (110 visitors at once). At the assumed
campaign peak, just after an ad goes live (260 visitors at once), two parts
broke:

- **The homepage rates vanished.** Past about 160 visitors at once, every
  homepage visit showed "Couldn't load rates right now." The rates CMS takes
  only 10 requests at a time, so up to 352 requests ended up waiting in line.
- **The sign-up page ran the server flat out.** Past about 90 visitors at
  once, the server was 100% busy. Rendering the React page took 80% of its
  time and the email lookup another 16%. At campaign peak, 66% of visitors
  gave up before the page appeared.

## Impact of the fixes

I cached the CMS rates, pre-rendered the sign-up page at build time and added
an index on email. On the next runs, neither test found a breaking point up to
the campaign peak.

| At campaign peak                         | Before            | After      |
| ---------------------------------------- | ----------------- | ---------- |
| Homepage visits with broken rate cards   | almost all        | none       |
| Visitors giving up on the sign-up page   | 66%               | none       |
| Sign-up page p95 (slowest 5% of loads)   | 2.3 s             | 3 ms       |
| Server busy                              | 100%              | 24%        |
| Sign-ups in the same peak minute         | 2,086             | 6,483      |

The tests ran locally, so 3 ms is server time with no network in between.
Real visitors would add their connection time on top.

## Architecture

1. **Test site:** a small Express + SQLite site with the planted problems,
   and a `GET /metrics` route that reports the server's load each second.
2. **Load tests:** k6 sends simulated visitors in stages up to both peaks.
   Visitors keep arriving however slow the site gets, like real public
   traffic.
3. **Timeline:** server signals lined up with response times, one entry per
   second.
4. **Analyser:** rules find each route's breaking point (the knee) and match
   it to the resource that was full at that moment. The rules work only from measured
   data.
5. **Dashboard:** results, findings and suggested fixes in one view, each
   finding opening with the impact on visitors. An AI panel turns the
   findings into a prompt for ranked fixes (its replies are pre-written).

[DATAFLOW.md](DATAFLOW.md) shows the data flow between the server files.
[REFERENCE.md](REFERENCE.md) has the details: routes and their timings, load
test settings, server metrics, and every field the analyser writes.

## The planted problems

They're marked `// TRAP:` in the code. Traps 1-3 are fixed, with the old code
kept as `// BEFORE (trap N)` comments next to `// FIXED (trap N)`.

| #   | Problem                                                                                                                                                                           | Fix                                      | Files                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------- |
| 1   | **No index on email:** sign-up checks for an existing email with a full table scan                                                                                                | Index on email                           | `db.js`                             |
| 2   | **Uncached CMS call:** every rates request calls a fake CMS that allows only 10 requests at once and queues the rest, like a real rate-limited service                            | Rates cached for 60 s                    | `server.js`, `cms.js`               |
| 3   | **Uncached server-side rendering:** the sign-up page is rendered with React on every request, blocking the event loop                                                            | Pre-rendered at build time               | `server.js`, `prerender.js`, `views/SignupPage.jsx` |
| 4   | **Bonus, correctness under load:** an awaited fake "email validation" between the existence check and the insert lets duplicate emails through under concurrency                 | Not fixed, and not load tested yet       | `server.js`, `emailValidation.js`   |

Sign-up only asks for an email; the account is finished in the app, so
passwords never touch the website.

## The fictional bank

The homepage (`GET /`):

<img src="docs/images/tomorrow1.png" width="800" alt="The tomorrow homepage: the headline 'Money feels better here.', an 'Open free bank account' button, and a phone showing a €12,840.25 balance and recent transactions">

The sign-up page (`GET /signup`):

<img src="docs/images/tomorrow2.png" width="800" alt="The tomorrow sign-up page: a welcome panel saying 'A brighter tomorrow starts here.' with a debit card illustration, next to an email field and a 'Continue with email' button">

## Run it yourself

Needs **Node.js** 24+ and **k6**. On a Mac with [Homebrew](https://brew.sh)
(for Windows or Linux, see the [k6 install guide](https://grafana.com/docs/k6/latest/set-up/install-k6/)):

```sh
brew install node k6   # first time only (skip node if you have it)
npm install            # first time only
npm run seed           # fills bank.db with 100,000 users
npm start              # builds the sign-up page, then serves http://localhost:3000
```

With the server running, in a second terminal:

```sh
npm run load:smoke     # 1 visitor for 10 seconds: checks everything works
npm run load           # main test, about 9.5 minutes
npm run load:signup    # sign-up test, about 11 minutes
npm run analyze -- load-tests/results/<main run>      # analyse the main run first
npm run analyze -- load-tests/results/<sign-up run>   # then the sign-up run
```

Both full tests reseed the database first; run `npm run seed` afterwards to
remove the users they created. Results go in `load-tests/results/<run>/`.

To see the runs in the dashboard (run `npm install` inside `dashboard/` the
first time):

```sh
npm run dashboard:data   # copy runs and screenshots into dashboard/public/data
npm run dashboard        # http://localhost:5173/monzo/dashboard/
```
