// "Can it wait?": a box with a bold title and a sentence underneath. The look
// comes from variant: safe (green), caution (yellow), soon (pale red) or now
// (coral); the words come from the analyser. For just the coloured title,
// with no box, use CanWaitTitle.
import Icon from '../atoms/Icon.jsx';
import { WAIT_ICONS } from '../../data/severity.js';

const ICON_SIZES = { regular: 16, large: 18 };

/**
 * @param {object} props
 * @param {import('../../data/types.js').WaitVariant} props.variant  waitVariant(finding.severity) in src/data/severity.js
 * @param {string} props.title  finding.can_wait_title
 * @param {string} [props.text]  finding.can_wait
 * @param {'regular' | 'large'} [props.size]  "large" in the verdict card (default "regular")
 * @param {string} [props.className]  added to its own; other attributes go to the box too
 */
export default function CanWaitCallout({ variant, title, text, size = 'regular', className = '', ...rest }) {
  return (
    <div {...rest} className={`can-wait ${className}`.trim()} data-variant={variant} data-size={size}>
      <p className="can-wait-title">
        {WAIT_ICONS[variant] ? <Icon name={WAIT_ICONS[variant]} size={ICON_SIZES[size] ?? ICON_SIZES.regular} /> : null}
        {title}
      </p>
      {text ? <p className="can-wait-text">{text}</p> : null}
    </div>
  );
}
