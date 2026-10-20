// Turns timeline.json into flat rows for the charts: one row per second.

export const routesOf = (timeline) => [...new Set(timeline.seconds.flatMap((s) => Object.keys(s.routes)))];

// { second, stage, target, vus, "GET /api/rates": {...}, ... } -> flat keys
export function chartRows(timeline) {
  const routes = routesOf(timeline);
  return timeline.seconds.map((s) => {
    const row = { second: s.second, stage: s.stageLabel, target: s.target, vus: s.vus };
    for (const route of routes) {
      const r = s.routes[route];
      row[`${route}|ok`] = r?.ok ?? 0;
      row[`${route}|rps`] = r?.rps ?? 0;
      row[`${route}|p50`] = r?.p50 ?? null;
      row[`${route}|p95`] = r?.p95 ?? null;
      row[`${route}|timeout`] = r?.fallbacks?.timeout ?? 0;
      row[`${route}|connection`] = r?.fallbacks?.connection ?? 0;
    }
    row.left = s.funnel?.left ?? 0;
    row.degraded = s.funnel?.degraded ?? 0;
    const srv = s.server;
    if (srv && !srv.pollFailed) {
      row.loopUtil = srv.loopUtil;
      row.delayMs = srv.delayMs;
      row.cpuPercent = srv.cpuPercent;
      for (const [name, pool] of Object.entries(srv.pools ?? {})) {
        row[`pool:${name}|inFlight`] = pool.inFlight;
        row[`pool:${name}|queued`] = pool.queued;
      }
      for (const kind of ['render', 'db']) {
        for (const [name, t] of Object.entries(srv[kind] ?? {})) row[`${kind}:${name}|share`] = t.share;
      }
    }
    row.pollFailed = Boolean(srv?.pollFailed);
    return row;
  });
}

// Names of pools and timed operations that appear anywhere in the timeline
export function serverSeries(timeline) {
  const pools = new Set();
  const timed = new Set();
  for (const s of timeline.seconds) {
    if (!s.server || s.server.pollFailed) continue;
    Object.keys(s.server.pools ?? {}).forEach((p) => pools.add(p));
    for (const kind of ['render', 'db']) Object.keys(s.server[kind] ?? {}).forEach((n) => timed.add(`${kind}:${n}`));
  }
  return { pools: [...pools], timed: [...timed] };
}

// Averages chart rows into buckets of `size` seconds (e.g. 10-second bars):
// each key becomes the per-second average over its bucket
export function bucketRows(rows, size, keys) {
  const buckets = new Map();
  for (const row of rows) {
    const start = Math.floor(row.second / size) * size;
    const b = buckets.get(start) ?? { second: start, n: 0, ...Object.fromEntries(keys.map((k) => [k, 0])) };
    b.n++;
    for (const k of keys) b[k] += row[k] ?? 0;
    buckets.set(start, b);
  }
  return [...buckets.values()].map(({ n, ...b }) => ({ ...b, ...Object.fromEntries(keys.map((k) => [k, Math.round((b[k] / n) * 10) / 10])) }));
}

// The second at which the planned load (target) first reaches `value`
export const secondWhenTargetReaches = (rows, value) => rows.find((r) => r.target >= value)?.second ?? null;

// A centred rolling average over `size` seconds for the given keys, so a jumpy
// per-second series reads as a line. Display only: the average goes in
// `${key}${SMOOTHED}` next to the real value, so tooltips can still show the
// real number for that second (empty seconds are skipped).
export const SMOOTHED = '~avg';
export function smoothRows(rows, keys, size = 5) {
  const half = Math.floor(size / 2);
  return rows.map((row, i) => {
    const out = { ...row };
    for (const k of keys) {
      if (row[k] == null) continue;
      const near = rows.slice(Math.max(0, i - half), i + half + 1).map((r) => r[k]).filter((v) => v != null);
      out[k + SMOOTHED] = Math.round((near.reduce((a, b) => a + b, 0) / near.length) * 100) / 100;
    }
    return out;
  });
}
