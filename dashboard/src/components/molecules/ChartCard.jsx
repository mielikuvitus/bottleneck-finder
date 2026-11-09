// One chart card: title, legend, the unit above the y axis, then the chart
// (children: a Recharts chart starting with {chartBase(rows)}, from
// chartBase.jsx). Used by the evidence and the healthy routes.
import { ResponsiveContainer } from 'recharts';
import ChartLegend from '../atoms/ChartLegend.jsx';

// legend: ChartLegend items; left out, there's no legend
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
