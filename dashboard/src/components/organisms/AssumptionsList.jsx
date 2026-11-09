// The test's assumptions, behind a "Show assumptions" link at the bottom of
// the test details. Condensed: the traffic numbers as a grid, the visitor
// behaviour on one line, and one row per route. Labels come from _labels in
// test-config.json; the long _ notes stay in the file.
// config: test-config.json. behaviour: the viewed test's group in it.
// routes: [[route, route-context.json entry]] for the routes this run reports
// on. assumptionsFor(run) in src/data/assumptions.js gives all three.
import { useId, useState } from 'react';

const ON_FAILURE = { left: 'leaves', degraded: 'carries on degraded' };

// expected_peak_visitors → Expected peak visitors (when a run has no _labels)
const fromKey = (key) => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
const share = (value) => `${Math.round(value * 100)}%`;

// The labelled values of one config object: [key, { label, unit }, value]
function labelled(object) {
  const labels =
    object._labels ??
    Object.fromEntries(
      Object.entries(object)
        .filter(([key, value]) => !key.startsWith('_') && (typeof value === 'number' || value === null))
        .map(([key]) => [key, { label: fromKey(key) }])
    );
  return Object.entries(labels)
    .filter(([key]) => !key.startsWith('_') && key in object)
    .map(([key, l]) => [key, l, object[key]]);
}

function TrafficGrid({ config }) {
  return (
    <dl className="assumptions-grid">
      {labelled(config).map(([key, { label, unit }, value]) => (
        <div key={key} className="assumptions-item">
          <dt>{label}</dt>
          <dd>
            {value === null ? (
              'measured from the run'
            ) : (
              <>
                <span className="assumptions-number">{value.toLocaleString('en-GB')}</span>
                {unit ? ` ${unit}` : ''}
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Behaviour({ group }) {
  const items = labelled(group).filter(([, , value]) => typeof value === 'number');
  if (!items.length) return null;
  return (
    <div className="assumptions-group">
      <p className="assumptions-heading">Visitor behaviour</p>
      <p className="assumptions-behaviour">
        {items.map(([key, { label }, value], i) => (
          <span key={key}>
            {i ? ' · ' : ''}
            <span className="assumptions-number">{share(value)}</span> {label}
          </span>
        ))}
      </p>
    </div>
  );
}

function RouteTable({ routes }) {
  return (
    <div className="assumptions-group">
      <p className="assumptions-heading">Routes</p>
      <table className="assumptions-routes">
        <thead>
          <tr>
            <th>Route</th>
            <th>Powers</th>
            <th>Site timeout</th>
            <th>If it fails, the visitor</th>
            <th>Critical</th>
          </tr>
        </thead>
        <tbody>
          {routes.map(([route, r]) => (
            <tr key={route}>
              <td className="assumptions-route">{route}</td>
              <td>{r.powers}</td>
              <td>{r.timeout_ms ? <span className="assumptions-number">{r.timeout_ms / 1000} s</span> : 'none'}</td>
              <td>{ON_FAILURE[r.on_failure] ?? r.on_failure}</td>
              <td>{r.critical ? 'Yes' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AssumptionsList({ config, behaviour, routes }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!config && !routes) return null;

  return (
    <div className="assumptions-list">
      <button type="button" className="text-link" aria-expanded={open} aria-controls={open ? `${id}-list` : undefined} onClick={() => setOpen(!open)}>
        {open ? 'Hide assumptions' : 'Show assumptions'}
      </button>
      {open ? (
        <div className="assumptions-content" id={`${id}-list`}>
          {config ? <TrafficGrid config={config} /> : null}
          {behaviour ? <Behaviour group={behaviour} /> : null}
          {routes?.length ? <RouteTable routes={routes} /> : null}
          {/* Where a developer changes these (the files also explain each value) */}
          <p className="assumptions-source">
            Traffic and visitor behaviour are set in <code>load-tests/test-config.json</code>, routes in{' '}
            <code>analyzer/route-context.json</code>. Each value is explained there.
          </p>
        </div>
      ) : null}
    </div>
  );
}
