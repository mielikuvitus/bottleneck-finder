// How runs are named in the picker and the browser tab
const TITLES = { main: 'Main test', signup: 'Sign-up campaign test' };
export const titleOf = (run) => TITLES[run.test] ?? run.name;
// What each test exercises
export const DESCRIPTIONS = {
  main: 'Testing / → /signup funnel',
  signup: 'Testing /signup with assumed campaign traffic',
};

// The browser tab title (and its hover tooltip): the most specific part first,
// so it stays readable when the tab is narrow
const APP = 'Traffic readiness';
export function pageTitle(run, loading) {
  if (loading) return `Loading… · ${APP}`;
  if (!run) return `${APP} · Bottleneck finder`;
  // "19 Oct 2026 · 00:01 BST" → "19 Oct 00:01"
  const date = run.date_label?.replace(/ \d{4} ·/, '').replace(/ [A-Z]{3,4}$/, '');
  return [`${titleOf(run)}${run.superseded ? ' (superseded)' : ''}`, date, APP].filter(Boolean).join(' · ');
}
