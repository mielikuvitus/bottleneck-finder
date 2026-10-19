// Polls GET /metrics once a second and appends each sample to a JSON Lines
// file (one JSON object per line), until it's stopped.
//
// Usage: node load-tests/poll-metrics.mjs <output file>
// run.sh starts this before k6 and stops it when k6 finishes.
import { appendFileSync } from 'node:fs';

const out = process.argv[2];
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const INTERVAL_MS = 1000;

if (!out) {
  console.error('Usage: node load-tests/poll-metrics.mjs <output file>');
  process.exit(1);
}

async function poll() {
  const started = performance.now();
  try {
    const res = await fetch(`${BASE_URL}/metrics`, { signal: AbortSignal.timeout(5000) });
    const sample = await res.json();
    // How long /metrics took to answer: a blocked event loop answers late too
    sample.pollMs = Number((performance.now() - started).toFixed(1));
    appendFileSync(out, JSON.stringify(sample) + '\n');
  } catch (error) {
    appendFileSync(out, JSON.stringify({ time: Date.now(), error: error.message }) + '\n');
  }
}

setInterval(poll, INTERVAL_MS);
poll();

process.on('SIGTERM', () => process.exit(0));
