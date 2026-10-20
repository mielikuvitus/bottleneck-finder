// What a visitor sees for each route, by state. File paths are relative to
// public/data/images (copied from docs/images by npm run data). The sign-up
// form ones are cropped (fallbacks/cropped/) to the email field and the
// message under it. A state with
// no screenshot yet is simply left out, and its tab isn't shown.
export const SCREENSHOTS = {
  'GET /': {
    normal: { file: 'tomorrow1.png', caption: 'The homepage' },
  },
  'GET /api/rates': {
    normal: { file: 'fallbacks/0-rates-normal.png', caption: 'Rate cards loaded' },
    slow: { file: 'fallbacks/1-rates-loading.png', caption: 'Rate cards while rates is slow: "Loading…"' },
    fallback: { file: 'fallbacks/2-rates-fallback.png', caption: 'After 3s: "Couldn\'t load rates right now."' },
  },
  'GET /signup': {
    normal: { file: 'tomorrow2.png', caption: 'The sign-up page' },
    fallback: { file: 'fallbacks/6-signup-page-unreachable.png', caption: 'The sign-up page refused: the browser\'s own error page' },
  },
  'POST /api/signup': {
    slow: { file: 'fallbacks/cropped/3-signup-waiting.png', caption: 'The form submitted, button greyed out while waiting' },
    fallback: { file: 'fallbacks/cropped/4-signup-timed-out.png', caption: 'After 3s: "We couldn\'t confirm your sign-up…"' },
  },
};

export const STATES = [
  { key: 'normal', label: 'Normal' },
  { key: 'slow', label: 'Slow / Loading' },
  { key: 'fallback', label: 'Fallback' },
];

// The states that have a screenshot for a route, in tab order
export const statesFor = (route) => STATES.filter((s) => SCREENSHOTS[route]?.[s.key]).map((s) => ({ ...s, ...SCREENSHOTS[route][s.key] }));
