// Shown in place of the finding cards when a run found nothing
// (findings.all_clear): the analyser's title and summary, when and on which
// code the run was made, and a reminder to keep re-running the tests
import SeverityBadge from '../atoms/SeverityBadge.jsx';

export default function AllClearCard({ allClear, dateLabel, commit }) {
  const when = [dateLabel ? `As of ${dateLabel}` : null, commit ? `commit ${commit}` : null].filter(Boolean).join(' · ');
  return (
    <article className="verdict-card all-clear">
      <header className="verdict-heading">
        <div className="verdict-meta">
          <SeverityBadge severity="info" />
        </div>
        {/* The title, with when the run was made on the right */}
        <div className="all-clear-title-row">
          <h3 className="verdict-headline">{allClear.title}</h3>
          {when ? <p className="verdict-subline">{when}</p> : null}
        </div>
        <p className="all-clear-summary">{allClear.summary}</p>
      </header>
      <p className="all-clear-note">{allClear.keep_fresh}</p>
    </article>
  );
}
