// findings.test ("main" | "signup") and findings.scenario ("campaign" | null)
const TEST_NAMES = { main: 'Main test', signup: 'Sign-up test' };

export default function ScenarioTag({ test, scenario }) {
  return (
    <span className="scenario-tag" data-test={test} data-scenario={scenario ?? 'normal'}>
      {TEST_NAMES[test] ?? test}
      {scenario ? ` · ${scenario} scenario` : ''}
    </span>
  );
}
