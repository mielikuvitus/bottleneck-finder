// One chart card (title, legend, the unit above the y axis, then the chart),
// plus the axis, grid and tooltip every chart shares. Used by the evidence
// and the healthy routes.
import { CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartLegend from '../atoms/ChartLegend.jsx';
import { SMOOTHED } from '../../data/series.js';

const axisTick = { fontSize: 11, fontFamily: 'var(--font-family-mono)', fill: 'var(--color-text-muted)' };
export const xAxis = (rows) => (
  <XAxis
    dataKey="second"
    type="number"
    domain={[rows[0]?.second ?? 0, rows[rows.length - 1]?.second ?? 0]}
    tick={axisTick}
    tickLine={false}
    axisLine={{ stroke: 'var(--color-border)' }}
    tickFormatter={(s) => `${s}s`}
    minTickGap={32}
  />
);
export const yAxis = <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} />;
// Hovering shows the real value for that second, also on smoothed lines
const realValue = (value, name, item) => [item.dataKey.endsWith(SMOOTHED) ? item.payload[item.dataKey.slice(0, -SMOOTHED.length)] : value, name];
export const tooltip = <Tooltip formatter={realValue} labelFormatter={(s) => `${s}s`} />;
export const grid = <CartesianGrid stroke="var(--color-border)" vertical={false} />;

export default function ChartCard({ title, unit, legend, children }) {
  return (
    <div className="evidence-card">
      <p className="evidence-card-title">{title}</p>
      <ChartLegend items={legend} />
      {unit ? <p className="evidence-card-unit">{unit}</p> : null}
      <div className="evidence-card-chart">
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
