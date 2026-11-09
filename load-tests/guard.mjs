// Fails if something changed that can shift the load-test results, so a change
// can't move the numbers unnoticed. It compares two things with
// target-lock.json: a fingerprint of the files below, and the size of the built
// pages. k6 doesn't load CSS, icons or the browser scripts, so those can't move
// the results and aren't checked.
//
//   npm run guard          build the pages, then check
//   npm run guard:update   build the pages, then accept the current state
//
// If the guard fails and the change is intended, rerun the load tests and compare
// them with the last runs before accepting it.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCK = join(ROOT, 'load-tests', 'target-lock.json');

const FILES = [
  'server.js',
  'db.js',
  'cms.js',
  'emailValidation.js',
  'metrics.js',
  'seed.js',
  'package-lock.json',
  'load-tests/lib.js',
  'load-tests/main.js',
  'load-tests/signup.js',
  'load-tests/run.sh',
  'load-tests/poll-metrics.mjs',
  'load-tests/test-config.json',
];
const PAGES = ['build/index.html', 'build/signup.html'];

// A page can grow or shrink by this share before the guard fails
const SIZE_TOLERANCE = 0.1;

const fingerprint = (file) => createHash('sha256').update(readFileSync(join(ROOT, file))).digest('hex');

function current() {
  const missing = [...FILES, ...PAGES].filter((file) => !existsSync(join(ROOT, file)));
  if (missing.length) {
    console.error(`Guard: can't find ${missing.join(', ')}. Run it with npm run guard, which builds the pages first.`);
    process.exit(1);
  }
  return {
    files: Object.fromEntries(FILES.map((file) => [file, fingerprint(file)])),
    pageBytes: Object.fromEntries(PAGES.map((page) => [page, statSync(join(ROOT, page)).size])),
  };
}

function problems(locked, now) {
  const found = [];
  for (const file of FILES) {
    if (!(file in locked.files)) found.push(`${file}: not in the lock file yet`);
    else if (locked.files[file] !== now.files[file]) found.push(`${file}: changed`);
  }
  for (const page of PAGES) {
    const before = locked.pageBytes[page];
    const after = now.pageBytes[page];
    if (before === undefined) {
      found.push(`${page}: not in the lock file yet`);
    } else if (Math.abs(after - before) / before > SIZE_TOLERANCE) {
      const percent = (((after - before) / before) * 100).toFixed(1);
      found.push(`${page}: ${before} → ${after} bytes (${percent}%, limit ±${SIZE_TOLERANCE * 100}%)`);
    }
  }
  return found;
}

const now = current();

if (process.argv.includes('--update')) {
  writeFileSync(LOCK, `${JSON.stringify(now, null, 2)}\n`);
  console.log('Guard: lock file updated. Commit load-tests/target-lock.json with the change.');
  process.exit(0);
}

if (!existsSync(LOCK)) {
  console.error('Guard: no lock file yet. Create it with npm run guard:update.');
  process.exit(1);
}

const found = problems(JSON.parse(readFileSync(LOCK, 'utf8')), now);
if (found.length) {
  console.error('Guard: this can change the load-test results:');
  for (const problem of found) console.error(`  - ${problem}`);
  console.error('If it is intended, rerun npm run load and npm run load:signup, compare them with the last runs, then run npm run guard:update.');
  process.exit(1);
}
console.log(`Guard: OK (${FILES.length} files unchanged, ${PAGES.length} pages within ±${SIZE_TOLERANCE * 100}%).`);
