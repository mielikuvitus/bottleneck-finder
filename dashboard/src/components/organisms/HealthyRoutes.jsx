// Routes without a knee (findings.healthyRoutes): the shared "no knee up to"
// load once, then one row per route (route, what it powers, p95 at the
// highest load). A row opens that route's arrivals vs successful and p95 charts.
import { useId, useMemo, useState } from 'react';
import { Area, ComposedChart, Line, LineChart } from 'recharts';
import ChartCard, { grid, tooltip, xAxis, yAxis } from '../molecules/ChartCard.jsx';
import { SMOOTHED, chartRows, smoothRows } from '../../data/series.js';

const SMOOTH_SECONDS = 5; // success is drawn as a 5-second average, as in the evidence

function RouteCharts({ route, rows }) {
  const smoothSuccess = smoothRows(rows, [`${route}|ok`], SMOOTH_SECONDS);
  return (
    <div className="evidence-cards">
      <ChartCard
        title="Arrivals vs successful"
        unit={`${route} · requests/s · success: ${SMOOTH_SECONDS}s average`}
        legend={[
          { kind: 'line', label: 'Arrivals' },
          { kind: 'area', label: 'Success' },
        ]}
      >
        <ComposedChart data={smoothSuccess} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
          {grid}
          {xAxis(rows)}
          {yAxis}
          {tooltip}
          <Area
            type="linear"
            dataKey={`${route}|ok${SMOOTHED}`}
            name="Success"
            stroke="var(--color-chart-success)"
            strokeWidth={1.5}
            fill="var(--color-chart-success-fill)"
            fillOpacity={1}
            dot={false}
            isAnimationActive={false}
          />
          <Line dataKey={`${route}|rps`} name="Arrivals" stroke="var(--color-chart-arrivals)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ChartCard>

      <ChartCard title="Response time (p95)" unit="ms" legend={[{ kind: 'line', label: `${route} p95` }]}>
        <LineChart data={rows} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
          {grid}
          {xAxis(rows)}
          {yAxis}
          {tooltip}
          <Line dataKey={`${route}|p95`} name="p95" stroke="var(--color-chart-arrivals)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
        </LineChart>
      </ChartCard>
    </div>
  );
}

function RouteRow({ healthy, powers, rows }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className="healthy-route">
      <button type="button" className="healthy-route-toggle" aria-expanded={open} aria-controls={`${id}-charts`} onClick={() => setOpen(!open)}>
        <span className="healthy-route-name">{healthy.route}</span>
        {powers ? <span className="healthy-route-powers">{powers}</span> : null}
        {/* older findings.json files have only the whole sentence */}
        <span className="healthy-route-p95">
          {healthy.p95 ? <span className="healthy-route-p95-prefix">p95 </span> : null}
          {healthy.p95 ?? healthy.note}
        </span>
        <span className={`run-selector-chevron${open ? ' is-up' : ''}`} aria-hidden="true" />
      </button>
      {open && rows ? (
        <div className="healthy-route-charts" id={`${id}-charts`}>
          <RouteCharts route={healthy.route} rows={rows} />
        </div>
      ) : null}
    </li>
  );
}

export default function HealthyRoutes({ healthyRoutes, upTo, timeline, routeContext }) {
  const rows = useMemo(() => (timeline ? chartRows(timeline) : null), [timeline]);
  return (
    <div className="healthy-routes">
      <div className="healthy-routes-header">
        {upTo ? <p className="healthy-routes-intro">No knee up to {upTo}</p> : <span />}
        <p className="healthy-routes-column">p95 at the highest load</p>
      </div>
      <ul className="healthy-routes-list">
        {healthyRoutes.map((h) => (
          <RouteRow key={h.route} healthy={h} powers={routeContext?.[h.route]?.powers} rows={rows} />
        ))}
      </ul>
    </div>
  );
}
