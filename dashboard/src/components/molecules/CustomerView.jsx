// What a visitor sees (Figma: Customer view panel): a browser-style frame
// with the page address, a tab per state that has a screenshot, and a caption.
// customerView: finding.customer_view { route, shown_on, caption, state }.
// The screenshot opens large (ScreenshotModal), like the test site's.
import { useId, useState } from 'react';
import ScreenshotModal from './ScreenshotModal.jsx';
import { statesFor } from '../../data/screenshots.js';
import { imageUrl } from '../../data/api.js';

export default function CustomerView({ customerView }) {
  const states = statesFor(customerView?.route);
  const initial = states.find((s) => s.key === customerView?.state) ?? states[0];
  const [current, setCurrent] = useState(initial?.key);
  const [enlarged, setEnlarged] = useState(false);
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
        <div className="browser-bar">tomorrow {customerView.shown_on ?? ''}</div>
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
          <button type="button" className="browser-page-enlarge" onClick={() => setEnlarged(true)}>
            <img src={imageUrl(shown.file)} alt={shown.caption} />
            <span className="visually-hidden">: open larger</span>
          </button>
        </div>
      </div>
      <figcaption className="customer-view-label">
        <span className="customer-view-title">Customer view</span>
        <span className="customer-view-caption">{customerView.caption}</span>
      </figcaption>
      {enlarged ? <ScreenshotModal file={shown.file} caption={shown.caption} onClose={() => setEnlarged(false)} /> : null}
    </figure>
  );
}
