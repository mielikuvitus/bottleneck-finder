// One finding, short or full (Figma: Supporting finding, Expanded verdict).
// Every finding starts short (critical and high ones with a red border), and
// "→ Read more" opens the full verdict card in place.
import { useRef, useState } from 'react';
import SeverityBadge from '../atoms/SeverityBadge.jsx';
import ConfidenceIndicator from '../atoms/ConfidenceIndicator.jsx';
import CanWaitCallout from '../molecules/CanWaitCallout.jsx';
import VerdictCard, { WAIT_VARIANT } from './VerdictCard.jsx';

// defaultExpanded: true to start full
export default function FindingCard({ finding, timeline, routeContext, peaks, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const fullRef = useRef(null);
  const shortRef = useRef(null);

  if (expanded) {
    return (
      <div className="finding-full" ref={fullRef} tabIndex={-1}>
        <VerdictCard
          finding={finding}
          timeline={timeline}
          routeContext={routeContext}
          peaks={peaks}
          onCollapse={() => {
            setExpanded(false);
            // Back to the Read more line; focus() also scrolls it into view if needed
            requestAnimationFrame(() => shortRef.current?.focus());
          }}
        />
      </div>
    );
  }

  const powers = routeContext?.[finding.route]?.powers ?? finding.route;
  const subline = [powers, finding.customer_view?.shown_on, finding.evidence_summary].filter(Boolean).join(' · ');
  return (
    <article className="finding-card" data-severity={finding.severity}>
      <div className="verdict-meta">
        <SeverityBadge severity={finding.severity} />
        <ConfidenceIndicator level={finding.confidence} />
      </div>
      <h3 className="finding-card-headline">{finding.headline ?? finding.title}</h3>
      <p className="finding-card-subline">{subline}</p>
      <button
        type="button"
        ref={shortRef}
        className="finding-card-expand"
        aria-expanded={false}
        onClick={() => {
          setExpanded(true);
          // Keep keyboard focus on the card that just opened
          requestAnimationFrame(() => fullRef.current?.focus());
        }}
      >
        <CanWaitCallout variant={WAIT_VARIANT[finding.severity] ?? 'safe'} title={finding.can_wait_title} size="inline">
          <span className="finding-card-more">
            <span aria-hidden="true">→ </span>
            Read more
            <span className="visually-hidden">: the full finding</span>
          </span>
        </CanWaitCallout>
      </button>
    </article>
  );
}
