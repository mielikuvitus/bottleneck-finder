// Sign-up-heavy load test. Visitors land directly on /signup, like an ad
// campaign that links straight to sign-up (see test-config.json).
//
// Like the main test, it uses an "open" model: k6 starts a set number of
// visits per second however slow the server gets, like real visitors
// arriving.
import { config, signUp, stagesFor, thresholdsFor } from './lib.js';

// Sign-up visits started per second. About 70/s is the expected peak and
// about 160/s the campaign peak (in visitors at once, at ~1.6s per visit).
// Visitors leave after patience_seconds (test-config.json), so visits are short.
const RATES = [10, 25, 40, 55, 70, 100, 160];

export const options = {
  scenarios: {
    signup: {
      executor: 'ramping-arrival-rate',
      exec: 'visit',
      startRate: 0,
      timeUnit: '1s', // targets are visits started per second
      // k6 keeps a pool of virtual users to run the visits. If responses get
      // slow and the pool runs out, it skips visits and counts them in
      // dropped_iterations.
      preAllocatedVUs: 800,
      maxVUs: 3000,
      stages: stagesFor(RATES),
    },
  },
  thresholds: thresholdsFor(['GET /signup', 'POST /api/signup']),
};

export function visit() {
  signUp({
    submitShare: config.signup_test.submit_signup,
    reuseShare: config.signup_test.reuse_seeded_email,
  });
}
