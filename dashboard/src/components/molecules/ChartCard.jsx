// One chart card: title, legend, the unit above the y axis, then the chart.
// Used by the evidence and the healthy routes.
import { ResponsiveContainer } from 'recharts';
import ChartLegend from '../atoms/ChartLegend.jsx';

/**
 * @param {object} props
 * @param {string} props.title  e.g. "Response time (p95)"
 * @param {string} [props.unit]  shown above the y axis, e.g. "ms"
 * @param {import('../../data/types.js').LegendItem[]} [props.legend]  left out, there's no legend
 * @param {import('react').ReactNode} props.children  a Recharts chart, starting with {chartBase(rows)} (chartBase.jsx)
 * @param {string} [props.className]  added to its own; other attributes go to the card too
 */
export default function ChartCard({ title, unit, legend = [], className = '', children, ...rest }) {
  return (
    <div {...rest} className={`evidence-card ${className}`.trim()}>
      <p className="evidence-card-title">{title}</p>
      {legend.length ? <ChartLegend legend={legend} /> : null}
      {unit ? <p className="evidence-card-unit">{unit}</p> : null}
      <div className="evidence-card-chart">
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
