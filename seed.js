const db = require('./db');

const COUNT = 100_000;
const MINUTE = 60 * 1000;
const FIVE_MINUTES = 5 * MINUTE;
const ONE_YEAR = 365 * 24 * 60 * MINUTE;

const insert = db.prepare(
  'INSERT INTO users (email, created_at) VALUES (?, ?)'
);

// One transaction = one commit to disk, instead of 100k separate commits.
const seed = db.transaction(() => {
  db.prepare('DELETE FROM users').run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name = 'users'").run();
  const start = Date.now() - ONE_YEAR;
  for (let i = 1; i <= COUNT; i++) {
    // Match SQLite's datetime('now') format: "YYYY-MM-DD HH:MM:SS" (UTC)
    const createdAt = new Date(start + i * FIVE_MINUTES)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19);
    insert.run(`user${i}@example.com`, createdAt);
  }
});

console.time('seed');
seed();
console.timeEnd('seed');

const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
console.log(`users table now has ${n} rows`);
