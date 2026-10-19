// Main load test: every visitor lands on the homepage (which loads the rates),
// and some go on to sign up.
//
// It uses an "open" model: k6 starts a set number of visits per second
// however slow the site gets, like real public traffic.
import { config, request, signUp, step, think, stagesFor, thresholdsFor } from './lib.js';

// Peaks in visitors at once -> visits started per second
const expected = Math.round(config.expected_peak_visitors / config.planning_visit_seconds);
const campaign = Math.round(config.campaign_peak_visitors / config.planning_visit_seconds);
// 35 and 45 sit just under and just over the rates route's measured capacity
// (about 40/s), so the knee shows up clearly
const LEVELS = [Math.round(expected * 0.2), Math.round(expected * 0.5), expected, 35, 45, campaign];
const funnel = config.main_funnel;

export const options = {
  scenarios: {
    visitors: {
      executor: 'ramping-arrival-rate',
      exec: 'visit',
      startRate: 0,
      timeUnit: '1s', // targets are visits started per second
      // One virtual user per visit in progress. A healthy visit is about 4.6s,
      // so 57/s needs about 265; a slow one (rates waiting its full 3s) about
      // 7.5s, so about 430. The longest possible visit is about 18s.
      preAllocatedVUs: 500,
      maxVUs: 1500,
      stages: stagesFor(LEVELS),
    },
  },
  thresholds: thresholdsFor(['GET /', 'GET /api/rates', 'GET /signup', 'POST /api/signup']),
};

export function visit() {
  const home = request('GET', 'GET /', '/');
  if (home.left) return; // the homepage didn't load: the visitor leaves
  step('landed');

  // The homepage's script (home.js) fetches the rates straight after loading.
  // If it fails, the cards show a fallback and the visit carries on.
  request('GET', 'GET /api/rates', '/api/rates');
  think(); // reading the page

  if (Math.random() < funnel.go_to_signup) {
    signUp({ submitShare: funnel.submit_signup, reuseShare: funnel.reuse_seeded_email });
  }
  think(); // before leaving
}
