// Main load test: ~90% of virtual users browse, ~10% sign up, stepping up
// through 10, 50, 100 and 200 virtual users.
import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const RUN_ID = __ENV.RUN_ID || `${Date.now()}`;

// Each level ramps up for RAMP, then holds for HOLD.
// Override both for a quick dry run, e.g. RAMP=5s HOLD=5s.
const RAMP = __ENV.RAMP || '30s';
const HOLD = __ENV.HOLD || '1m';
const LEVELS = [10, 50, 100, 200];

function stagesFor(share) {
  const stages = [];
  for (const total of LEVELS) {
    const target = Math.round(total * share);
    stages.push({ duration: RAMP, target }, { duration: HOLD, target });
  }
  stages.push({ duration: RAMP, target: 0 });
  return stages;
}

const ROUTES = ['GET /', 'GET /api/rates', 'GET /signup', 'POST /api/signup'];
const perRouteThresholds = Object.fromEntries(
  ROUTES.map((route) => [`http_req_duration{route:${route}}`, ['p(95)<500']])
);

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      exec: 'browse',
      startVUs: 0,
      stages: stagesFor(0.9),
    },
    signup: {
      executor: 'ramping-vus',
      exec: 'signup',
      startVUs: 0,
      stages: stagesFor(0.1),
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    ...perRouteThresholds,
  },
};

// 1-3 seconds, like a person reading or typing
function think() {
  sleep(1 + Math.random() * 2);
}

export function browse() {
  const home = http.get(`${BASE_URL}/`, { tags: { route: 'GET /' } });
  check(home, { 'homepage is 200': (r) => r.status === 200 });

  // The homepage's script (home.js) fetches the rates straight after loading
  const rates = http.get(`${BASE_URL}/api/rates`, { tags: { route: 'GET /api/rates' } });
  check(rates, { 'rates is 200': (r) => r.status === 200 });

  think(); // reading the page
  think(); // before the next visit
}

export function signup() {
  const page = http.get(`${BASE_URL}/signup`, { tags: { route: 'GET /signup' } });
  check(page, { 'signup page is 200': (r) => r.status === 200 });
  think();

  // About 1 in 10 sign-ups reuses a seeded email, to hit the "already taken" path
  const reuse = Math.random() < 0.1;
  const email = reuse
    ? `user${1 + Math.floor(Math.random() * 100000)}@example.com`
    : `load-${RUN_ID}-${exec.vu.idInTest}-${exec.vu.iterationInScenario}@example.com`;
  const expected = reuse ? 409 : 201;

  const res = http.post(`${BASE_URL}/api/signup`, JSON.stringify({ email }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { route: 'POST /api/signup', email_type: reuse ? 'taken' : 'new' },
    // Tell k6 which status is correct, so a 409 here isn't counted as a failure
    responseCallback: http.expectedStatuses(expected),
  });
  check(res, { [`signup is ${expected}`]: (r) => r.status === expected });
  think();
}
