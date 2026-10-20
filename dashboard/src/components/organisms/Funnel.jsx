// findings.funnel: { steps: [{ step, name, count, share_of_previous, kind, why }],
// voluntary_drop_off, lost_signups: { expected, campaign } }
// The main path reads straight down; ways out of it (kind "exit") and degraded
// visits are indented under the step they came from. Each row has a bar against
// everyone who arrived, in the chart vocabulary: success shaded green for the
// main path, a solid block for exits, hatched for degraded.
const number = (n) => (n === null || n === undefined ? '–' : n.toLocaleString('en-GB'));
const share = (s) => (s === null || s === undefined ? '–' : `${Math.round(s * 100)}%`);

export default function Funnel({ funnel }) {
  if (!funnel) return null;
  // Everyone who arrived: the first step (the homepage, or the sign-up page
  // in the sign-up test)
  const arrived = funnel.steps[0]?.count || 1;
  const levels = Object.entries(funnel.lost_signups ?? {});

  return (
    <div className="funnel">
      <table className="funnel-table">
        <thead>
          <tr>
            <th>Step</th>
            <th className="funnel-bar-cell">
              <span className="visually-hidden">Share of everyone who arrived</span>
            </th>
            <th>Visitors</th>
            <th>Of previous step</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          {funnel.steps.map((s) => (
            <tr key={s.step} data-step={s.step} data-kind={s.kind ?? 'path'} data-empty={s.count === 0 || undefined}>
              <td className="funnel-name">{s.name}</td>
              <td className="funnel-bar-cell" aria-hidden="true">
                <span className="funnel-bar" style={{ width: `${Math.min(100, (s.count / arrived) * 100)}%` }} />
              </td>
              <td className="funnel-number">{number(s.count)}</td>
              <td className="funnel-number">{share(s.share_of_previous)}</td>
              <td className="funnel-why">{s.why ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="funnel-notes">
        {funnel.voluntary_drop_off ? <p>{funnel.voluntary_drop_off}</p> : null}
        {levels.map(([level, l]) => (
          <p key={level} data-level={level}>
            {l.label ? (
              <>
                <strong>{l.label}:</strong> {l.detail}
              </>
            ) : (
              l.summary
            )}
          </p>
        ))}
      </div>
    </div>
  );
}
