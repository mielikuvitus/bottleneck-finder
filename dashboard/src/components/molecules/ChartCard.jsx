// One chart card: title, legend, the unit above the y axis, then the chart.
// Used by the evidence and the healthy routes. Screen readers hear the card as
// a group named by its title.
import { useId } from 'react';
import { ResponsiveContainer } from 'recharts';
import ChartLegend from '../atoms/ChartLegend.jsx';

/**
 * @param {object} props
 * @param {string} props.title  e.g. "Response time (p95)"
 * @param {string} [props.unit]  shown above the y axis, e.g. "ms"
 * @param {import('../../data/types.js').LegendItem[]} [props.legend]  left out, there's no legend
 * @param {import('react').ReactNode} props.children  a Recharts chart, starting with {chartBase(rows)} (chartBase.jsx)
 * @param {boolean} [props.empty]  true shows "No data for this chart" in its place: hasData(rows, keys) in src/data/series.js
 * @param {string} [props.className]  added to its own; other attributes go to the card too
 */
export default function ChartCard({ title, unit, legend = [], empty = false, className = '', children, ...rest }) {
  const titleId = useId();
  return (
    <div {...rest} className={`evidence-card ${className}`.trim()} role="group" aria-labelledby={titleId}>
      <p className="evidence-card-title" id={titleId}>
        {title}
      </p>
      {legend.length ? <ChartLegend legend={legend} /> : null}
      {unit ? <p className="evidence-card-unit">{unit}</p> : null}
      {empty ? (
        <p className="evidence-card-empty">No data for this chart</p>
      ) : (
        <div className="evidence-card-chart">
          <ResponsiveContainer>{children}</ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
