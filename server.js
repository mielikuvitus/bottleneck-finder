const path = require('path');
const express = require('express');
const React = require('react');
const { renderToString } = require('react-dom/server');
const db = require('./db');
const { getRates } = require('./cms');
const { validateEmail } = require('./emailValidation');
const { timeQuery, timeRender, getMetrics } = require('./metrics');
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

app.get('/api/rates', async (req, res) => {
  // TRAP: calls the slow, 10-at-a-time CMS on every request, never cached
  const rates = await getRates();
  res.set('Cache-Control', 'no-store');
  res.json({ rates });
});

app.get('/signup', (req, res) => {
  // TRAP: renders the React page from scratch on every request (~15ms of
  // blocking CPU work), never cached
  const html = timeRender('SignupPage', () => renderToString(React.createElement(SignupPage)));
  res.set('Cache-Control', 'no-store');
  res.send('<!doctype html>' + html);
});

app.post('/api/signup', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  // TRAP: no index on email, so this scans every row (and blocks while it does)
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
