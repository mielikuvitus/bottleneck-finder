// Chart legend (Figma: Legend & chart annotation vocabulary). Symbols are
// drawn as small SVGs so they look the same everywhere.
// items: [{ kind, label }], kind: "line" | "area" | "area-red" | "block" |
// "hatched" | "knee" | "capacity" | "campaign" | "dashed-red". "area" is
// success (a shaded area with a solid top edge); "area-red" the second series
// in the what-filled-up chart (e.g. requests waiting); "dashed-red" any
// further cause in it (several causes filling the server).
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
    case 'line':
      return <line x1="0" y1="5" x2="16" y2="5" stroke="var(--color-chart-arrivals)" strokeWidth="2" />;
    case 'area':
      return <AreaSymbol edge="var(--color-chart-success)" fill="var(--color-chart-success-fill)" />;
    case 'area-red':
      return <AreaSymbol edge="var(--color-chart-fallback)" fill="var(--color-chart-fallback-fill)" />;
    case 'dashed-red':
      return <line x1="0" y1="5" x2="16" y2="5" stroke="var(--color-chart-fallback)" strokeWidth="1.5" strokeDasharray="3 2" />;
    case 'block':
      return <rect x="3" y="0" width="10" height="10" fill="var(--color-chart-left)" />;
    case 'hatched':
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

export default function ChartLegend({ items }) {
  const patternId = useId().replace(/:/g, '');
  return (
    <ul className="chart-legend">
      {items.map((item) => (
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
