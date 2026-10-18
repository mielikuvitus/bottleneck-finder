# Bottleneck finder

A fictional fintech test site to load test and find what breaks first.

## Setup (first time only)

Needs Node.js installed.

```sh
npm install
```

## Seed the database

```sh
npm run seed
```

This creates `bank.db` (if it doesn't exist) and fills the `users` table with
100,000 fake users: `user1@example.com` to `user100000@example.com`.

It's safe to run again any time. It clears the table first, so you always end
up with exactly 100,000 users with ids 1 to 100,000. Any users added since the
last seed are deleted.

## Start the server

```sh
npm start
```

The site runs on http://localhost:3000. Stop it with `Ctrl+C`.

`npm start` first compiles the React sign-up page (`views/*.jsx` → `build/`)
with esbuild, then runs the server with `NODE_ENV=production`. Production mode
matters for load tests: React's development build renders about 10 times slower.

To check it's up, run this in a second terminal:

```sh
curl localhost:3000/hello
```

It should print `hello`.

## Routes

| Route            | What it returns                                  |
| ---------------- | ------------------------------------------------ |
| `GET /hello`     | `hello`, to check the server is up               |
| `GET /`          | Homepage (HTML), cacheable for 1 hour            |
| `GET /styles.css`, `GET /icons/*`, `GET /favicon.svg` | Homepage CSS, icons and browser-tab icon, cacheable for 1 hour |
| `GET /api/rates` | Savings rates (JSON), 200-300ms when quiet, slower under load |
| `GET /signup`    | Sign-up page (HTML), rendered by React on every request, not cached |
| `POST /api/signup` | Creates a user from `{"email": "..."}`: `201` created, `400` not an email, `409` already taken |

To try a sign-up from the terminal:

```sh
curl -i -H 'Content-Type: application/json' -d '{"email":"me@example.com"}' localhost:3000/api/signup
```

Users created this way stay in the database until the next `npm run seed`.

To see the headers and the response time:

```sh
curl -i localhost:3000/api/rates
curl -s -o /dev/null -w "%{time_total}s\n" localhost:3000/api/rates
```

## Quiet Tuesday baseline

Response times with nothing else hitting the server, so you have something to
compare load-test results against. To measure again, start the server and run:

```sh
./baseline.sh
npm run seed   # removes the users the sign-up test created
```

Each route gets 1 warm-up request, then 5 measured ones. Measured on
2026-10-18: Apple M4, macOS 15.3.2, Node 24.21.0, production mode.

| Route | Status | Median | Slowest | What the time is |
| ----- | ------ | -----: | ------: | ---------------- |
| `GET /hello` | 200 | 0.4ms | 0.5ms | Express doing nothing |
| `GET /` | 200 | 0.7ms | 0.7ms | Static file |
| `GET /styles.css` | 200 | 0.7ms | 0.8ms | Static file |
| `GET /api/rates` | 200 | 234ms | 252ms | Fake CMS wait, random 200-300ms (trap 2) |
| `GET /signup` | 200 | 18ms | 19ms | React render, ~15ms (trap 3) |
| `POST /api/signup` (new email) | 201 | 131ms | 152ms | Full scan ~3.5ms (trap 1) + fake email validation, random 50-150ms (trap 4) |
| `POST /api/signup` (taken email) | 409 | 4.5ms | 4.7ms | Full scan only (trap 1) |

The rates and new-email times include random waits, so they vary by a few
dozen milliseconds between runs. The others stay within a millisecond or two.

## Planted problems

Deliberate performance traps, marked `// TRAP:` in the code, so you can check
whether the load-testing tool finds them.

| # | Problem | Status |
| - | ------- | ------ |
| 1 | **No index on email.** Sign-up checks for an existing email with a full table scan. | Built (`db.js`, `server.js`) |
| 2 | **Uncached CMS call.** Rates are fetched from a fake CMS on every request. The fake CMS allows only 10 requests at once and queues the rest, like a real rate-limited service. | Built (`server.js`, `cms.js`) |
| 3 | **Uncached server-side rendering.** The sign-up page is rendered from React on every request, blocking the event loop. | Built (`server.js`, `views/SignupPage.jsx`). `RENDER_WEIGHT` sets the cost: how many invisible helper components each component renders, like the analytics and feature-flag components real apps are full of. Set to about 15ms per render |
| 4 | **Bonus, correctness under load.** An awaited fake "email validation" call between the existence check and the insert lets duplicate emails through under concurrency. | Built (`server.js`, `emailValidation.js`) |

Sign-up only asks for an email. The account is finished in the app, so
passwords never touch the website.

## More

- [DATAFLOW.md](DATAFLOW.md): diagram of how the files talk to each other

## The fictional bank

**tomorrow** is the made-up bank the test site pretends to be.

The homepage (`GET /`):

<img src="docs/images/tomorrow1.png" width="800" alt="The tomorrow homepage: the headline 'Money feels better here.', an 'Open free bank account' button, and a phone showing a €12,840.25 balance and recent transactions">

The sign-up page (`GET /signup`):

<img src="docs/images/tomorrow2.png" width="800" alt="The tomorrow sign-up page: a welcome panel saying 'A brighter tomorrow starts here.' with a debit card illustration, next to an email field and a 'Continue with email' button">
