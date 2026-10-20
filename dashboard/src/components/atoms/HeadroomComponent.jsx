// finding.headroom: { break_point_visitors, expected_pct, campaign_pct, summary }
// Percentages are (break point - peak) / peak: below 0 means over the limit.
const word = (pct) => (pct === null || pct === undefined ? 'unknown' : pct >= 0 ? `${pct}% to spare` : `${-pct}% over the limit`);

export default function HeadroomComponent({ headroom }) {
  if (!headroom) return <p className="headroom muted">No break point reached, so no headroom to show.</p>;
  return (
    <div className="headroom">
      <dl>
        <dt>Break point</dt>
        <dd>about {headroom.break_point_visitors} visitors at once</dd>
        <dt>At expected peak</dt>
        <dd data-pct={headroom.expected_pct}>{word(headroom.expected_pct)}</dd>
        <dt>At campaign peak</dt>
        <dd data-pct={headroom.campaign_pct}>{word(headroom.campaign_pct)}</dd>
      </dl>
      <p className="muted">{headroom.summary}</p>
    </div>
  );
}
