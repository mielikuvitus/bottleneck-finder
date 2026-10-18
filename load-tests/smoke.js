// Smoke test: 1 virtual user for 10 seconds, just to prove the script and
// the server work before a big run.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {
    checks: ['rate==1'], // every check must pass
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/`, { tags: { route: 'GET /' } });
  check(res, { 'homepage is 200': (r) => r.status === 200 });
  sleep(1);
}
