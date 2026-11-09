// The can-it-wait title on its own: the icon and title in the variant's
// colour, no box (the short finding card). Made of spans, so it can sit in a
// button.
import Icon from '../atoms/Icon.jsx';
import { WAIT_ICONS } from '../../data/severity.js';

/**
 * @param {object} props
 * @param {import('../../data/types.js').WaitVariant} props.variant  as for CanWaitCallout
 * @param {string} props.title  finding.can_wait_title
 * @param {import('react').ReactNode} [props.children]  follow the title in the same colour (e.g. "→ Read more")
 * @param {string} [props.className]  added to its own; other attributes go to the outer span too
 */
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
