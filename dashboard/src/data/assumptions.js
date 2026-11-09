// What the assumptions list shows for a run: the traffic numbers
// (test-config.json), the viewed test's visitor behaviour group, and the
// routes this run reports on (its findings plus its healthy routes).

// The test-config.json group each test reads
const TEST_GROUPS = { main: 'main_funnel', signup: 'signup_test' };

// run: as loaded by loadRun(). routes is null when the run has no
// route-context.json.
export function assumptionsFor(run) {
  const { findings, config, routeContext } = run;
  const used = new Set([...findings.findings.map((f) => f.route), ...(findings.healthyRoutes ?? []).map((h) => h.route)]);
  return {
    config,
    behaviour: config?.[TEST_GROUPS[findings.test]] ?? null,
    routes: routeContext ? Object.entries(routeContext).filter(([route]) => used.has(route)) : null,
  };
}
