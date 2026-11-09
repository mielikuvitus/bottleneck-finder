// What every chart card's chart starts with: the grid, the time axis, the value
// axis and the tooltip, in that order. Put {chartBase(rows)} first inside the
// Recharts chart.
// Kept apart from ChartCard.jsx, as a file that exports a component should
// export only components.
import { CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { tooltipValue } from '../../data/series.js';

const axisTick = { fontSize: 11, fontFamily: 'var(--font-family-mono)', fill: 'var(--color-text-muted)' };

/**
 * @param {{ second: number }[]} rows  the chart's data; the time axis spans its seconds
 * @returns {import('react').ReactElement[]}
 */
export const chartBase = (rows) => [
  <CartesianGrid key="grid" stroke="var(--color-border)" vertical={false} />,
  <XAxis
    key="x"
    dataKey="second"
    type="number"
    domain={[rows[0]?.second ?? 0, rows[rows.length - 1]?.second ?? 0]}
    tick={axisTick}
    tickLine={false}
    axisLine={{ stroke: 'var(--color-border)' }}
    tickFormatter={(s) => `${s}s`}
    minTickGap={32}
  />,
  <YAxis key="y" tick={axisTick} tickLine={false} axisLine={false} width={36} />,
  <Tooltip key="tooltip" formatter={tooltipValue} labelFormatter={(s) => `${s}s`} />,
];
