// Shared by the k6 tests: config, think time, requests with timeouts, and
// counters for fallbacks and funnel steps.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import exec from 'k6/execution';

export const config = JSON.parse(open('./test-config.json'));
const routeContext = JSON.parse(open('../analyzer/route-context.json'));

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const RUN_ID = __ENV.RUN_ID || `${Date.now()}`;

// Each level ramps up for RAMP, then holds for HOLD.
// Override both for a quick dry run, e.g. RAMP=5s HOLD=5s.
const RAMP = __ENV.RAMP || '30s';
const HOLD = __ENV.HOLD || '1m';

export function stagesFor(levels) {
  const stages = [];
  for (const target of levels) {
    stages.push({ duration: RAMP, target }, { duration: HOLD, target });
  }
  stages.push({ duration: RAMP, target: 0 });
  return stages;
}

export function thresholdsFor(routes) {
  return {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    ...Object.fromEntries(routes.map((route) => [`http_req_duration{route:${route}}`, ['p(95)<500']])),
  };
}

// Every request where a visitor would see a fallback instead of the real
// content, by route and reason (timeout, connection, server_error)
const fallbackShown = new Counter('fallback_shown');
// How many visitors reached each step, by step name (plus where and why
// for "left" and "degraded")
const funnel = new Counter('funnel');

export function step(name, tags = {}) {
  funnel.add(1, { step: name, ...tags });
}

// 1-3 seconds, like a person reading or typing
export function think() {
  sleep(1 + Math.random() * 2);
}

// How long k6 waits for a route: the site's own timeout, or the visitor's
// patience for requests they wait for (on_failure "left"), whichever is shorter
export function timeoutFor(route) {
  const ctx = routeContext[route] ?? {};
  const limits = [ctx.timeout_ms];
  if (ctx.on_failure === 'left') limits.push(config.patience_seconds * 1000);
  const set = limits.filter((ms) => ms);
  return set.length ? Math.min(...set) : null;
}

function failureReason(res, expected) {
  if (res.error_code === 1050) return 'timeout'; // k6: request timed out
  if (res.status === 0) return 'connection'; // no response at all
  if (!expected.includes(res.status)) return 'server_error';
  return null;
}

// A request with that route's timeout. When it fails, records what the
// visitor does (route-context on_failure): "left" or "degraded".
// Returns the response, whether it worked, and whether the visitor left.
export function request(method, route, path, { body, expected = [200], tags = {} } = {}) {
  const timeout = timeoutFor(route);
  const params = {
    headers: body ? { 'Content-Type': 'application/json' } : {},
    tags: { route, ...tags },
    // Tell k6 which statuses are correct, so e.g. a 409 isn't counted as a failure
    responseCallback: http.expectedStatuses(...expected),
    ...(timeout ? { timeout: `${timeout}ms` } : {}),
  };
  const res = http.request(method, `${BASE_URL}${path}`, body ? JSON.stringify(body) : null, params);

  const reason = failureReason(res, expected);
  check(res, { [`${route} worked`]: () => reason === null });
  if (!reason) return { res, ok: true, left: false };

  fallbackShown.add(1, { route, reason });
  const outcome = routeContext[route]?.on_failure === 'degraded' ? 'degraded' : 'left';
  step(outcome, { at: route, reason });
  return { res, ok: false, left: outcome === 'left' };
}

// Opens the sign-up page and maybe submits it. submitShare and reuseShare
// come from test-config.json.
export function signUp({ submitShare, reuseShare }) {
  const page = request('GET', 'GET /signup', '/signup');
  if (page.left) return; // the page didn't appear in time: the visitor leaves
  step('opened_signup');

  if (Math.random() >= submitShare) {
    step('left_without_submitting'); // voluntary drop-off
    return;
  }
  think(); // typing the email

  // Some submissions reuse a seeded email, to hit the "already taken" path
  const reuse = Math.random() < reuseShare;
  const email = reuse
    ? `user${1 + Math.floor(Math.random() * 100000)}@example.com`
    : `load-${RUN_ID}-${exec.vu.idInTest}-${exec.vu.iterationInScenario}@example.com`;

  step('submitted');
  const post = request('POST', 'POST /api/signup', '/api/signup', {
    body: { email },
    expected: [reuse ? 409 : 201],
    tags: { email_type: reuse ? 'taken' : 'new' },
  });
  if (!post.ok) step('signup_lost'); // also recorded as "left" above
  else step(reuse ? 'email_taken' : 'signed_up');
}
