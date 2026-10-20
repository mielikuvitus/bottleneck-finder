// One finding (Figma: Expanded verdict). Important things first: severity and
// confidence, what visitors experienced, how much traffic it carries, the
// decision and fix next to what visitors see, then the evidence.
import SeverityBadge from '../atoms/SeverityBadge.jsx';
import ConfidenceIndicator from '../atoms/ConfidenceIndicator.jsx';
import KeyNumbers from '../molecules/KeyNumbers.jsx';
import CanWaitCallout from '../molecules/CanWaitCallout.jsx';
import CustomerView from '../molecules/CustomerView.jsx';
import EvidenceDisclosure from './EvidenceDisclosure.jsx';

// Which can-it-wait look each severity gets
export const WAIT_VARIANT = { critical: 'now', high: 'soon', medium: 'caution', low: 'safe', info: 'safe' };

// onCollapse (from FindingCard) adds Read less at the bottom, back to the short card
export default function VerdictCard({ finding, timeline, routeContext, peaks, onCollapse }) {
  const powers = routeContext?.[finding.route]?.powers ?? finding.route;
  const shownOn = finding.customer_view?.shown_on;
  return (
    <article className="verdict-card" data-severity={finding.severity}>
      <header className="verdict-heading">
        <div className="verdict-meta">
          <SeverityBadge severity={finding.severity} />
          <ConfidenceIndicator level={finding.confidence} />
        </div>
        <h3 className="verdict-headline">{finding.headline ?? finding.title}</h3>
        <p className="verdict-subline">
          {powers}
          {shownOn ? ` · ${shownOn}` : ''}
        </p>
      </header>

      {finding.load_levels ? (
        <div className="verdict-numbers">
          <KeyNumbers loadLevels={finding.load_levels} />
        </div>
      ) : null}

      <div className="verdict-body">
        <div className="verdict-decision">
          <CanWaitCallout variant={WAIT_VARIANT[finding.severity] ?? 'safe'} title={finding.can_wait_title} text={finding.can_wait} size="large" />
          <div className="verdict-fix">
            <h4 className="verdict-fix-title">Suggested fix</h4>
            {/* Several causes: a list per cause, under its name and share. Else
                several fixes as bullet points; one (or an older run) as a sentence */}
            {finding.suggested_fix_groups ? (
              finding.suggested_fix_groups.map((group) => (
                <div key={group.cause} className="verdict-fix-group">
                  <p className="verdict-fix-cause">
                    {group.cause} <span className="verdict-fix-share">{Math.round(group.share * 100)}% of the server's time</span>
                  </p>
                  <ul className="verdict-fix-list">
                    {group.fixes.map((fix) => (
                      <li key={fix}>{fix}</li>
                    ))}
                  </ul>
                </div>
              ))
            ) : finding.suggested_fixes?.length > 1 ? (
              <ul className="verdict-fix-list">
                {finding.suggested_fixes.map((fix) => (
                  <li key={fix}>{fix}</li>
                ))}
              </ul>
            ) : (
              <p className="verdict-fix-text">{finding.suggested_fixes?.[0] ?? finding.suggested_fix}</p>
            )}
          </div>
        </div>
        <CustomerView customerView={finding.customer_view} />
      </div>

      <EvidenceDisclosure finding={finding} timeline={timeline} peaks={peaks} />

      {onCollapse ? (
        <button type="button" className="verdict-collapse" aria-expanded={true} onClick={onCollapse}>
          Read less<span className="visually-hidden">: back to the short finding</span>
        </button>
      ) : null}
    </article>
  );
}
