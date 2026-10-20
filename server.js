const path = require('path');
const express = require('express');
const React = require('react');
const { renderToString } = require('react-dom/server');
const db = require('./db');
const { getRates } = require('./cms');
const { validateEmail } = require('./emailValidation');
const { timeQuery, timeRender, getMetrics } = require('./metrics');
// Only used by the "before" sign-up route (kept commented below)
const SignupPage = require('./build/views/SignupPage').default;

const app = express();
const PORT = process.env.PORT || 3000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const findUserByEmail = db.prepare('SELECT id FROM users WHERE email = ?');
const insertUser = db.prepare('INSERT INTO users (email) VALUES (?)');

app.use(express.json());

app.get('/hello', (req, res) => {
  res.send('hello');
});

// How busy the server was in the last second (see metrics.js)
app.get('/metrics', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(getMetrics());
});

app.get('/', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// CSS and icons. index: false so "/" is only served by the route above.
app.use(express.static(path.join(__dirname, 'public'), { index: false, maxAge: '1h' }));

// FIXED (trap 2): keep the CMS rates for 60s, and share one CMS call between
// everyone who asks while it's running
const RATES_TTL_MS = 60 * 1000;
let cachedRates = null; // { rates, fetchedAt }
let refresh = null; // { promise, controller, waiting } while a CMS call runs

// signal aborts when this visitor leaves. They stop waiting; when nobody is
// left waiting, the CMS call is cancelled (if it's still queued in the CMS)
function getCachedRates(signal) {
  if (cachedRates && Date.now() - cachedRates.fetchedAt < RATES_TTL_MS) {
    return Promise.resolve(cachedRates.rates);
  }
  if (!refresh) {
    const controller = new AbortController();
    const promise = getRates(controller.signal)
      .then((rates) => {
        cachedRates = { rates, fetchedAt: Date.now() };
        return rates;
      })
      .finally(() => {
        if (refresh?.promise === promise) refresh = null;
      });
    refresh = { promise, controller, waiting: 0 };
  }
  const current = refresh;
  current.waiting++;
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      current.waiting--;
      if (current.waiting === 0) {
        if (refresh === current) refresh = null; // the next visitor starts a new call
        current.controller.abort();
      }
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    current.promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', onAbort));
  });
}

app.get('/api/rates', async (req, res) => {
  // BEFORE (trap 2): called the slow, 10-at-a-time CMS on every request,
  // never cached
  // const rates = await getRates();
  // res.set('Cache-Control', 'no-store');
  // res.json({ rates });

  // The connection closing before we answered means the visitor gave up
  const visitor = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) visitor.abort();
  });
  let rates;
  try {
    rates = await getCachedRates(visitor.signal);
  } catch (err) {
    if (visitor.signal.aborted) return; // nobody to answer
    throw err;
  }
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ rates });
});

app.get('/signup', (req, res) => {
  // BEFORE (trap 3): rendered the React page from scratch on every request
  // (~15ms of blocking CPU work), never cached
  // const html = timeRender('SignupPage', () => renderToString(React.createElement(SignupPage)));
  // res.set('Cache-Control', 'no-store');
  // res.send('<!doctype html>' + html);

  // FIXED (trap 3): send the page pre-rendered at build time (prerender.js)
  res.set('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.join(__dirname, 'build', 'signup.html'));
});

app.post('/api/signup', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  // BEFORE (trap 1): no index on email, so this scanned every row (and blocked
  // while it did). FIXED: db.js adds an index, so it's a quick lookup.
  if (timeQuery('findUserByEmail', () => findUserByEmail.get(email), 'read')) {
    return res.status(409).json({ error: 'That email already has an account.' });
  }

  // TRAP: awaiting between the check and the insert leaves a gap, so two
  // sign-ups with the same email can both pass the check and both insert
  await validateEmail(email);

  const { lastInsertRowid } = timeQuery('insertUser', () => insertUser.run(email), 'write');
  res.status(201).json({ id: Number(lastInsertRowid), email });
});

app.listen(PORT, () => {
  console.log(`Test site running on http://localhost:${PORT}`);
});
