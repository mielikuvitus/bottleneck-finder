// Shared helpers for reading a run folder.
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

export const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

export function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

// k6's CSV puts custom tags in one column as "a=1&b=2", in any order
export function parseTags(text) {
  if (!text) return {};
  return Object.fromEntries(text.split('&').map((pair) => pair.split('=')));
}

// Reads raw.csv.gz and calls onRow for each row, as an object
export async function readRawCsv(runDir, onRow) {
  let header;
  const lines = createInterface({ input: createReadStream(join(runDir, 'raw.csv.gz')).pipe(createGunzip()) });
  for await (const line of lines) {
    const fields = line.split(',');
    if (!header) {
      header = fields;
      continue;
    }
    const row = Object.fromEntries(header.map((name, i) => [name, fields[i]]));
    onRow({
      metric: row.metric_name,
      time: Number(row.timestamp), // whole seconds
      value: Number(row.metric_value),
      status: Number(row.status || 0),
      errorCode: row.error_code ? Number(row.error_code) : null,
      expected: row.expected_response !== 'false', // false for failed requests
      tags: parseTags(row.extra_tags),
    });
  }
}

// Nearest-rank percentile of a list of numbers (p between 0 and 1)
export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

export const round = (n, digits = 1) => (n === null || n === undefined ? null : Number(n.toFixed(digits)));

// "1m0s" / "30s" / "1h2m3s" -> seconds
export function parseDuration(text) {
  const parts = { h: 3600, m: 60, s: 1 };
  let total = 0;
  for (const [, n, unit] of String(text).matchAll(/(\d+(?:\.\d+)?)(h|m|s)/g)) total += Number(n) * parts[unit];
  return total;
}

// Turns options.json into a list of stages with start and end offsets (in
// seconds from the start of the test). Scenarios running side by side are
// added together. Each "level" is a ramp followed by a hold at the same target.
export function stageSchedule(options) {
  const scenarios = Object.values(options.scenarios ?? {});
  const kind = scenarios[0]?.executor === 'ramping-arrival-rate' ? 'arrival-rate' : 'vus';
  const unit = kind === 'vus' ? 'VUs' : 'visits/s';

  const stages = [];
  for (const scenario of scenarios) {
    let start = 0;
    let previous = scenario.startRate ?? scenario.startVUs ?? 0;
    scenario.stages.forEach((stage, i) => {
      const duration = parseDuration(stage.duration);
      const existing = stages[i] ?? { index: i, start, end: start + duration, from: 0, target: 0 };
      existing.from += previous;
      existing.target += stage.target;
      stages[i] = existing;
      previous = stage.target;
      start += duration;
    });
  }
  for (const stage of stages) {
    stage.phase = stage.from === stage.target ? 'hold' : 'ramp';
    stage.label = `${stage.target} ${unit}`;
  }
  return { kind, unit, stages };
}

// Which stage a given offset (seconds since the test started) falls in, and
// the target load at that moment (ramps rise in a straight line)
export function stageAt(schedule, offset) {
  const stage = schedule.stages.find((s) => offset >= s.start && offset < s.end);
  if (!stage) return null;
  const progress = (offset - stage.start) / (stage.end - stage.start);
  return { stage, target: stage.from + (stage.target - stage.from) * progress };
}
