# Bottleneck finder

A 4-day learning project: a concept tool that load tests a fictional
fintech site and explains what breaks first.

## How to help me

- I'm learning these concepts. Explain the approach before writing code.
- Keep explanations concise unless I ask for more.

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

Sign-up only asks for an email (like monzo.com); the account is finished
in the app, so passwords never touch the website.

## To Do list

[x] Install express and better-sqlite3 (synchronous, which makes the slowdowns easy to see)
[x] Add a start script and check that a “hello” route responds

Database

[x] Create a users table with id, email and created date
[x] Leave out an index on email. That’s planted problem #1
[x] Write a seed script that inserts about 100k fake users. Wrap the inserts in a single transaction, or seeding will take ages
[x] Check it worked by counting the rows

Homepage (GET /)

[x] Serve a simple static HTML page with one “Open an account” button
[x] Set a Cache-Control header on it, since it’s meant to be the fast, cached part

Rates (GET /api/rates)

[x] Return a small JSON of savings rates
[x] Fake a slow CMS call with a 200 to 300ms delay on every request, and don’t cache it. That’s planted problem #2
[x] Limit the fake CMS to 10 requests at once and queue the rest, so latency climbs under load

Sign-up page

[x] Render the sign-up page (email field only) from React on the server, on every request, with no caching. That’s planted problem #3

Sign-up (POST /api/signup)

[x] Accept an email only.
[x] Look up the email to check it isn’t taken. This query scans the whole table without the index (planted problem #1)
[x] Await a fake “email validation” call between the check and the insert, so duplicates get through under concurrency. That’s planted problem #4 (bonus)
[x] Insert the new user and return 201

Sanity check

[x] Hit each route once with curl or Postman and note the response times. This is your “quiet Tuesday” baseline
[x] Write a short README listing the planted problems, so you can check later whether the tool found them

Tip: comment each planted problem in the code with something like // TRAP: no index on email.
