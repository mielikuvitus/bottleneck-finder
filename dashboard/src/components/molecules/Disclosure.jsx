// A bordered box with an uppercase toggle and a chevron, closed by default.
// Used by the test details, the AI analysis and the evidence.
import { useId, useState } from 'react';

/**
 * @param {object} props
 * @param {import('react').ReactNode} props.label  the toggle's text; can include other elements
 * @param {string} [props.className]  the box's own class
 * @param {string} [props.contentClassName]  the content's class
 * @param {boolean} [props.defaultOpen]  true to start open
 * @param {boolean} [props.keepMounted]  true keeps the content in the page while closed, so its state survives (the AI reply doesn't type out again); otherwise it's only rendered while open
 * @param {import('react').ReactNode} props.children  the content
 */
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
