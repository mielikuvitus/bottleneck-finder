// Chart legend (Figma: Legend & chart annotation vocabulary). Symbols are
// drawn as small SVGs so they look the same everywhere.
// legend: [{ kind, label }]. kind is what the mark means in the chart:
// "main" (the chart's main series: a solid navy line), "success" (a shaded
// green area), "second" (the second series in what filled up, e.g. requests
// waiting: a shaded red area), "other-cause" (any further cause filling the
// server: a dashed red line), "left" (a solid block), "fallback" (a hatched
// block), "knee", "capacity" and "campaign".
import { useId } from 'react';

// A shaded area with a solid top edge
const AreaSymbol = ({ edge, fill }) => (
  <>
    <rect x="1" y="3" width="14" height="7" fill={fill} />
    <line x1="1" y1="3" x2="15" y2="3" stroke={edge} strokeWidth="1.5" />
  </>
);

function Symbol({ kind, patternId }) {
  switch (kind) {
    case 'main':
      return <line x1="0" y1="5" x2="16" y2="5" stroke="var(--color-chart-arrivals)" strokeWidth="2" />;
    case 'success':
      return <AreaSymbol edge="var(--color-chart-success)" fill="var(--color-chart-success-fill)" />;
    case 'second':
      return <AreaSymbol edge="var(--color-chart-fallback)" fill="var(--color-chart-fallback-fill)" />;
    case 'other-cause':
      return <line x1="0" y1="5" x2="16" y2="5" stroke="var(--color-chart-fallback)" strokeWidth="1.5" strokeDasharray="3 2" />;
    case 'left':
      return <rect x="3" y="0" width="10" height="10" fill="var(--color-chart-left)" />;
    case 'fallback':
      return <rect x="3.5" y="0.5" width="9" height="9" fill={`url(#${patternId})`} stroke="var(--color-chart-fallback)" strokeDasharray="1.5 1" />;
    case 'knee':
      return <circle cx="8" cy="5" r="4" fill="var(--color-surface)" stroke="var(--color-chart-annotation)" strokeWidth="1.5" />;
    case 'capacity':
      return <line x1="0" y1="5" x2="16" y2="5" stroke="var(--color-chart-annotation)" strokeWidth="1.5" strokeDasharray="2 2" />;
    case 'campaign':
      return <line x1="8" y1="0" x2="8" y2="10" stroke="var(--color-chart-annotation)" strokeWidth="1.5" />;
    default:
      return null;
  }
}

// The fallback hatching, shared by the legend and the bar chart
export function HatchPattern({ id }) {
  return (
    <pattern id={id} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="4" height="4" fill="var(--color-chart-fallback-fill)" />
      <line x1="0" y1="0" x2="0" y2="4" stroke="var(--color-chart-fallback)" strokeWidth="1" />
    </pattern>
  );
}

export default function ChartLegend({ legend, className = '', ...rest }) {
  const patternId = useId().replace(/:/g, '');
  return (
    <ul {...rest} className={`chart-legend ${className}`.trim()}>
      {legend.map((item) => (
        <li key={item.label} className="chart-legend-item">
          <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true">
            <defs>
              <HatchPattern id={`${patternId}-hatch`} />
            </defs>
            <Symbol kind={item.kind} patternId={`${patternId}-hatch`} />
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
