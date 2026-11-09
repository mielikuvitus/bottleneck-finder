// What a visitor sees: a browser-style frame with the page address, a tab per
// state that has a screenshot, and a caption. The screenshot opens large
// (ScreenshotButton), like the test site's.
// states: [{ key, label, src, caption }], from statesFor() in
// src/data/screenshots.js. initialState: the tab it opens on. address: the page
// address in the bar. caption: under the frame. No states, and nothing shows.
import { useId, useState } from 'react';
import ScreenshotButton from './ScreenshotButton.jsx';

export default function CustomerView({ states = [], initialState, address, caption }) {
  const initial = states.find((s) => s.key === initialState) ?? states[0];
  const [current, setCurrent] = useState(initial?.key);
  const id = useId();
  if (!states.length) return null;
  const shown = states.find((s) => s.key === current) ?? states[0];

  function onKey(e) {
    const i = states.findIndex((s) => s.key === shown.key);
    const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? states.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const s = states[(next + states.length) % states.length];
    setCurrent(s.key);
    document.getElementById(`${id}-tab-${s.key}`)?.focus();
  }

  return (
    <figure className="customer-view">
      <div className="browser-frame">
        <div className="browser-bar">tomorrow {address ?? ''}</div>
        <div className="browser-tabs" role="tablist" aria-label="What visitors see" onKeyDown={onKey}>
          {states.map((s) => (
            <button
              key={s.key}
              id={`${id}-tab-${s.key}`}
              type="button"
              role="tab"
              aria-selected={s.key === shown.key}
              aria-controls={`${id}-panel`}
              tabIndex={s.key === shown.key ? 0 : -1}
              className={`browser-tab${s.key === shown.key ? ' is-active' : ''}`}
              data-state={s.key}
              onClick={() => setCurrent(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="browser-page" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${shown.key}`}>
          <ScreenshotButton src={shown.src} caption={shown.caption} className="browser-page-enlarge" />
        </div>
      </div>
      <figcaption className="customer-view-label">
        <span className="customer-view-title">Customer view</span>
        <span className="customer-view-caption">{caption}</span>
      </figcaption>
    </figure>
  );
}
