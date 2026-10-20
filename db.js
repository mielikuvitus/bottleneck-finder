const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'bank.db'));

// BEFORE (trap 1): no index on email. Lookups by email scanned the whole table.
// (Also no UNIQUE constraint: SQLite would quietly create an index for it.)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// FIXED (trap 1): an index on email, so sign-up finds an email in a few steps
// instead of scanning every row. Not UNIQUE: that would also block trap 4's
// duplicates, mixing two fixes in one comparison.
db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)');

module.exports = db;
