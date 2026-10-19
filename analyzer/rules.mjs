// Turns measured patterns into findings. The rules only use what the
// measurements show (pools, the event loop, timed renders and queries),
// never knowledge of which problems were planted.
import { round } from './lib.mjs';
import { num, percent, routeName, seconds, slowVisitShare } from './describe.mjs';

// What counts as saturated (adjust here)
const LOOP_BUSY = 0.9; // event loop busy at least 90% of the time
const LOOP_IDLE = 0.5; // below this, the server itself isn't the limit
const DELAY_MS = 100; // new requests wait 100ms+ for the loop to be free
const POOL_FULL_SHARE = 0.5; // every slot in use in at least half the samples
const POLL_SLOW_MS = 500; // /metrics itself takes 500ms+ to answer
const CONTRIBUTOR_SHARE = 0.1; // timed work using 10%+ of the server's time
const SLOW_LOOKUP_MS = 1; // a single-row lookup slower than this suggests a full scan
const GROWTH = 10; // "if the data grows 10x"

const loopSaturated = (srv) => Boolean(srv) && (srv.loopUtil >= LOOP_BUSY || srv.delayMs >= DELAY_MS);
const poolSaturated = (p) => Boolean(p) && p.fullShare >= POOL_FULL_SHARE && p.queuedAvg > 0;
const pct = (share) => Math.round(share * 100);

export function buildFindings(ctx) {
  const { stages, routes, knees } = ctx;
  const byIndex = (i) => stages.find((s) => s.index === i);
  const previousOf = (stage) => stages[stages.indexOf(stage) - 1] ?? null;

  // Which route a timed operation belongs to: the one requested about as
  // often as the operation ran. Only successful requests count: a request that
  // failed to connect never reached the code that does the work.
  function routeForTimed(key) {
    const calls = stages.reduce((sum, s) => sum + (s.server?.timed[key]?.calls ?? 0), 0);
    let best = null;
    for (const route of routes) {
      const requests = stages.reduce((sum, s) => sum + (s.routes[route] ? s.routes[route].requests - s.routes[route].errors : 0), 0);
      const ratio = calls / requests;
      if (ratio >= 0.7 && ratio <= 1.4 && (!best || Math.abs(Math.log(ratio)) < Math.abs(Math.log(best.ratio)))) {
        best = { route, ratio, calls, requests };
      }
    }
    return best;
  }

  // ---------- Step 1: group knees into problems by what was saturated ----------
  const problems = new Map();
  const add = (key, data, route) => {
    const p = problems.get(key) ?? { key, affected: new Set(), ...data };
    if (route) p.affected.add(route);
    problems.set(key, p);
  };

  for (const route of routes) {
    const knee = knees[route];
    if (!knee) continue;
    const stage = byIndex(knee.stage);
    const srv = stage.server;
    if (!srv) {
      add(`unexplained:${route}`, { kind: 'unexplained', primary: route, stage, noMetrics: true }, route);
      continue;
    }
    const fullPools = Object.entries(srv.pools).filter(([, p]) => poolSaturated(p));
    if (fullPools.length && srv.loopUtil < LOOP_IDLE) {
      for (const [name] of fullPools) add(`pool:${name}`, { kind: 'pool', name, primary: route, stage }, route);
    } else if (loopSaturated(srv)) {
      const contributors = Object.entries(srv.timed).filter(([, t]) => t.share >= CONTRIBUTOR_SHARE);
      if (!contributors.length) add('loop:untimed', { kind: 'loop', stage }, route);
      for (const [key, t] of contributors) {
        const owner = routeForTimed(key);
        add(key, { kind: t.kind, name: t.name, primary: owner?.route ?? route, owner, stage }, route);
      }
    } else {
      add(`unexplained:${route}`, { kind: 'unexplained', primary: route, stage }, route);
    }
  }

  // Slow single-row lookups, even where nothing broke yet: their cost grows
  // with the data, not with traffic
  for (const key of new Set(stages.flatMap((s) => Object.keys(s.server?.timed ?? {})))) {
    if (!key.startsWith('db:')) continue;
    const present = stages.map((s) => s.server?.timed[key]).filter(Boolean);
    // Only reads: a write commits to disk, so ~1ms is normal for it
    if (present.find((t) => t.op)?.op !== 'read') continue;
    const avgMs = present.reduce((sum, t) => sum + t.avgMs * t.calls, 0) / present.reduce((sum, t) => sum + t.calls, 0);
    const calls = present.reduce((sum, t) => sum + t.calls, 0);
    if (avgMs >= SLOW_LOOKUP_MS && calls >= 20) {
      const existing = problems.get(key);
      if (existing) existing.slowLookup = { avgMs, calls, present };
      else {
        const owner = routeForTimed(key);
        add(key, { kind: 'db', name: key.slice(3), primary: owner?.route ?? null, owner, latent: true, slowLookup: { avgMs, calls, present } }, owner?.route);
      }
    }
  }

  return [...problems.values()].map((p) => buildFinding(p, ctx, { byIndex, previousOf }));
}

// ---------- Step 2: one finding per problem ----------

function buildFinding(p, ctx, { byIndex, previousOf }) {
  const { knees, routeContext, requestsPerVisit, visitSeconds, peaks, config } = ctx;
  const route = p.primary;
  const knee = (route && knees[route]) || [...p.affected].map((r) => knees[r]).find(Boolean) || null;
  const stage = knee ? byIndex(knee.stage) : null;
  const prev = stage ? previousOf(stage) : null;
  const srv = stage?.server;
  const prevSrv = prev?.server;

  const evidence = [];
  const signals = []; // { name, isNew }
  let title, likely_cause, suggested_fix;

  if (knee && route && stage.routes[route]) {
    evidence.push(
      `${route} p95 went from ${seconds(knee.p95Before)} at ${knee.previousLoad} to ${seconds(stage.routes[route].p95)} at ${knee.load}` +
        (knee.reasons.includes('errors') ? `, and ${percent(stage.routes[route].errorRate)} of its requests failed` : '') +
        '.'
    );
  }
  // Goodput collapse: load went up but successful requests fell sharply
  if (knee && knee.rpsBefore && knee.rpsAfter < knee.rpsBefore * 0.7) {
    evidence.push(
      `Useful throughput collapsed: successful ${route} requests fell from ${knee.rpsBefore}/s at ${knee.previousLoad} to ${knee.rpsAfter}/s at ${knee.load}, even though more visitors arrived. Requests that visitors had already given up on were still queued and processed, so the server spent its capacity on answers nobody was waiting for.`
    );
    signals.push({ name: 'useful throughput collapsed', isNew: true });
  }
  if (knee?.plateau) {
    evidence.push(
      `Completed ${route} requests stopped keeping up with the load: ${knee.rpsBefore}/s at ${knee.previousLoad}, ${knee.rpsAfter}/s at ${knee.load} (about ${knee.expectedRps}/s if it had scaled).`
    );
    signals.push({ name: 'throughput plateau', isNew: true });
  }

  if (p.kind === 'pool') {
    const pool = srv.pools[p.name];
    const before = prevSrv?.pools[p.name];
    title = `"${p.name}" is at its concurrency limit, so ${route} queues up`;
    evidence.push(
      `"${p.name}" had ${pool.inFlightAvg} of ${pool.limit} slots in use on average at ${knee.load}, all slots busy ${percent(pool.fullShare)} of the time, with ${pool.queuedAvg} requests waiting on average (up to ${pool.queuedMax}).` +
        (before ? ` At ${knee.previousLoad}: ${before.inFlightAvg} of ${before.limit} in use, ${before.queuedAvg} waiting.` : '')
    );
    evidence.push(`The server's event loop was only ${percent(srv.loopUtil)} busy, so the server itself wasn't the limit.`);
    const others = Object.entries(stage.routes).filter(([r]) => !p.affected.has(r));
    if (others.length) evidence.push(`Other routes stayed fast at ${knee.load}: ${others.map(([r, s]) => `${r} p95 ${seconds(s.p95)}`).join(', ')}.`);
    evidence.push(`The analyser can't see which route calls "${p.name}": ${route} is the route that slowed down while its slots filled up.`);
    signals.push({ name: 'all slots busy', isNew: !before || before.fullShare < POOL_FULL_SHARE });
    signals.push({ name: 'requests queueing', isNew: !before || before.queuedAvg === 0 });
    likely_cause = `Every ${route} request waits for one of ${pool.limit} slots with "${p.name}", an outside service with a fixed concurrency limit, and the answers aren't cached. Once requests arrive faster than the slots free up, they queue, and each one waits for everyone ahead of it.`;
    suggested_fix = `Cache "${p.name}"'s answers for a short time (for example 30–60 seconds), so most requests never need a slot; combine identical requests that are in flight at the same moment; ask the provider for a higher limit; keep the timeout and fallback for when it's slow anyway. On the server, drop queued requests whose visitor has already given up (for example, a queue timeout that matches the 3s client timeout, or cancelling when the connection closes), so the slots go to people still waiting.`;
  } else if (p.kind === 'render' || (p.kind === 'db' && !p.latent)) {
    const t = srv.timed[`${p.kind}:${p.name}`];
    const what = p.kind === 'render' ? `Rendering "${p.name}"` : `The database query "${p.name}"`;
    title = `${what} fills up the server's time, so every request waits`;
    evidence.push(
      `The event loop was ${percent(srv.loopUtil)} busy at ${knee.load} (${prevSrv ? percent(prevSrv.loopUtil) : 'unknown'} at ${knee.previousLoad}); new requests waited about ${seconds(srv.delayMs)} just to start (1 in 10 over ${seconds(srv.delayP90Ms)}).`
    );
    evidence.push(`${what} took ${t.avgMs}ms per call on average and used ${percent(t.share)} of the server's time at ${knee.load}.`);
    const others = Object.entries(srv.timed).filter(([k]) => k !== `${p.kind}:${p.name}` && srv.timed[k].share >= 0.01);
    if (others.length) evidence.push(`Other timed work at the same stage: ${others.map(([, o]) => `"${o.name}" ${percent(o.share)}`).join(', ')}.`);
    if (p.owner) evidence.push(`It ran about once per ${p.owner.route} request (${num(p.owner.calls)} calls, ${num(p.owner.requests)} requests), so it belongs to that route.`);
    const slowed = [...p.affected].filter((r) => r !== route);
    if (slowed.length) evidence.push(`Other routes on the same server slowed down at the same stage: ${slowed.map((r) => `${r} p95 ${seconds(stage.routes[r]?.p95)}`).join(', ')}.`);
    if (srv.pollMs >= POLL_SLOW_MS || srv.pollFailures) evidence.push(`Even /metrics took ${seconds(srv.pollMs)} to answer, and ${srv.pollFailures} polls timed out.`);
    const conn = Object.entries(stage.routes).map(([r, s]) => [r, s.fallbacks.connection ?? 0, s.fallbacks.timeout ?? 0]).filter(([, c, to]) => c || to);
    for (const [r, c, to] of conn) evidence.push(`${r}: ${num(c)} requests couldn't connect and ${num(to)} timed out at ${knee.load}. Connection failures come from the server being too busy to accept connections, and partly from this machine's queue of 128 waiting connections.`);
    signals.push({ name: 'event loop busy', isNew: !loopSaturated(prevSrv) });
    signals.push({ name: 'requests waiting to start', isNew: srv.delayMs >= DELAY_MS && !(prevSrv?.delayMs >= DELAY_MS) });
    if (srv.pollMs >= POLL_SLOW_MS || srv.pollFailures) signals.push({ name: 'server slow to answer /metrics', isNew: !(prevSrv?.pollMs >= POLL_SLOW_MS) });
    if (conn.length) signals.push({ name: 'connection failures', isNew: true });
    if (p.kind === 'render') {
      likely_cause = `${what} is synchronous CPU work: about ${t.avgMs}ms per page, during which Node can't do anything else. One process has about 1,000ms of time a second, so it can render only about ${Math.round(1000 / t.avgMs)} pages a second before requests start to queue, for every route, not just this one.`;
      suggested_fix = `Cache the rendered HTML (it's the same for every visitor) or generate it once at build time; render less (fewer components); if it has to stay dynamic, run several server processes (Node's cluster module) so renders don't all share one event loop.`;
    } else if (t.op === 'write') {
      likely_cause = `${what} is synchronous: about ${t.avgMs}ms per call, during which Node can't do anything else. Each write is saved to disk on its own.`;
      suggested_fix = `Batch writes into one transaction, or turn on SQLite's write-ahead log (PRAGMA journal_mode=WAL) so each write costs less.`;
    } else {
      likely_cause = `${what} is synchronous: about ${t.avgMs}ms per call, during which Node can't do anything else. For a lookup of one row that's slow, which suggests the database reads the whole table (a full scan).`;
      suggested_fix = `Add an index on the column the query looks up, so the database finds the row directly; check the query plan (EXPLAIN QUERY PLAN) to confirm.`;
    }
  } else if (p.kind === 'db' && p.latent) {
    const first = p.slowLookup.present[0];
    const last = p.slowLookup.present[p.slowLookup.present.length - 1];
    title = `The database query "${p.name}" is slow for a single-row lookup`;
    evidence.push(`"${p.name}" took ${round(p.slowLookup.avgMs, 2)}ms per call on average over ${num(p.slowLookup.calls)} calls.`);
    evidence.push(`Its time didn't change with load (${first.avgMs}ms at the lowest stage, ${last.avgMs}ms at the highest), so it's the work per call, not contention.`);
    evidence.push(`An indexed lookup of one row usually takes well under 0.1ms; ${round(p.slowLookup.avgMs, 1)}ms suggests the database reads the whole table (a full scan).`);
    if (p.owner) evidence.push(`It ran about once per ${p.owner.route} request, so it belongs to that route.`);
    evidence.push(`Nothing broke because of it in this run: it used at most ${percent(Math.max(...p.slowLookup.present.map((t) => t.share)))} of the server's time.`);
    signals.push({ name: 'slow per-call time', isNew: true });
    likely_cause = `The query reads the whole table to find one row (no index on the column it looks up), so each call costs time in proportion to the table's size.`;
    suggested_fix = `Add an index on the column the query looks up; check the query plan (EXPLAIN QUERY PLAN) to confirm.`;
  } else if (p.kind === 'loop') {
    title = 'The server is saturated by work that isn\'t timed';
    evidence.push(`The event loop was ${percent(srv.loopUtil)} busy at ${knee.load}, but no timed render or query used more than ${percent(CONTRIBUTOR_SHARE)} of the time.`);
    signals.push({ name: 'event loop busy', isNew: !loopSaturated(prevSrv) });
    likely_cause = 'Synchronous work the server doesn\'t time (for example JSON handling, logging or middleware) is filling the event loop.';
    suggested_fix = 'Profile the server under load (node --cpu-prof) to find the busy code, then time it in metrics.js.';
  } else {
    title = `${route} slows down, but nothing measured was saturated`;
    if (p.noMetrics) evidence.push('This run has no server metrics, so the analyser can\'t check what was saturated.');
    else {
      const pools = Object.entries(srv.pools).map(([n, pl]) => `"${n}" ${pl.inFlightAvg}/${pl.limit} in use, ${pl.queuedAvg} waiting`).join('; ');
      evidence.push(`At ${knee.load} the event loop was ${percent(srv.loopUtil)} busy, new requests waited about ${seconds(srv.delayMs)} to start${pools ? `, pools: ${pools}` : ''}: none of these was saturated.`);
    }
    likely_cause = 'Something the server doesn\'t measure: an outside service without metrics, garbage-collection pauses, the network, or the load-test machine itself running out of capacity.';
    suggested_fix = `Add timing around ${route}'s dependencies, and check the load-test machine's CPU during the run.`;
  }

  // ---------- Capacity, impact, headroom, fallback point ----------
  const capacity = knee && route ? capacityAt(route, stage, prev, ctx) : null;
  const affected = [...new Set([route, ...p.affected].filter(Boolean))];
  const impact = (level) => impactAt(level, affected, ctx);
  // A campaign scenario (the sign-up test) is judged at the campaign peak; its
  // normal day comes from the latest main test instead
  const campaign = ctx.scenario === 'campaign';
  const normal = campaign ? normalDayImpact(affected, ctx) : null;
  const user_impact_now = campaign ? normal.impact : impact(peaks.expected);
  const user_impact_at_campaign = impact(peaks.campaign);
  const user_impact_at_limit = impact({ name: 'highest load tested', visitors: Math.round(ctx.limit.visitorsAtOnce), closestStage: ctx.limit.index, closestLoad: ctx.loadLabel(ctx.limit) });

  const headroom = capacity ? headroomFor(capacity.visitors_at_once, peaks) : null;
  if (campaign && headroom) {
    // Expected-peak headroom comes from the normal day (main test), not from
    // this test, where every visitor goes to sign-up
    headroom.expected_pct = normal.headroomPct;
    headroom.summary = `at campaign peak (${peaks.campaign.visitors}), breaks at about ${headroom.break_point_visitors} visitors at once: ${headroom.campaign_pct >= 0 ? `${headroom.campaign_pct}% to spare` : `${-headroom.campaign_pct}% over the limit`}. On a normal day: ${normal.headroomNote ?? 'unknown (no main run)'}.`;
  }
  const fallback_point = route && capacity ? fallbackPoint(route, capacity.requests_per_second, ctx) : null;

  // if_ignored: what happens as traffic or data grows
  let if_ignored;
  if (p.slowLookup) {
    const ms = p.slowLookup.avgMs;
    if_ignored = {
      class: 'grows with data',
      description: `Each call takes about ${round(ms, 1)}ms with ${num(config.dataset_rows)} rows. A full scan's time grows in step with the table: at ${GROWTH}x the rows (${num(config.dataset_rows * GROWTH)}) it would take about ${Math.round(ms * GROWTH)}ms per call, so the same traffic would use ${GROWTH}x the server time, and the break point would move down. This is an estimate from one table size.`,
    };
  } else if (knee) {
    if_ignored = {
      class: 'capacity cliff',
      description: `Fine until about ${capacity ? Math.round(capacity.visitors_at_once) : '?'} visitors at once, then it gets slow fast: past that point every extra visitor joins a queue, so waits keep growing for as long as the traffic stays high. More traffic doesn't make it gradually worse; it tips over.`,
    };
  } else {
    if_ignored = { class: 'stable', description: 'No break point up to the highest load tested.' };
  }

  // Severity, from user impact and headroom
  let severity = 'low';
  if (campaign) {
    // Judged at the campaign peak: high if over the limit or people fail there
    const failingAtCampaign = user_impact_at_campaign.failures > 0 || user_impact_at_campaign.left > 0;
    if ((headroom && headroom.campaign_pct < 0) || failingAtCampaign) severity = 'high';
    else if (headroom && headroom.campaign_pct < 50) severity = 'medium';
    // ...but critical if the main test shows normal days failing too
    if (normal.failing) severity = 'critical';
  } else {
    const failuresAtExpected = user_impact_now.failures > 0;
    if ((headroom && headroom.expected_pct < 0) || failuresAtExpected) severity = 'critical';
    else if (headroom && (headroom.expected_pct < 50 || headroom.campaign_pct < 0)) severity = 'high';
    else if (headroom && headroom.campaign_pct < 50) severity = 'medium';
  }
  // A critical route that failed at all is at least high, whatever the headroom
  const criticalFailures = affected.filter((r) => routeContext[r]?.critical).map((r) => [r, ctx.stages.reduce((sum, s) => sum + (s.routes[r]?.errors ?? 0), 0)]).filter(([, n]) => n > 0);
  if (criticalFailures.length && (severity === 'low' || severity === 'medium')) severity = 'high';

  const newSignals = signals.filter((s) => s.isNew);
  const confidence = p.kind === 'unexplained' ? 'low' : newSignals.length >= 2 ? 'high' : 'medium';

  return {
    title,
    severity,
    route: route ?? affected[0] ?? null,
    affected_routes: affected,
    knee_at: knee
      ? { stage: knee.stage, load: knee.load, previous_load: knee.previousLoad, p95_before: knee.p95Before, p95_after: knee.p95After, detected_by: knee.reasons }
      : null,
    evidence,
    likely_cause,
    suggested_fix,
    confidence,
    confidence_signals: signals.map((s) => `${s.name}${s.isNew ? ' (new at the knee)' : ' (already there before)'}`),
    user_impact_now,
    user_impact_at_campaign,
    user_impact_at_limit,
    capacity,
    fallback_point,
    if_ignored,
    headroom,
    can_wait: campaign
      ? canWaitCampaign(severity, normal, user_impact_at_campaign, if_ignored)
      : canWait(severity, headroom, if_ignored, criticalFailures, capacity, peaks, routeContext),
    ...(campaign
      ? {
          scenario: 'campaign',
          normal_day_source: normal.impact.source ?? null,
          normal_day_warning: normal.impact.warning ?? null,
          // Low when the normal-day numbers may come from different code
          normal_day_confidence: !normal.impact.source ? 'none' : normal.impact.warning ? 'low' : 'high',
        }
      : {}),
    critical_route_failures: criticalFailures.map(([r, n]) => ({ route: r, failed_requests: n, impact: routeContext[r].impact_if_failed })),
  };
}

// The break point: the route's request rate at the knee (what it managed when
// it tipped over), and the last healthy rate before it.
// Visitors at once (Little's law) = visits/s x visit length, where
// visits/s = route requests/s / route requests per visit.
// Capacity is the most successful requests/s the route reached at any stage
// up to the knee. Past the knee, useful throughput can fall (requests that
// visitors gave up on still take up the server's time), so the rate at the
// knee itself would understate what the route can handle.
function capacityAt(route, stage, prev, ctx) {
  const upToKnee = ctx.stages.filter((s) => s.index <= stage.index && s.routes[route]);
  const best = upToKnee.reduce((a, s) => (s.routes[route].rps > a.routes[route].rps ? s : a));
  const rps = best.routes[route].rps;
  const atKnee = stage.routes[route].rps;
  const visitors = (rps / ctx.requestsPerVisit[route]) * ctx.visitSeconds;
  const healthyRps = prev?.routes[route]?.rps ?? null;
  return {
    requests_per_second: rps,
    reached_at: best.label,
    at_knee_requests_per_second: atKnee,
    last_healthy_requests_per_second: healthyRps,
    visitors_at_once: round(visitors),
    summary: `at most about ${rps}/s successful ${route} requests (reached at ${best.label}; ${atKnee}/s at the knee), which is about ${Math.round(visitors)} visitors on the site at once (${rps}/s / ${round(ctx.requestsPerVisit[route], 2)} requests per visit x ${round(ctx.visitSeconds, 2)}s per visit)`,
  };
}

// (capacity - peak) / peak, at both peaks
function headroomFor(capacityVisitors, peaks) {
  const at = (peak) => round(((capacityVisitors - peak.visitors) / peak.visitors) * 100, 0);
  const expected_pct = at(peaks.expected);
  const campaign_pct = at(peaks.campaign);
  const word = (p) => (p >= 0 ? `${p}% to spare` : `${-p}% over the limit`);
  return {
    break_point_visitors: Math.round(capacityVisitors),
    expected_pct,
    campaign_pct,
    summary: `breaks at about ${Math.round(capacityVisitors)} visitors at once: ${word(expected_pct)} at expected peak (${peaks.expected.visitors}), ${word(campaign_pct)} at campaign peak (${peaks.campaign.visitors})`,
  };
}

// How long a visitor waits for a route before the request ends: the site's
// own timeout, or their patience if they wait for it (on_failure "left"),
// whichever is shorter. The same rule as load-tests/lib.js.
function effectiveTimeoutMs(route, ctx) {
  const r = ctx.routeContext[route] ?? {};
  const limits = [r.timeout_ms];
  if (r.on_failure === 'left') limits.push(ctx.config.patience_seconds * 1000);
  const set = limits.filter(Boolean);
  return set.length ? Math.min(...set) : null;
}

// Funnel counts for one step at one route, by reason ("left@GET /signup#timeout")
function outcomeAt(funnel, step, route) {
  const prefix = `${step}@${route}#`;
  const byReason = {};
  for (const [key, n] of Object.entries(funnel)) if (key.startsWith(prefix)) byReason[key.slice(prefix.length)] = n;
  return { total: Object.values(byReason).reduce((a, b) => a + b, 0), byReason };
}

const REASON_WORDS = {
  timeout: (secs) => `got no answer within ${secs}s`,
  connection: () => "couldn't connect",
  server_error: () => 'got an error',
};
const reasonList = (byReason, timeoutMs) =>
  Object.entries(byReason)
    .map(([reason, n]) => `${num(n)} ${(REASON_WORDS[reason] ?? (() => reason))(timeoutMs / 1000)}`)
    .join(', ');

// What visitors experience at one level, from the closest tested stage:
// first who left, lost a sign-up or got a degraded page; then the waits
function impactAt(level, routes, ctx) {
  const stage = ctx.stages.find((s) => s.index === level.closestStage);
  const outcomes = [];
  const waits = [];
  let failures = 0;
  let left = 0;
  let degraded = 0;
  const perRoute = {};
  for (const route of routes) {
    const s = stage.routes[route];
    if (!s) continue;
    const rc = ctx.routeContext[route] ?? {};
    const timeoutMs = effectiveTimeoutMs(route, ctx);
    failures += s.errors;
    if (rc.on_failure === 'degraded') {
      const d = outcomeAt(stage.funnel, 'degraded', route);
      degraded += d.total;
      outcomes.push(
        d.total
          ? `${num(d.total)} of ${num(s.requests)} visits (${percent(d.total / s.requests)}) were degraded: ${rc.fallback} (${reasonList(d.byReason, timeoutMs)}).`
          : `No visits were degraded: ${routeName(route, ctx.routeContext).toLowerCase()} always loaded.`
      );
    } else {
      const l = outcomeAt(stage.funnel, 'left', route);
      left += l.total;
      // A failed submission is reported once, as a lost sign-up (below)
      if (l.total && route !== SUBMIT) {
        outcomes.push(
          `${num(l.total)} of ${num(s.requests)} visitors (${percent(l.total / s.requests)}) left at ${routeName(route, ctx.routeContext).toLowerCase()}: ${reasonList(l.byReason, timeoutMs)}.`
        );
      }
    }
    waits.push(
      s.p50 === null
        ? `${routeName(route, ctx.routeContext).toLowerCase()}: no one got an answer in time`
        : `${routeName(route, ctx.routeContext).toLowerCase()} half over ${seconds(s.p50)}, 1 in 20 over ${seconds(s.p95)}`
    );
    perRoute[route] = { p50_ms: s.p50, p95_ms: s.p95, requests: s.requests, failed: s.errors, fallback_shown: s.fallbackCount };
  }
  if (!left && !degraded && routes.some((r) => ctx.routeContext[r]?.on_failure === 'left')) outcomes.push('No one left.');
  // Refused connections can also come from the test machine's own limit
  const refused = routes.reduce((sum, r) => sum + (stage.routes[r]?.fallbacks?.connection ?? 0), 0);
  if (refused) {
    outcomes.push(
      `Some of the ${num(refused)} connection failures may come from this Mac's queue of 128 waiting connections (kern.ipc.somaxconn), not only from the server being busy; a production server would have a larger queue.`
    );
  }

  const lost = lostSignupsAt(stage, ctx);
  // The sign-up page's leavers are already listed above when it's one of the routes
  if (lost) outcomes.push(routes.includes(PAGE) ? lost.attempts_summary : lost.summary);

  // At least one request in the slowest 5% per visit: 1 - 0.95^n
  const n = ctx.totalRequestsPerVisit;
  const slowShare = slowVisitShare(n);
  const lines = [...outcomes];
  if (waits.length) {
    lines.push(
      `Waits, for those who got an answer: ${waits.join('; ')}. A visit makes about ${round(n, 2)} requests, so about ${percent(slowShare)} of visits (1 - 0.95^${round(n, 2)}) hit at least one wait in the slowest 5%.`
    );
  }
  const note = level.aboveTested ? ` Note: ${level.visitors} is above the highest load tested, so this uses the highest stage.` : '';
  return {
    level: level.name,
    visitors: level.visitors,
    stage_used: level.closestLoad,
    measured_visitors_at_once: stage.measuredVisitorsAtOnce ?? null,
    failures,
    left,
    degraded,
    routes: perRoute,
    slow_visit_share: round(slowShare, 3),
    lost_signups: lost,
    summary: `At about ${level.visitors} visitors at once (closest tested: ${level.closestLoad}): ${lines.join(' ')}${note}`,
  };
}

// fallback_point: when visitors start seeing the fallback.
// Predicted: once requests arrive faster than capacity, the queue grows by
// (arrivals - capacity) every second and each queued request adds
// 1/capacity seconds of waiting, so the wait reaches the timeout after
// timeout x capacity / (arrivals - capacity) seconds.
// Measured: the first timed-out request in timeline.json (minus the timeout,
// since k6 records a request when it ends), compared with when the load first
// went over capacity.
function fallbackPoint(route, capacityRps, ctx) {
  const timeoutMs = effectiveTimeoutMs(route, ctx);
  const timeout = timeoutMs ? timeoutMs / 1000 : null;
  const rpv = ctx.requestsPerVisit[route];
  const arrivalsFor = (visitors) => (visitors / ctx.visitSeconds) * rpv;

  const predict = (arrivals, label) => {
    if (!timeout) return { at: label, arrivals_rps: round(arrivals), summary: `${label}: no timeout on this route, so visitors just wait.` };
    if (arrivals <= capacityRps) return { at: label, arrivals_rps: round(arrivals), seconds_until_fallback: null, summary: `${label}: about ${round(arrivals)}/s against a capacity of about ${capacityRps}/s, so no fallback expected.` };
    const secs = (timeout * capacityRps) / (arrivals - capacityRps);
    return {
      at: label,
      arrivals_rps: round(arrivals),
      overload_pct: round(((arrivals - capacityRps) / capacityRps) * 100, 0),
      seconds_until_fallback: round(secs),
      summary: `${label}: about ${round(arrivals)}/s against a capacity of about ${capacityRps}/s (${round(((arrivals - capacityRps) / capacityRps) * 100, 0)}% over), so visitors would start seeing the fallback after about ${round(secs)}s (${timeout}s timeout x ${capacityRps} / ${round(arrivals - capacityRps)}), and more of them every second after that.`,
    };
  };

  const predicted = {
    starts_above: `about ${capacityRps}/s ${route} requests: any load above that leads to fallbacks if it lasts long enough`,
    expected: predict(arrivalsFor(ctx.peaks.expected.visitors), `At expected peak (${ctx.peaks.expected.visitors} visitors)`),
    campaign: predict(arrivalsFor(ctx.peaks.campaign.visitors), `At campaign peak (${ctx.peaks.campaign.visitors} visitors)`),
  };

  // Measured
  const secs = ctx.timeline.seconds;
  const timeoutShare = (s) => (s.routes[route]?.rps ? (s.routes[route].timeouts ?? 0) / s.routes[route].rps : 0);
  const firstTimeout = secs.find((s) => (s.routes[route]?.timeouts ?? 0) > 0);
  // Sustained: at least 1% of the second's requests timed out, 3 seconds in a row
  const sustained = secs.find((s, i) => [0, 1, 2].every((k) => secs[i + k] && timeoutShare(secs[i + k]) >= 0.01));
  const firstRefused = secs.find((s) => (s.routes[route]?.fallbacks?.connection ?? 0) > 0);
  const byStage = ctx.stages
    .filter((s) => s.routes[route]?.requests)
    .map((s) => {
      const r = s.routes[route];
      return { load: s.label, timed_out: percent((r.fallbacks.timeout ?? 0) / r.requests), refused: percent((r.fallbacks.connection ?? 0) / r.requests) };
    })
    .filter((x) => x.timed_out !== '0%' || x.refused !== '0%');
  let measured;
  if (!firstTimeout || !timeout) {
    measured = {
      none: true,
      summary:
        ctx.timeline.loadKind === 'vus'
          ? `No ${route} requests timed out. This is a closed test: when the server slows down, its virtual users wait and send less, so the queue can't grow without limit. Real visitors keep arriving, so treat the prediction as the better guide.`
          : `No ${route} requests timed out in this run.`,
    };
  } else {
    // k6 records a request when it ends, so a timed-out request was sent
    // `timeout` seconds before it shows up
    const sentAt = (entry) => entry.second - timeout;
    const labelAt = (second) => (secs.find((s) => s.second >= second) ?? secs[0]).stageLabel;
    // When the arriving load first went over capacity (open tests: from the target)
    // (at least 2% over, so a level that sits right at capacity doesn't count)
    const over = ctx.timeline.loadKind === 'arrival-rate' ? secs.find((s) => s.target * rpv > capacityRps * 1.02) : null;
    const after = (second) => (over ? round(second - over.second) : null);
    const ref = sustained ?? firstTimeout;
    const refStage = ctx.stages.find((s) => s.index >= ((secs.find((x) => x.second >= sentAt(ref)) ?? ref).stage ?? 0));
    const compare = refStage ? predict(refStage.target * rpv, `Predicted for ${refStage.label}`) : null;
    measured = {
      first_timeout_sent_at_second: sentAt(firstTimeout),
      sustained_timeouts_from_second: sustained ? sentAt(sustained) : null,
      first_refused_connection_at_second: firstRefused?.second ?? null,
      seconds_after_load_went_over_capacity: sustained ? after(sentAt(sustained)) : after(sentAt(firstTimeout)),
      by_stage: byStage,
      predicted_for_that_load: compare,
      summary:
        (over ? `The arriving load first went over capacity at second ${over.second} (during the ramp to ${labelAt(over.second)}). ` : '') +
        `The first ${route} request that timed out was sent at second ${sentAt(firstTimeout)}` +
        (over ? ` (${after(sentAt(firstTimeout))}s later)` : '') +
        `; timeouts became sustained (1%+ of requests, 3 seconds in a row) ` +
        (sustained ? `from second ${sentAt(sustained)}${over ? ` (${after(sentAt(sustained))}s after going over)` : ''}, at ${labelAt(sentAt(sustained))}` : 'never') +
        `.` +
        (firstRefused ? ` Refused connections started at second ${firstRefused.second}.` : '') +
        ` By stage: ${byStage.map((b) => `${b.load}: ${b.timed_out} timed out, ${b.refused} refused`).join('; ')}.`,
    };
    measured.note =
      'The prediction assumes the load jumps straight to that level, like an ad going live. The test ramps up over 30 seconds instead, so the queue grows more slowly at first, which is why the measured time is longer.';
    measured.summary += ` ${measured.note}`;
  }
  return { timeout_seconds: timeout, predicted, measured };
}

// Normal-day impact for a campaign scenario, from the latest main run's
// findings.json: the stage closest to the expected peak
function normalDayImpact(routes, ctx) {
  const nd = ctx.normalDay;
  if (!nd || nd.missing) {
    return { impact: { level: 'expected peak (normal day)', summary: nd?.missing ?? 'No normal-day numbers.', failures: null, left: null, source: null }, headroomPct: null, headroomNote: null, failing: false };
  }
  const main = nd.output;
  const mainCtx = { stages: main.stages, routeContext: ctx.routeContext, config: ctx.config, totalRequestsPerVisit: main.visit.totalRequestsPerVisit };
  const there = routes.filter((r) => main.stages.some((s) => s.routes[r]));
  const impact = impactAt(main.peaks.expected, there, mainCtx);
  impact.summary = `On a normal day (from main test run ${nd.run}, where about ${percent(main.visit.requestsPerVisit['GET /signup'] ?? 0)} of visitors reach sign-up): ${impact.summary}` + (nd.warning ? ` Warning: ${nd.warning}` : '');
  impact.source = nd.run;
  impact.warning = nd.warning;

  // Normal-day headroom: the main run's limit for the route, or at least up to
  // the highest load it tested
  const expected = ctx.peaks.expected.visitors;
  const route = there[0];
  const knee = main.knees[route];
  let headroomPct = null;
  let headroomNote = null;
  if (!knee) {
    const top = main.stages[main.stages.length - 1];
    headroomPct = round(((top.visitorsAtOnce - expected) / expected) * 100, 0);
    headroomNote = `no limit reached up to ${top.label} (about ${Math.round(top.visitorsAtOnce)} visitors at once) in the main test, so at least ${headroomPct}% to spare at expected peak (${expected})`;
  } else {
    const f = main.findings.find((x) => x.affected_routes.includes(route) && x.headroom);
    if (f) {
      headroomPct = f.headroom.expected_pct;
      headroomNote = `the main test found a limit at about ${f.headroom.break_point_visitors} visitors at once: ${headroomPct >= 0 ? `${headroomPct}% to spare` : `${-headroomPct}% over the limit`} at expected peak (${expected})`;
    }
  }
  const kneeStage = knee ? main.stages.find((s) => s.index === knee.stage) : null;
  const failing = (impact.failures ?? 0) > 0 || (impact.left ?? 0) > 0 || Boolean(kneeStage && kneeStage.visitorsAtOnce <= expected);
  return { impact, headroomPct, headroomNote, failing };
}

function canWaitCampaign(severity, normal, atCampaign, ifIgnored) {
  const growth = ifIgnored.class === 'grows with data' ? ' It also gets slower as the data grows.' : '';
  const lost = atCampaign.lost_signups?.lost ?? 0;
  const what = [atCampaign.left ? `${num(atCampaign.left)} visitors left` : null, lost ? `${num(lost)} sign-ups were lost` : null].filter(Boolean).join(' and ');
  const warn = normal.impact.warning ? ' (Check the normal-day numbers are current: see normal_day_warning.)' : '';
  if (severity === 'critical') return `No: the main test shows sign-up failing on a normal day too, not just during a campaign.${growth}`;
  if (severity === 'high') return `Fine on a normal day (${normal.headroomNote ?? 'no main run to check'}), but don't run a sign-up campaign until it's fixed${what ? `: at campaign peak ${what}` : ''}.${growth}${warn}`;
  if (severity === 'medium') return `For now: it copes with a sign-up campaign, but with little to spare.${growth}${warn}`;
  return `Yes: it copes with a sign-up campaign.${growth}${warn}`;
}

function canWait(severity, headroom, ifIgnored, criticalFailures, capacity, peaks) {
  const growth = ifIgnored.class === 'grows with data' ? ' It also gets slower as the data grows.' : '';
  if (criticalFailures.length && severity !== 'critical') {
    return `No: it affects a critical route, and ${criticalFailures.map(([r, n]) => `${num(n)} ${r} requests`).join(', ')} failed in the test.${growth}`;
  }
  if (!headroom) {
    return ifIgnored.class === 'grows with data'
      ? `Yes for now: nothing broke because of it, but it gets slower as the table grows; fix it before the data grows about ${GROWTH}x.`
      : 'Probably: nothing measured explains the slowdown yet, so measure more before deciding.';
  }
  const word = (p) => (p >= 0 ? `${p}% to spare` : `${-p}% over its limit`);
  if (severity === 'critical') return `No: at a normal busy hour (${peaks.expected.visitors} visitors) it's already ${word(headroom.expected_pct)}, so visitors are affected today.${growth}`;
  if (severity === 'high') return `Not past the next campaign: it copes with a normal busy hour (${word(headroom.expected_pct)}), but an ad would push it ${word(headroom.campaign_pct)}.${growth}`;
  if (severity === 'medium') return `For now: it copes at both peaks, but with only ${headroom.campaign_pct}% to spare at campaign peak.${growth}`;
  return `Yes: even at campaign peak it has ${headroom.campaign_pct}% to spare; revisit if traffic grows.${growth}`;
}

// ---------- Sign-up funnel and lost sign-ups ----------

const STEP_NAMES = {
  landed: 'Landed on the homepage',
  tried_signup: 'Went on to the sign-up page',
  opened_signup: 'Opened the sign-up page',
  left_without_submitting: 'Left without submitting (voluntary drop-off)',
  submitted: 'Submitted an email',
  signed_up: 'Account created',
  email_taken: 'Email already had an account',
  signup_lost: 'Sign-up failed (lost)',
};

const PAGE = 'GET /signup';
const SUBMIT = 'POST /api/signup';

function lostSignupsAt(stage, ctx) {
  const f = stage.funnel;
  const attempts = f.submitted ?? 0;
  const pageLeft = outcomeAt(f, 'left', PAGE);
  if (!attempts && !pageLeft.total) return null;
  const lost = f.signup_lost ?? 0;
  const lostWhy = outcomeAt(f, 'left', SUBMIT);
  const tried = (f.opened_signup ?? 0) + pageLeft.total;
  const attemptsSummary = lost
    ? `${num(lost)} of ${num(attempts)} sign-up attempts failed (${reasonList(lostWhy.byReason, effectiveTimeoutMs(SUBMIT, ctx))}): ${percent(lost / attempts)} of people who tried to open an account couldn't.`
    : `None of the ${num(attempts)} sign-up attempts failed.`;
  let summary = attemptsSummary;
  if (pageLeft.total) {
    summary += ` Before that, ${num(pageLeft.total)} of ${num(tried)} visitors (${percent(pageLeft.total / tried)}) left because the sign-up page didn't appear (${reasonList(pageLeft.byReason, effectiveTimeoutMs(PAGE, ctx))}).`;
  }
  return {
    stage: stage.label,
    attempts,
    lost,
    lost_share: round(lost / Math.max(1, attempts), 3),
    left_at_signup_page: pageLeft.total,
    tried_to_open: tried,
    attempts_summary: attemptsSummary, // without the sign-up page part
    summary,
  };
}

export function funnelReport(ctx, totalFunnel) {
  const f = totalFunnel;
  const steps = [];
  const add = (key, count, of) => {
    if (count === undefined) return;
    steps.push({ step: key, name: STEP_NAMES[key] ?? key, count, share_of_previous: of ? round(count / of, 3) : null });
  };
  const leftAt = (route) => outcomeAt(f, 'left', route);
  const homeLeft = leftAt('GET /');
  const pageLeft = leftAt(PAGE);
  const submitLeft = leftAt(SUBMIT);
  const tried = (f.opened_signup ?? 0) + pageLeft.total;

  if (f.landed !== undefined || homeLeft.total) {
    add('landed', f.landed ?? 0, (f.landed ?? 0) + homeLeft.total);
    if (homeLeft.total) steps.push({ step: 'left@GET /', name: "Left: the homepage didn't load", count: homeLeft.total, by_reason: homeLeft.byReason });
    const degraded = outcomeAt(f, 'degraded', 'GET /api/rates');
    steps.push({ step: 'degraded@GET /api/rates', name: 'Carried on with degraded rate cards', count: degraded.total, share_of_previous: f.landed ? round(degraded.total / f.landed, 3) : null, by_reason: degraded.byReason });
    add('tried_signup', tried, f.landed);
  }
  steps.push({ step: `left@${PAGE}`, name: "Left: the sign-up page didn't appear", count: pageLeft.total, share_of_previous: tried ? round(pageLeft.total / tried, 3) : null, by_reason: pageLeft.byReason });
  add('opened_signup', f.opened_signup, tried);
  add('left_without_submitting', f.left_without_submitting, f.opened_signup);
  add('submitted', f.submitted, f.opened_signup);
  add('signed_up', f.signed_up, f.submitted);
  add('email_taken', f.email_taken, f.submitted);
  steps.push({ step: 'signup_lost', name: STEP_NAMES.signup_lost, count: f.signup_lost ?? 0, share_of_previous: f.submitted ? round((f.signup_lost ?? 0) / f.submitted, 3) : null, by_reason: submitLeft.byReason });

  const byStage = ctx.stages.map((s) => ({ load: s.label, ...s.funnel }));
  const lostAt = (level) => lostSignupsAt(ctx.stages.find((s) => s.index === level.closestStage), ctx);
  const lost = {};
  const exp = lostAt(ctx.peaks.expected);
  const camp = lostAt(ctx.peaks.campaign);
  if (exp) lost.expected = { ...exp, summary: `At expected peak (${ctx.peaks.expected.visitors} visitors, closest: ${exp.stage}): ${exp.summary}` };
  if (camp) lost.campaign = { ...camp, summary: `At campaign peak (${ctx.peaks.campaign.visitors} visitors, closest: ${camp.stage}): ${camp.summary}` };

  const voluntary = f.left_without_submitting ?? 0;
  return {
    steps,
    by_stage: byStage,
    voluntary_drop_off: f.opened_signup
      ? `${num(voluntary)} of ${num(f.opened_signup)} visitors who opened the sign-up page (${percent(voluntary / f.opened_signup)}) left without submitting. That's their choice, not a failure.`
      : null,
    lost_signups: Object.keys(lost).length ? lost : null,
  };
}
