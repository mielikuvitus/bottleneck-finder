// A bordered box with an uppercase toggle and a chevron, closed by default.
// Used by the test details, the AI analysis and the evidence.
// label: the toggle's text (can include other elements). className and
// contentClassName: the box's and the content's own classes. keepMounted keeps
// the content in the page while closed, so its state survives (the AI reply
// doesn't type out again); otherwise it's only rendered while open.
import { useId, useState } from 'react';

export default function Disclosure({ label, className = '', contentClassName = '', defaultOpen = false, keepMounted = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = `${useId()}-content`;
  const rendered = open || keepMounted;
  return (
    <section className={`disclosure ${className}`.trim()}>
      <button type="button" className="disclosure-toggle" aria-expanded={open} aria-controls={rendered ? id : undefined} onClick={() => setOpen(!open)}>
        <span className="disclosure-label">{label}</span>
        <span className={`run-selector-chevron${open ? ' is-up' : ''}`} aria-hidden="true" />
      </button>
      {rendered ? (
        <div className={contentClassName} id={id} hidden={!open}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
