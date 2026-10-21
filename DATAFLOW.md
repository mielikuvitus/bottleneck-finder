# Data flow

The JS files and the data between them.

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
  │  GET /api/rates  → asks cms.js if the cache is old   ┼──┐
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

The CMS wait doesn't block Node, so the homepage stays fast while rates
requests wait. Every homepage visit makes one rates request.

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

Trap 4: two sign-ups with the same new email can both pass step 2 before
either reaches step 4, so both insert.

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

After k6 finishes:

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

## Legend

| Arrow label    | Meaning                                          |
| -------------- | ------------------------------------------------ |
| `require(...)` | One JS file loads another and gets its exports   |
| SQL            | A query sent to SQLite through better-sqlite3    |
| HTTP           | A network request from curl, a browser or k6     |
