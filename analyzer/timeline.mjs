// Builds timeline.json for a run folder: one entry per second, with each
// route's requests/s, p50, p95, errors and fallbacks from k6, merged with the
// server's /metrics sample for the same second.
//
// Usage: node analyzer/timeline.mjs load-tests/results/<run>
import { writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { percentile, readJson, readJsonl, readRawCsv, round, stageAt, stageSchedule } from './lib.mjs';

// A sample's own length: usually 1000ms, longer when the event loop is blocked
const windowOf = (sample) => sample.windowMs || 1000;

function timedShares(entries, sample) {
  return Object.fromEntries(
    Object.entries(entries ?? {}).map(([name, s]) => [
      name,
      { count: s.count, avgMs: s.avgMs, maxMs: s.maxMs, share: round((s.totalMs ?? s.avgMs * s.count) / windowOf(sample), 3), op: s.op, avgBytes: s.avgBytes },
    ])
  );
}

function serverSummary(sample) {
  if (!sample) return null;
  if (sample.error) return { pollFailed: true, error: sample.error };
  const loop = sample.eventLoop;
  // Any group in the metrics with inFlight and limit is a pool of slots
  const pools = Object.fromEntries(
    Object.entries(sample).filter(([, v]) => v && typeof v === 'object' && 'inFlight' in v && 'limit' in v)
  );
  return {
    windowMs: sample.windowMs,
    cpuPercent: sample.cpuPercent,
    loopUtil: loop.utilization,
    // The 10ms delay timer may not fire at all when the loop is blocked; the
    // sampler's own lateness still says how blocked it was
    delayMs: Math.max(loop.delayP99Ms ?? 0, loop.samplerLateMs ?? Math.max(0, windowOf(sample) - 1000)),
    db: timedShares(sample.db, sample),
    render: timedShares(sample.render, sample),
    pools,
    pollMs: sample.pollMs,
  };
}

export async function buildTimeline(runDir) {
  const schedule = stageSchedule(readJson(join(runDir, 'options.json')));
  const seconds = new Map(); // second -> { durations, failed, fallbacks, funnel, vus }
  let first = Infinity;
  const at = (t) => {
    if (!seconds.has(t)) seconds.set(t, { routes: {}, funnel: {}, vus: null });
    return seconds.get(t);
  };
  const routeAt = (t, route) => (at(t).routes[route] ??= { durations: [], requests: 0, errors: 0, fallbacks: {} });

  await readRawCsv(runDir, (row) => {
    first = Math.min(first, row.time);
    const { route } = row.tags;
    if (row.metric === 'vus') at(row.time).vus = row.value;
    else if (row.metric === 'http_req_duration' && route) {
      // Times only from successful requests: a refused connection isn't a wait
      const r = routeAt(row.time, route);
      r.requests++;
      if (row.expected) r.durations.push(row.value);
    }
    else if (row.metric === 'http_req_failed' && route && row.value === 1) routeAt(row.time, route).errors++;
    else if (row.metric === 'fallback_shown' && route) {
      const fallbacks = routeAt(row.time, route).fallbacks;
      fallbacks[row.tags.reason] = (fallbacks[row.tags.reason] ?? 0) + row.value;
    } else if (row.metric === 'funnel') {
      const funnel = at(row.time).funnel;
      funnel[row.tags.step] = (funnel[row.tags.step] ?? 0) + row.value;
    }
  });

  // Each metrics sample covers the second before it was taken
  const metricsBySecond = new Map(readJsonl(join(runDir, 'metrics.jsonl')).map((s) => [Math.floor(s.time / 1000), s]));

  const last = Math.max(...seconds.keys());
  const timeline = [];
  for (let t = first; t <= last; t++) {
    const offset = t - first;
    const where = stageAt(schedule, offset);
    const entry = seconds.get(t) ?? { routes: {}, funnel: {}, vus: null };
    timeline.push({
      t,
      second: offset,
      stage: where?.stage.index ?? null,
      stageLabel: where?.stage.label ?? 'after the test',
      phase: where?.stage.phase ?? null,
      target: round(where?.target ?? 0),
      vus: entry.vus,
      routes: Object.fromEntries(
        Object.entries(entry.routes).map(([route, r]) => [
          route,
          {
            rps: r.requests, // all requests, including failed ones
            ok: r.durations.length,
            p50: round(percentile(r.durations, 0.5)),
            p95: round(percentile(r.durations, 0.95)),
            errors: r.errors,
            timeouts: r.fallbacks.timeout ?? 0,
            fallbacks: r.fallbacks,
          },
        ])
      ),
      funnel: entry.funnel,
      server: serverSummary(metricsBySecond.get(t)),
    });
  }

  return {
    run: basename(runDir),
    loadKind: schedule.kind,
    loadUnit: schedule.unit,
    startTime: first,
    stages: schedule.stages,
    seconds: timeline,
  };
}

// Run directly: build and save timeline.json
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const runDir = process.argv[2];
  if (!runDir) {
    console.error('Usage: node analyzer/timeline.mjs load-tests/results/<run>');
    process.exit(1);
  }
  const timeline = await buildTimeline(runDir);
  writeFileSync(join(runDir, 'timeline.json'), JSON.stringify(timeline));
  console.log(`Wrote ${join(runDir, 'timeline.json')}: ${timeline.seconds.length} seconds, ${timeline.stages.length} stages`);
}
