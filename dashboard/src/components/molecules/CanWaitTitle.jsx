// The can-it-wait title on its own: the icon and title in the variant's
// colour, no box (the short finding card). Made of spans, so it can sit in a
// button. children (e.g. "→ Read more") follow the title in the same colour.
// variant and title as for CanWaitCallout.
import Icon from '../atoms/Icon.jsx';
import { WAIT_ICONS } from '../../data/severity.js';

export default function CanWaitTitle({ variant, title, className = '', children, ...rest }) {
  return (
    <span {...rest} className={`can-wait ${className}`.trim()} data-variant={variant} data-size="inline">
      <span className="can-wait-title">
        {WAIT_ICONS[variant] ? <Icon name={WAIT_ICONS[variant]} size={15} /> : null}
        {title}
        {children}
      </span>
    </span>
  );
}
