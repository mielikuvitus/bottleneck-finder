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
  │  TRAP #1: no index on email                         │
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
  │  GET /api/rates  → asks cms.js on every request ─────┼──┐
  │                    → rates as JSON                   │  │ require('./cms')
  │                    Cache-Control: no-store           │  │ getRates()
  │                    TRAP #2: never cached             │  │
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

The CMS can only finish about 40 requests a second (10 slots, ~250ms each).
Below that, rates take ~250ms. Above it, the queue grows and every rates
request waits longer and longer. That's the knee.

A browser loading the homepage makes about 11 requests: the HTML, then
`styles.css`, `home.js` and 7 icons from our server, plus the Manrope font
from Google Fonts (which never touches our server). Then `home.js` calls
`GET /api/rates` straight away and fills in the "Our savings rates" cards, so
**every homepage visit triggers one CMS call**. k6 only fetches what its script
asks for, so the load test requests `/` and `/api/rates` itself.

## 3. Sign-up (the homepage buttons link to `/signup`)

```
  browser
     │  GET /signup
     ▼
  ┌──────────────────────────────────────────────────────┐
  │  server.js                                           │
  │  renderToString(SignupPage)  ◀── build/views/        │
  │  ~15ms of CPU, blocks the       SignupPage.js        │
  │  event loop, every request      (React, compiled     │
  │  Cache-Control: no-store         from views/*.jsx)   │
  │  TRAP #3: never cached                               │
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
  │     TRAP #1: full scan, ~3.5ms, blocks               │
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

The render in `GET /signup` and the scan in step 2 are both synchronous: while
they run, Node can't answer anyone else. Under load this slows every route,
not just sign-up. The waits in `cms.js` and `emailValidation.js` don't.

## Legend

| Arrow label    | Meaning                                          |
| -------------- | ------------------------------------------------ |
| `require(...)` | One JS file loads another and gets its exports   |
| SQL            | A query sent to SQLite through better-sqlite3    |
| HTTP           | A network request from outside (curl, k6 later)  |
