// Copies recorded load-test runs and screenshots into public/data for the
// dashboard, and writes an index of runs (runs.json).
//
// Usage (from dashboard/): npm run data
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const RESULTS = join(ROOT, 'load-tests/results');
const IMAGES = join(ROOT, 'docs/images');
const OUT = new URL('../public/data', import.meta.url).pathname;

// Files the dashboard reads from each run folder
const RUN_FILES = ['findings.json', 'timeline.json', 'run.json', 'test-config.json', 'route-context.json'];

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

// The assumptions' short labels (_labels) come from the current
// test-config.json, so older runs get them too. Only labels are added: the
// run's own values are kept as recorded.
const currentConfig = readJson(join(ROOT, 'load-tests/test-config.json'));
function withLabels(config, current = currentConfig) {
  const out = { ...config, _labels: current._labels ?? config._labels };
  for (const [key, value] of Object.entries(out)) {
    if (value && typeof value === 'object' && !key.startsWith('_') && current[key] && typeof current[key] === 'object') out[key] = withLabels(value, current[key]);
  }
  return out;
}

// "2026-10-19_000132-main-superseded" -> "2026-10-19T00:01:32" (this machine's
// local time: run.sh names runs with the local clock)
function dateOf(name) {
  const m = name.match(/^(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})(\d{2})/);
  return m ? `${m[1]}T${m[2]}:${m[3]}:${m[4]}` : null;
}

// "19 Oct 2026 · 00:01 BST": in this machine's time zone, named, so readers
// know the run's clock
function dateLabel(local) {
  if (!local) return null;
  const d = new Date(local); // parsed as local time
  const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  return `${day} · ${time}`;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'runs'), { recursive: true });

const index = [];
for (const name of readdirSync(RESULTS).sort().reverse()) {
  const dir = join(RESULTS, name);
  if (!existsSync(join(dir, 'findings.json'))) {
    console.log(`skipped ${name}: no findings.json (run: npm run analyze -- load-tests/results/${name})`);
    continue;
  }
  mkdirSync(join(OUT, 'runs', name));
  for (const file of RUN_FILES) {
    if (!existsSync(join(dir, file))) continue;
    if (file === 'test-config.json') writeFileSync(join(OUT, 'runs', name, file), JSON.stringify(withLabels(readJson(join(dir, file))), null, 2));
    else cpSync(join(dir, file), join(OUT, 'runs', name, file));
  }
  const findings = readJson(join(dir, 'findings.json'));
  const info = existsSync(join(dir, 'run.json')) ? readJson(join(dir, 'run.json')) : {};
  index.push({
    name,
    test: findings.test ?? info.test ?? null,
    date: dateOf(name),
    date_label: dateLabel(dateOf(name)),
    superseded: Boolean(findings.superseded ?? info.superseded),
    superseded_reason: info.reason ?? null,
    scenario: findings.scenario ?? null,
    commit: info.git?.commit ?? null,
    uncommitted_changes: info.git?.uncommitted_changes ?? null,
    findings: findings.findings.length,
  });
  console.log(`copied  ${name}`);
}
writeFileSync(join(OUT, 'runs.json'), JSON.stringify(index, null, 2));

cpSync(IMAGES, join(OUT, 'images'), { recursive: true, filter: (src) => !src.endsWith('.DS_Store') });
console.log(`copied  docs/images -> public/data/images`);
console.log(`wrote   public/data/runs.json (${index.length} runs)`);
