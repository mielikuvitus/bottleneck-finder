// One of finding.user_impact_now / user_impact_at_campaign / user_impact_at_limit:
// { level, visitors, stage_used, measured_visitors_at_once, left, degraded,
//   failures, lost_signups, slow_visit_share, summary }
export default function ImpactRow({ label, impact }) {
  if (!impact) return null;
  return (
    <tr className="impact-row">
      <th>{label}</th>
      <td>{impact.visitors ?? '–'}</td>
      <td>{impact.stage_used ?? '–'}</td>
      <td>{impact.left ?? '–'}</td>
      <td>{impact.degraded ?? '–'}</td>
      <td>{impact.lost_signups ? `${impact.lost_signups.lost} of ${impact.lost_signups.attempts}` : '–'}</td>
      <td>{impact.summary}</td>
    </tr>
  );
}

export function ImpactTableHead() {
  return (
    <thead>
      <tr>
        <th>Level</th>
        <th>Visitors at once</th>
        <th>Stage used</th>
        <th>Left</th>
        <th>Degraded</th>
        <th>Lost sign-ups</th>
        <th>In plain English</th>
      </tr>
    </thead>
  );
}
