// The test's details: findings.json top level, in a disclosure that starts
// closed. Key numbers on the left, visitors at once per stage on the right,
// then screenshots of the test site and the assumptions behind a link.
import { useId, useState } from 'react';
import AssumptionsList from '../molecules/AssumptionsList.jsx';
import SiteScreenshots from '../molecules/SiteScreenshots.jsx';

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
const TEST_NAMES = { main: 'Main test', signup: 'Sign-up test' };

function SummaryNumber({ label, value, note }) {
  return (
    <div className="key-number">
      <p className="key-number-label">{label}</p>
      <p className="key-number-value">{value ?? '–'}</p>
      {note ? <p className="key-number-note">{note}</p> : null}
    </div>
  );
}

const round = (n) => (n === null || n === undefined ? '–' : Math.round(n));

export default function SummaryStrip({ run }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const { findings } = run;
  const counts = SEVERITIES.map((s) => [s, findings.findings.filter((f) => f.severity === s).length]).filter(([, n]) => n);
  const label = `${TEST_NAMES[findings.test] ?? findings.test} details${findings.scenario ? ` · ${findings.scenario} scenario` : ''}`;

  return (
    <section className="summary-strip-section disclosure">
      <button type="button" className="disclosure-toggle" aria-expanded={open} aria-controls={`${id}-content`} onClick={() => setOpen(!open)}>
        <span className="disclosure-label">
          {findings.superseded ? <span className="superseded-label">Superseded</span> : null}
          {label}
        </span>
        <span className={`run-selector-chevron${open ? ' is-up' : ''}`} aria-hidden="true" />
      </button>
      {open ? (
        <div className="summary-content" id={`${id}-content`}>
          {findings.superseded ? <p className="summary-superseded">{findings.superseded_reason}</p> : null}
          <div className="summary-columns">
            <div className="summary-numbers">
              <SummaryNumber label="Visit length" value={`${findings.visit.avgVisitSeconds} s`} note={findings.visit.source} />
              <SummaryNumber label="Requests per visit" value={findings.visit.totalRequestsPerVisit} />
              <SummaryNumber label="Expected peak" value={`${findings.peaks.expected.visitors} visitors at once`} note={`closest: ${findings.peaks.expected.closestLoad}`} />
              <SummaryNumber label="Campaign peak" value={`${findings.peaks.campaign.visitors} visitors at once`} note={`closest: ${findings.peaks.campaign.closestLoad}`} />
              <SummaryNumber label="Findings" value={counts.map(([s, n]) => `${n} ${s}`).join(', ') || 'none'} />
            </div>
            <div className="summary-stages">
              <p className="summary-stages-title">Visitors at once per stage</p>
              <table className="stage-table">
                <thead>
                  <tr>
                    <th>Stage</th>
                    <th>Planned</th>
                    <th>Measured</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.stages.map((s) => (
                    <tr key={s.index}>
                      <td>{s.label}</td>
                      <td>{round(s.visitorsAtOnce)}</td>
                      <td>{round(s.measuredVisitorsAtOnce)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {findings.normal_day_warning ? <p className="summary-note">Normal-day numbers: {findings.normal_day_warning}</p> : null}
          <SiteScreenshots test={findings.test} />
          <AssumptionsList config={run.config} routeContext={run.routeContext} findings={findings} />
        </div>
      ) : null}
    </section>
  );
}
