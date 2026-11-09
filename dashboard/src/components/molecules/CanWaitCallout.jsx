// "Can it wait?": a box with a bold title and a sentence underneath.
// variant sets the look: "safe" (green), "caution" (yellow), "soon" (pale red)
// or "now" (coral). title and text come from the finding (can_wait_title,
// can_wait). size: "regular" (default) or "large" (the verdict card).
// For just the coloured title, with no box, use CanWaitTitle.
import Icon from '../atoms/Icon.jsx';
import { WAIT_ICONS } from '../../data/severity.js';

const ICON_SIZES = { regular: 16, large: 18 };

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
