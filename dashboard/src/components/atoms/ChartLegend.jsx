// Chart legend: a row of small SVG marks with labels, so they look the same
// everywhere. Each mark's kind says what it means in the chart (LegendKind in
// src/data/types.js); the marks are drawn in legendSymbols.jsx.
import { useId } from 'react';
import { LEGEND_SYMBOLS } from './legendSymbols.jsx';

/**
 * The fallback hatching, shared by the legend and the bar chart: an SVG
 * <pattern> for a <defs>.
 * @param {{ id: string }} props  the pattern's id, for fill="url(#id)"
 */
export function HatchPattern({ id }) {
  return (
    <pattern id={id} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="4" height="4" fill="var(--color-chart-fallback-fill)" />
      <line x1="0" y1="0" x2="0" y2="4" stroke="var(--color-chart-fallback)" strokeWidth="1" />
    </pattern>
  );
}

/**
 * @param {object} props
 * @param {import('../../data/types.js').LegendItem[]} props.legend  one mark and label each
 * @param {string} [props.className]  added to its own; other attributes go to the list too
 */
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
            {LEGEND_SYMBOLS[item.kind]?.draw(`${patternId}-hatch`) ?? null}
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
