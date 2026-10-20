# Data flow

How the JS files talk to each other right now. Seeding fills the database;
the server reads and writes it through the same `db.js` when people sign up.

## 1. Seeding (run once with `npm run seed`)

```
   $ npm run seed
         │
         │  package.json runs "node seed.js"
         ▼
  ┌──────────────┐   require('./db')   ┌──────────────┐
  │   seed.js    │ ──────────────────▶ │    db.js     │
  │              │                     │              │
  │ makes 100k   │ ◀────────────────── │ opens file,  │
  │ fake users   │   returns `db`      │ creates      │
  └──────┬───────┘   connection        │ users table  │
         │                             └──────┬───────┘
         │  SQL through `db`                  │ better-sqlite3
         │  (synchronous):                    │ CREATE TABLE IF NOT EXISTS
         │  DELETE, then 100k INSERTs         │
         │  in ONE transaction                │
         ▼                                    ▼
  ┌─────────────────────────────────────────────────────┐
  │  bank.db  (SQLite file on disk)                     │
  │  users: id, email, created_at                       │
  │  idx_users_email (Day 5 fix for trap #1)            │
  └─────────────────────────────────────────────────────┘
```

## 2. Serving (run with `npm start`)

```
   $ npm start
         │
         │  package.json runs "prestart" first: esbuild compiles
         │  views/SignupPage.jsx → build/views/SignupPage.js
         │  then runs "NODE_ENV=production node server.js"
         ▼
  ┌──────────────────────────────────────────────────────┐
  │  server.js   Express app, listening on port 3000     │
  │                                                      │
  │  GET /hello      → "hello"                           │
  │                                                      │
  │  GET /           → reads public/index.html           │
  │                    Cache-Control: public, 1 hour     │
  │                                                      │
  │  GET /styles.css → express.static reads public/      │
  │  GET /icons/*      Cache-Control: public, 1 hour     │
  │                                                      │
  │  GET /api/rates  → asks cms.js when the cache is old ┼──┐
  │                    → rates as JSON                   │  │ require('./cms')
  │                    Cache-Control: public, 60s        │  │ getRates()
  │                    cached 60s, one shared refresh    │  │
  └──────────────────────────────────────────────────────┘  ▼
         ▲    │                                   ┌─────────────────────────┐
  HTTP   │    │  response                         │  cms.js  (fake outside  │
  request│    │  (text / HTML / JSON)             │  CMS service)           │
         │    ▼                                   │                         │
  ┌──────────────┐                                │  10 slots in use at once│
  │ curl/browser │                                │  each takes 200-300ms   │
  └──────────────┘                                │  extra requests wait in │
                                                  │  a queue (no limit)     │
                                                  └─────────────────────────┘
```

The CMS wait doesn't block: while rates requests wait, Node keeps answering
other requests, so the homepage stays fast.

Day 5 fix for trap #2: the server keeps the rates for 60s, so at most one
rates request a minute reaches the CMS. When the cache is old, everyone who
asks shares one CMS call. A visitor who gives up (the connection closes)
stops waiting, and when nobody is left waiting, the call leaves the CMS
queue. The paragraph below describes the site before the fix.

The CMS can only finish about 40 requests a second (10 slots, ~250ms each).
Below that, rates take ~250ms. Above it, the queue grows and every rates
request waits longer and longer. That's the knee.

A browser loading the homepage makes about 11 requests: the HTML, then
`styles.css`, `home.js` and 7 icons from our server, plus the Manrope font
from Google Fonts (which never touches our server). Then `home.js` calls
`GET /api/rates` straight away and fills in the "Our savings rates" cards, so
**every homepage visit triggers one rates request** (before the Day 5 fix,
that meant one CMS call). k6 only fetches what its script
asks for, so the load test requests `/` and `/api/rates` itself.

## 3. Sign-up (the homepage buttons link to `/signup`)

```
  browser
     │  GET /signup
     ▼
  ┌──────────────────────────────────────────────────────┐
  │  server.js                                           │
  │  sends build/signup.html     ◀── prerender.js        │
  │  no CPU work per request        renders SignupPage   │
  │  Cache-Control: public, 1 hour  once, in npm run     │
  │  Day 5 fix for trap #3          build                │
  │  (before: a ~15ms React render on every request)     │
  └──────────────────────────────────────────────────────┘
     │  HTML page + public/signup.js
     ▼
  browser: user types an email, signup.js sends it
     │  POST /api/signup  {"email": "..."}
     ▼
  ┌──────────────────────────────────────────────────────┐
  │  server.js                                           │
  │  1. trim + lowercase, check it looks like an email   │
  │     → 400 if not                                     │
  │  2. SELECT ... WHERE email = ?  ──── db.js ──▶ bank.db
  │     uses idx_users_email (Day 5 fix, trap #1)        │
  │     → 409 if taken                                   │
  │  3. await validateEmail()  ──── emailValidation.js   │
  │     50-150ms, doesn't block     (fake outside        │
  │     TRAP #4: gap between         service)            │
  │     check and insert                                 │
  │  4. INSERT INTO users  ──────── db.js ──▶ bank.db     │
  │     → 201 {"id", "email"}                            │
  └──────────────────────────────────────────────────────┘
     │  JSON
     ▼
  browser: signup.js shows "Check your inbox" or the error
```

Two sign-ups with the same new email can both pass step 2 before either reaches
step 4, so both insert. There's no `UNIQUE` constraint to stop the second.

Before the Day 5 fixes, the render in `GET /signup` and the full scan in
step 2 were both synchronous: while they ran, Node couldn't answer anyone
else, so under load they slowed every route, not just sign-up. Now the page
is a file and the lookup uses the index. The waits in `cms.js` and
`emailValidation.js` never blocked.

## 4. Load test with metrics (`npm run load`)

```
  load-tests/run.sh
     │ 1. npm run seed
     │ 2. starts poll-metrics.mjs in the background
     │ 3. runs k6
     ▼
  ┌──────────────┐   HTTP (browse +    ┌─────────────────────────────────────┐
  │ k6           │   signup traffic)   │ server.js                           │
  │ main.js      │ ──────────────────▶ │                                     │
  └──────┬───────┘                     │  metrics.js samples every second:   │
         │                             │  CPU, event loop, DB query times    │
         │                             │  (timeQuery), cms.js getStats()     │
         │                             └─────────────────────────────────────┘
         │                                  ▲ GET /metrics, every second
         │                             ┌────┴─────────────┐
         │                             │ poll-metrics.mjs │
         │                             └────┬─────────────┘
         ▼                                  ▼
  load-tests/results/<run>/
    summary.json, raw.csv.gz           metrics.jsonl
```

The poller stops when k6 finishes. Then:

```
  load-tests/results/<run>/
    raw.csv.gz + metrics.jsonl + options.json
         │  analyzer/timeline.mjs (run.sh runs it after k6)
         ▼
    timeline.json  (one entry per second, per route + server)
         │  npm run analyze -- <run folder>
         │  analyze.mjs → rules.mjs → describe.mjs
         │  reads test-config.json + route-context.json
         ▼
    findings.json  (one finding per problem, plus the funnel)
```

Both k6 tests import `load-tests/lib.js`, which reads `test-config.json`
(funnel percentages) and `analyzer/route-context.json` (timeouts).

## Legend

| Arrow label    | Meaning                                          |
| -------------- | ------------------------------------------------ |
| `require(...)` | One JS file loads another and gets its exports   |
| SQL            | A query sent to SQLite through better-sqlite3    |
| HTTP           | A network request from outside (curl, k6 later)  |
