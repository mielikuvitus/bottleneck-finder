const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'bank.db'));

// TRAP: no index on email. Lookups by email scan the whole table.
// (Also no UNIQUE constraint: SQLite would quietly create an index for it.)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

module.exports = db;
