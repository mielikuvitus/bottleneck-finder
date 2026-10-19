// Analyses a load-test run and writes findings.json into its folder.
//
// Usage: node analyzer/analyze.mjs load-tests/results/<run>
//
// Steps: per-stage numbers for each route and the server -> the knee for each
// route -> the visit model (visit length, requests per visit) -> findings
// (rules.mjs) -> findings.json and a readable summary.
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { buildTimeline } from './timeline.mjs';
import { percentile, readJson, readRawCsv, round, stageAt } from './lib.mjs';
import { buildFindings, funnelReport } from './rules.mjs';
import { percent, seconds } from './describe.mjs';

// A sharp p95 jump: at least this many times the previous stage AND at least
// this many ms slower. Both, so 2ms -> 4ms or 2000ms -> 2150ms don't count.
const KNEE_RATIO = 1.5;
const KNEE_MIN_MS = 100;
const KNEE_ERROR_RATE = 0.01; // or errors above 1%
// Throughput plateau: load went up but completed requests didn't keep up
const PLATEAU_SHARE = 0.85;

const runDir = process.argv[2];
if (!runDir) {
  console.error('Usage: node analyzer/analyze.mjs load-tests/results/<run>');
  process.exit(1);
}

// Prefer the config copied into the run folder (what the run used)
const fromRun = (name, fallback) => readJson(existsSync(join(runDir, name)) ? join(runDir, name) : fallback);
const config = fromRun('test-config.json', 'load-tests/test-config.json');
const routeContext = fromRun('route-context.json', 'analyzer/route-context.json');

// The run's label (run.json): which test, whether it's superseded, which code version
const runInfoOf = (dir) =>
  existsSync(join(dir, 'run.json'))
    ? readJson(join(dir, 'run.json'))
    : { test: basename(dir).replace(/-superseded$/, '').split('-').pop(), superseded: basename(dir).endsWith('-superseded'), git: null };
const runInfo = runInfoOf(runDir);
// The sign-up test is a campaign scenario: judged at the campaign peak, with
// normal-day numbers taken from the latest main run
// (how to judge the test, so older runs without it use the current config)
const scenario =
  runInfo.test === 'signup'
    ? (config.signup_test?.scenario ?? readJson('load-tests/test-config.json').signup_test?.scenario ?? null)
    : null;

function loadNormalDay() {
  const resultsDir = dirname(runDir);
  const mains = readdirSync(resultsDir)
    .map((name) => join(resultsDir, name))
    .filter((dir) => { const info = runInfoOf(dir); return info.test === 'main' && !info.superseded; })
    .sort();
  const dir = mains.pop();
  if (!dir) return { missing: 'No main run found, so there are no normal-day numbers: run npm run load first.' };
  if (!existsSync(join(dir, 'findings.json'))) {
    return { missing: `The main run ${basename(dir)} hasn't been analysed yet: run npm run analyze -- ${dir} first, then this one.` };
  }
  // Warn when the normal-day numbers may not match this code
  const mainGit = runInfoOf(dir).git;
  const thisGit = runInfo.git;
  let warning = null;
  if (!mainGit || !thisGit || mainGit.commit !== thisGit.commit) {
    warning = `Normal-day numbers come from main run ${basename(dir)}, made on a different version of the code (${mainGit?.commit ?? 'unknown'} vs ${thisGit?.commit ?? 'unknown'}). Re-run npm run load to check normal days still work.`;
  } else if (mainGit.uncommitted_changes || thisGit.uncommitted_changes) {
    warning = `Normal-day numbers come from main run ${basename(dir)}. Both runs are on commit ${thisGit.commit}, but with uncommitted changes, so the code may differ between them. Re-run npm run load if anything changed.`;
  }
  return { run: basename(dir), output: readJson(join(dir, 'findings.json')), warning };
}

const timelinePath = join(runDir, 'timeline.json');
let timeline;
if (existsSync(timelinePath)) timeline = readJson(timelinePath);
else {
  timeline = await buildTimeline(runDir);
  writeFileSync(timelinePath, JSON.stringify(timeline));
}

const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

// ---------- Per-stage numbers (hold stages only: the steady part) ----------

// Funnel counts by step ("left"), and for "left" and "degraded" also by where
// and why ("left@GET /signup#timeout")
function addFunnel(counts, row) {
  const { step, at, reason } = row.tags;
  counts[step] = (counts[step] ?? 0) + row.value;
  if (at) {
    const key = `${step}@${at}#${reason}`;
    counts[key] = (counts[key] ?? 0) + row.value;
  }
}

async function collectHolds() {
  const holds = new Map(
    timeline.stages
      .filter((s) => s.phase === 'hold')
      .map((s) => [s.index, { stage: s, routes: {}, iterations: 0, iterationMs: [], funnel: {} }])
  );
  const totalFunnel = {};

  await readRawCsv(runDir, (row) => {
    if (row.metric === 'funnel') addFunnel(totalFunnel, row);
    const where = stageAt(timeline, row.time - timeline.startTime);
    const hold = where && holds.get(where.stage.index);
    if (!hold) return;

    const route = row.tags.route;
    const r = route && (hold.routes[route] ??= { durations: [], requests: 0, errors: 0, fallbacks: {} });
    if (row.metric === 'http_req_duration' && r) {
      // Times only from successful requests: a refused connection isn't a wait
      r.requests++;
      if (row.expected) r.durations.push(row.value);
    }
    else if (row.metric === 'http_req_failed' && r && row.value === 1) r.errors++;
    else if (row.metric === 'fallback_shown' && r) r.fallbacks[row.tags.reason] = (r.fallbacks[row.tags.reason] ?? 0) + row.value;
    else if (row.metric === 'iterations') hold.iterations += row.value;
    else if (row.metric === 'iteration_duration') hold.iterationMs.push(row.value);
    else if (row.metric === 'funnel') addFunnel(hold.funnel, row);
  });
  return { holds: [...holds.values()], totalFunnel };
}

// Averages the per-second server samples of one stage
function serverStats(secs) {
  const samples = secs.map((s) => s.server).filter(Boolean);
  const ok = samples.filter((s) => !s.pollFailed);
  if (!ok.length) return null;

  const pools = {};
  for (const name of new Set(ok.flatMap((s) => Object.keys(s.pools)))) {
    const values = ok.map((s) => s.pools[name]).filter(Boolean);
    pools[name] = {
      limit: values[0].limit,
      fullShare: values.filter((p) => p.inFlight >= p.limit).length / values.length, // share of seconds with every slot in use
      inFlightAvg: round(mean(values.map((p) => p.inFlight))),
      queuedAvg: round(mean(values.map((p) => p.queued))),
      queuedMax: Math.max(...values.map((p) => p.queued)),
    };
  }

  // Timed synchronous work: share of each second it used, and its per-call time
  const timed = {};
  for (const kind of ['render', 'db']) {
    for (const name of new Set(ok.flatMap((s) => Object.keys(s[kind] ?? {})))) {
      const present = ok.map((s) => s[kind]?.[name]).filter(Boolean);
      timed[`${kind}:${name}`] = {
        kind,
        name,
        share: round(mean(ok.map((s) => s[kind]?.[name]?.share ?? 0)), 3),
        avgMs: round(mean(present.map((p) => p.avgMs)), 2),
        calls: present.reduce((sum, p) => sum + p.count, 0),
        op: present.find((p) => p.op)?.op ?? null,
      };
    }
  }

  return {
    samples: samples.length,
    loopUtil: round(mean(ok.map((s) => s.loopUtil)), 3),
    delayMs: round(percentile(ok.map((s) => s.delayMs), 0.5)),
    delayP90Ms: round(percentile(ok.map((s) => s.delayMs), 0.9)),
    cpuPercent: round(mean(ok.map((s) => s.cpuPercent))),
    pollMs: round(percentile(ok.map((s) => s.pollMs ?? 0), 0.5)),
    pollFailures: samples.length - ok.length,
    pools,
    timed,
  };
}

function stageStats(hold) {
  const { stage } = hold;
  const holdSeconds = stage.end - stage.start;
  const routes = {};
  for (const [route, r] of Object.entries(hold.routes)) {
    const requests = r.requests;
    const fallbackCount = Object.values(r.fallbacks).reduce((a, b) => a + b, 0);
    routes[route] = {
      requests,
      // Throughput: successful requests per second (what the server actually completed)
      rps: round(r.durations.length / holdSeconds),
      attemptsPerSecond: round(requests / holdSeconds),
      p50: round(percentile(r.durations, 0.5)),
      p95: round(percentile(r.durations, 0.95)),
      errors: r.errors,
      errorRate: requests ? r.errors / requests : 0,
      fallbackCount,
      fallbacks: r.fallbacks,
    };
  }
  return {
    index: stage.index,
    label: stage.label,
    target: stage.target,
    holdSeconds,
    iterations: hold.iterations,
    visitsPerSecond: round(hold.iterations / holdSeconds),
    iterationMs: hold.iterationMs,
    funnel: hold.funnel,
    // Measured visitors at once: active virtual users, each one mid-visit
    measuredVisitorsAtOnce: round(mean(timeline.seconds.filter((s) => s.stage === stage.index && s.vus !== null).map((s) => s.vus))),
    routes,
    server: serverStats(timeline.seconds.filter((s) => s.stage === stage.index)),
  };
}

// ---------- The knee: the first sharp p95 jump (or errors) per route ----------

function findKnee(stages, route) {
  const seen = stages.filter((s) => s.routes[route]);
  for (let i = 0; i < seen.length; i++) {
    const cur = seen[i].routes[route];
    const prev = i > 0 ? seen[i - 1].routes[route] : null;
    const reasons = [];
    if (cur.errorRate > KNEE_ERROR_RATE && (!prev || prev.errorRate <= KNEE_ERROR_RATE)) reasons.push('errors');
    if (prev && cur.p95 >= prev.p95 * KNEE_RATIO && cur.p95 - prev.p95 >= KNEE_MIN_MS) reasons.push('p95');
    if (reasons.length) {
      // Did completed requests keep up with the extra load?
      const expectedRps = prev ? prev.rps * (seen[i].target / seen[i - 1].target) : null;
      const plateau = expectedRps ? cur.rps < expectedRps * PLATEAU_SHARE : false;
      return {
        stage: seen[i].index,
        load: seen[i].label,
        previousStage: i > 0 ? seen[i - 1].index : null,
        previousLoad: i > 0 ? seen[i - 1].label : null,
        p95Before: prev?.p95 ?? null,
        p95After: cur.p95,
        reasons,
        plateau,
        rpsBefore: prev?.rps ?? null,
        rpsAfter: cur.rps,
        expectedRps: round(expectedRps),
      };
    }
  }
  return null;
}

// ---------- Run it ----------

const { holds, totalFunnel } = await collectHolds();
const stages = holds.map(stageStats).sort((a, b) => a.index - b.index);
const routes = [...new Set(stages.flatMap((s) => Object.keys(s.routes)))];
const knees = Object.fromEntries(routes.map((route) => [route, findKnee(stages, route)]));

// The visit model, from the healthy stages (before any route's knee): a
// slow, overloaded stage stretches visits and would make the site look like
// it holds more visitors than it does
const firstKnee = Math.min(...Object.values(knees).filter(Boolean).map((k) => k.stage), Infinity);
let healthy = stages.filter((s) => s.index < firstKnee);
if (!healthy.length) healthy = stages.slice(0, 1);
const healthyVisits = healthy.reduce((sum, s) => sum + s.iterations, 0);
const measuredVisitSeconds = mean(healthy.flatMap((s) => s.iterationMs)) / 1000;
const visitSeconds = config.avg_visit_seconds ?? measuredVisitSeconds;
const requestsPerVisit = Object.fromEntries(
  routes.map((route) => [route, healthy.reduce((sum, s) => sum + (s.routes[route]?.requests ?? 0), 0) / healthyVisits])
);
const totalRequestsPerVisit = Object.values(requestsPerVisit).reduce((a, b) => a + b, 0);

// Visitors on the site at once at a stage. In a closed test each virtual user
// is one visitor; in an open test, Little's law: visits/s x visit length.
const visitorsAt = (stage) => (timeline.loadKind === 'vus' ? stage.target : stage.target * visitSeconds);
for (const stage of stages) stage.visitorsAtOnce = round(visitorsAt(stage));

const visit = {
  avgVisitSeconds: round(visitSeconds, 2),
  source: config.avg_visit_seconds ? 'test-config.json' : `measured from the healthy stages (${healthy.map((s) => s.label).join(', ')})`,
  requestsPerVisit: Object.fromEntries(Object.entries(requestsPerVisit).map(([r, n]) => [r, round(n, 2)])),
  totalRequestsPerVisit: round(totalRequestsPerVisit, 2),
};

// "200 VUs", or "70 visits/s (about 110 visitors at once)" for open tests
const loadLabel = (stage) =>
  timeline.loadKind === 'vus'
    ? stage.label
    : `${stage.label} (planned about ${Math.round(stage.visitorsAtOnce)} visitors at once, measured ${Math.round(stage.measuredVisitorsAtOnce ?? 0)})`;

// A peak in visitors at once -> visits/s and the closest tested stage
function peakLevel(name, visitors) {
  const closest = stages.reduce((best, s) =>
    Math.abs(s.visitorsAtOnce - visitors) < Math.abs(best.visitorsAtOnce - visitors) ? s : best
  );
  const highest = Math.max(...stages.map((s) => s.visitorsAtOnce));
  return {
    name,
    visitors,
    visitsPerSecond: round(visitors / visitSeconds, 1),
    closestStage: closest.index,
    closestLoad: loadLabel(closest),
    aboveTested: visitors > highest * 1.1,
  };
}
const peaks = {
  expected: peakLevel('expected peak (normal busy hour)', config.expected_peak_visitors),
  campaign: peakLevel('campaign peak (just after an ad goes live)', config.campaign_peak_visitors),
};
const limit = stages[stages.length - 1];

const normalDay = scenario === 'campaign' ? loadNormalDay() : null;
const ctx = { scenario, normalDay, loadLabel, runDir, config, routeContext, timeline, stages, routes, knees, visit, visitSeconds, requestsPerVisit, totalRequestsPerVisit, peaks, limit };
const findings = buildFindings(ctx);
const funnel = funnelReport(ctx, totalFunnel);
const healthyRoutes = routes
  .filter((route) => !knees[route])
  .map((route) => ({ route, note: `No knee up to ${loadLabel(limit)}: p95 ${seconds(limit.routes[route]?.p95)} at the highest load.` }));

const output = {
  run: basename(runDir),
  test: runInfo.test,
  superseded: Boolean(runInfo.superseded),
  ...(runInfo.superseded ? { superseded_reason: runInfo.reason } : {}),
  scenario,
  ...(normalDay ? { normal_day_from: normalDay.run ?? null, normal_day_warning: normalDay.warning ?? normalDay.missing ?? null } : {}),
  generatedAt: new Date().toISOString(),
  loadKind: timeline.loadKind,
  visit,
  peaks,
  stages: stages.map(({ iterationMs, ...s }) => s),
  knees,
  funnel,
  healthyRoutes,
  findings,
};
writeFileSync(join(runDir, 'findings.json'), JSON.stringify(output, null, 2));

// ---------- Readable summary ----------

console.log(`\n${output.run}: ${findings.length} finding(s), written to ${join(runDir, 'findings.json')}`);
console.log(`Visit: ${visit.avgVisitSeconds}s on average, ${visit.totalRequestsPerVisit} requests (${visit.source})`);
for (const f of findings) {
  console.log(`\n[${f.severity.toUpperCase()}] ${f.title}  (${f.route}, confidence ${f.confidence})`);
  if (f.knee_at) console.log(`  Knee: ${f.knee_at.load} (p95 ${seconds(f.knee_at.p95_before)} -> ${seconds(f.knee_at.p95_after)})`);
  if (f.capacity) console.log(`  Capacity: ${f.capacity.summary}`);
  if (f.headroom) console.log(`  Headroom: ${f.headroom.summary}`);
  console.log(`  Can wait? ${f.can_wait}`);
}
if (funnel.lost_signups) {
  console.log('\nSign-ups:');
  for (const level of Object.values(funnel.lost_signups)) console.log(`  ${level.summary}`);
}
for (const h of healthyRoutes) console.log(`\nHealthy: ${h.route}: ${h.note}`);
console.log(`\nErrors overall: ${percent(stages.reduce((a, s) => a + Object.values(s.routes).reduce((b, r) => b + r.errors, 0), 0) / Math.max(1, stages.reduce((a, s) => a + Object.values(s.routes).reduce((b, r) => b + r.requests, 0), 0)))} of requests in the hold stages`);
