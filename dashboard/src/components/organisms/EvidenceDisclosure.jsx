// The proof behind a finding (Figma: Evidence disclosure): why it has its
// confidence, one summary sentence, four chart cards (plus server cards when
// the cause is the server itself or unknown), then the full evidence. Closed
// by default. Charts use the chart vocabulary (Figma: Legend & chart
// annotation vocabulary): arrivals solid navy, success a shaded green area (so
// the two differ by shape, not only colour, and the gap between them is the
// traffic that wasn't served), left solid blocks, fallback hatched blocks, and
// knee / capacity / campaign marks.
import { useId, useState } from 'react';
import { Area, Bar, BarChart, ComposedChart, Line, LineChart, ReferenceDot, ReferenceLine } from 'recharts';
import { HatchPattern } from '../atoms/ChartLegend.jsx';
import ChartCard, { grid, tooltip, xAxis, yAxis } from '../molecules/ChartCard.jsx';
import { SMOOTHED, bucketRows, chartRows, secondWhenTargetReaches, serverSeries, smoothRows } from '../../data/series.js';

const BAR_SECONDS = 10; // one bar per 10 seconds
const SMOOTH_SECONDS = 5; // jumpy series are drawn as a 5-second average

// A pool's chart: slots in use, and requests waiting (drawn smoothed)
const poolChart = (pool, title) => ({ key: pool, title, unit: 'requests', lines: [[`pool:${pool}|inFlight`, 'In use'], [`pool:${pool}|queued`, 'Waiting']] });

// Extra server cards, only where they explain the finding: CPU and event loop
// wait when the server itself was busy (a render, a query or untimed work),
// and those plus every pool when nothing measured was full, to show that
// nothing filled up. A pool cause gets none: the server was idle, so flat
// lines there would mislead.
const SERVER_CHARTS = [
  { key: 'cpuPercent', title: 'Server CPU', unit: '% of one core · 100% = one core fully busy', label: 'CPU' },
  { key: 'delayMs', title: 'Wait for the event loop', unit: 'ms', label: 'Delay' },
];
const showsServerCharts = (cause) => ['render', 'db', 'loop', 'unexplained'].includes(cause.kind);

export default function EvidenceDisclosure({ finding, timeline, peaks }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const hatchId = `${id.replace(/:/g, '')}-hatch`;

  const rows = timeline ? chartRows(timeline) : [];
  const route = finding.route;
  const cause = finding.cause ?? {};
  const capacity = finding.capacity?.requests_per_second ?? null;
  // The knee mark goes where the lines split: the first second the arrivals go
  // above capacity, while both lines are still together
  const kneeSecond = finding.knee_at && capacity ? rows.find((r) => r.target > capacity)?.second ?? null : null;
  // The campaign peak can sit just above the highest tested level, so the
  // marker goes where the run reaches the closest tested stage
  const campaignStage = peaks?.campaign ? timeline?.stages.find((s) => s.index === peaks.campaign.closestStage) : null;
  const campaignSecond = campaignStage ? secondWhenTargetReaches(rows, campaignStage.target) : null;
  const bars = bucketRows(rows, BAR_SECONDS, ['left', 'degraded']);
  const smoothSuccess = smoothRows(rows, [`${route}|ok`], SMOOTH_SECONDS);

  // A cause's plain name from the analyser ("the rates CMS" → "Rates CMS"),
  // or its code name
  const plainName = (c) => (c.label ? c.label.replace(/^the /, '').replace(/^./, (ch) => ch.toUpperCase()) : c.name);
  const causeName = plainName(cause);
  const filled =
    cause.kind === 'pool'
      ? poolChart(cause.name, `${causeName} slots`)
      : {
          key: 'busy',
          title: 'Server busy',
          unit: 'share of each second (0-1)',
          // One line per cause filling the event loop (or just the one)
          lines: [
            ['loopUtil', 'Event loop'],
            ...(cause.contributors
              ? cause.contributors.map((c) => [`${c.kind}:${c.name}|share`, plainName(c)])
              : cause.kind === 'render' || cause.kind === 'db'
                ? [[`${cause.kind}:${cause.name}|share`, causeName]]
                : []),
          ],
        };
  // Server cards only when the run has server samples
  const hasServer = rows.some((r) => r.cpuPercent != null);
  const serverCharts = hasServer && showsServerCharts(cause) ? SERVER_CHARTS : [];
  const poolCharts = hasServer && cause.kind === 'unexplained' ? serverSeries(timeline).pools.map((p) => poolChart(p, `Pool "${p}" slots`)) : [];
  // "What filled up" charts: their second series is drawn smoothed
  const filledCharts = [filled, ...poolCharts];
  const smoothFilled = smoothRows(rows, filledCharts.flatMap((c) => c.lines.slice(1).map(([key]) => key)), SMOOTH_SECONDS);

  return (
    <section className="disclosure evidence-disclosure">
      <button type="button" className="disclosure-toggle" aria-expanded={open} aria-controls={`${id}-content`} onClick={() => setOpen(!open)}>
        <span className="disclosure-label">Evidence</span>
        <span className={`run-selector-chevron${open ? ' is-up' : ''}`} aria-hidden="true" />
      </button>
      {open ? (
        <div className="evidence-content" id={`${id}-content`}>
          {finding.confidence_reason ? (
            <p className="evidence-confidence">
              <strong>Why {finding.confidence} confidence?</strong> {finding.confidence_reason}
            </p>
          ) : null}
          {finding.evidence_summary ? <p className="evidence-summary">{finding.evidence_summary}</p> : null}

          {timeline ? (
            <div className="evidence-cards">
              <ChartCard
                title="Arrivals vs successful"
                unit={`${timeline.loadUnit} · requests/s · success: ${SMOOTH_SECONDS}s average`}
                legend={[
                  { kind: 'line', label: 'Arrivals' },
                  { kind: 'area', label: 'Success' },
                  ...(kneeSecond !== null ? [{ kind: 'knee', label: `Knee · ${finding.knee_at.load}` }] : []),
                  ...(capacity ? [{ kind: 'capacity', label: `Capacity · ${capacity} req/s` }] : []),
                  ...(campaignSecond !== null ? [{ kind: 'campaign', label: `Campaign · ${peaks.campaign.visitsPerSecond} visits/s` }] : []),
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
                  {capacity ? <ReferenceLine y={capacity} stroke="var(--color-chart-annotation)" strokeDasharray="3 3" ifOverflow="extendDomain" /> : null}
                  {campaignSecond !== null ? <ReferenceLine x={campaignSecond} stroke="var(--color-chart-annotation)" strokeWidth={1.5} /> : null}
                  <Line dataKey="target" name="Arrivals" stroke="var(--color-chart-arrivals)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  {kneeSecond !== null ? (
                    <ReferenceDot x={kneeSecond} y={capacity} r={7} fill="var(--color-surface)" stroke="var(--color-chart-annotation)" strokeWidth={2} />
                  ) : null}
                </ComposedChart>
              </ChartCard>

              <ChartCard
                title="Visitors who left or saw a fallback"
                unit={`visitors/s · one bar per ${BAR_SECONDS}s`}
                legend={[
                  { kind: 'block', label: 'Left' },
                  { kind: 'hatched', label: 'Fallback' },
                ]}
              >
                <BarChart data={bars} margin={{ top: 6, right: 6, bottom: 0, left: 0 }} barCategoryGap={1}>
                  <defs>
                    <HatchPattern id={hatchId} />
                  </defs>
                  {grid}
                  {xAxis(bars)}
                  {yAxis}
                  {tooltip}
                  <Bar dataKey="left" name="Left" stackId="out" fill="var(--color-chart-left)" isAnimationActive={false} />
                  <Bar
                    dataKey="degraded"
                    name="Fallback"
                    stackId="out"
                    fill={`url(#${hatchId})`}
                    stroke="var(--color-chart-fallback)"
                    strokeDasharray="1.5 1"
                    isAnimationActive={false}
                  />
                </BarChart>
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

              {filledCharts.map((filled) => (
                <ChartCard
                  key={filled.key}
                  title={filled.title}
                  unit={filled.lines[1] ? `${filled.unit} · ${filled.lines[1][1]}: ${SMOOTH_SECONDS}s average` : filled.unit}
                  legend={filled.lines.map(([, label], i) => ({ kind: i === 0 ? 'line' : i === 1 ? 'area-red' : 'dashed-red', label }))}
                >
                  <ComposedChart data={smoothFilled} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
                    {grid}
                    {xAxis(rows)}
                    {yAxis}
                    {tooltip}
                    {/* The second series as a shaded area, behind the main line;
                        any further cause as a dashed red line */}
                    {filled.lines.slice(1).map(([key, label], i) => (
                      <Area
                        key={key}
                        type="linear"
                        dataKey={key + SMOOTHED}
                        name={label}
                        stroke="var(--color-chart-fallback)"
                        strokeWidth={1.5}
                        strokeDasharray={i ? '3 2' : undefined}
                        fill={i ? 'none' : 'var(--color-chart-fallback-fill)'}
                        fillOpacity={1}
                        dot={false}
                        connectNulls
                        isAnimationActive={false}
                      />
                    ))}
                    <Line
                      dataKey={filled.lines[0][0]}
                      name={filled.lines[0][1]}
                      stroke="var(--color-chart-arrivals)"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ChartCard>
              ))}

              {serverCharts.map((c) => (
                <ChartCard key={c.key} title={c.title} unit={c.unit} legend={[{ kind: 'line', label: c.label }]}>
                  <LineChart data={rows} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
                    {grid}
                    {xAxis(rows)}
                    {yAxis}
                    {tooltip}
                    <Line dataKey={c.key} name={c.label} stroke="var(--color-chart-arrivals)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                  </LineChart>
                </ChartCard>
              ))}
            </div>
          ) : null}

          <ul className="evidence-list">
            <li className="evidence-cause">{finding.title}</li>
            {finding.evidence.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
