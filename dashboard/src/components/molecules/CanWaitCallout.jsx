// "Can it wait?" (Figma: Can it wait variants).
// variant sets the look: "safe" (green), "caution" (yellow), "soon" (pale red)
// or "now" (coral). title and text come from the finding (can_wait_title,
// can_wait); a variant's default title is only a fallback.
import Icon from '../atoms/Icon.jsx';

// The icon says when to act (the severity badge says how bad it is)
const ICONS = { safe: 'checkCircle', caution: 'visibility', soon: 'schedule', now: 'bolt' };
const ICON_SIZES = { regular: 16, large: 18, inline: 15 };

const DEFAULT_TITLES = {
  safe: 'Safe to wait',
  caution: 'Watch closely',
  soon: 'Fix soon',
  now: 'Fix now',
};

// size: "regular" (default), "large" (the verdict card's bigger title) or
// "inline" (just the title in the variant's colour, no box: the short finding
// card). Inline uses spans, so it can sit inside a button; children (e.g. an
// arrow) follow the title in the same colour.
export default function CanWaitCallout({ variant, title, text, size = 'regular', children }) {
  if (size === 'inline') {
    return (
      <span className="can-wait" data-variant={variant} data-size={size}>
        <span className="can-wait-title">
          {ICONS[variant] ? <Icon name={ICONS[variant]} size={ICON_SIZES.inline} /> : null}
          {title ?? DEFAULT_TITLES[variant] ?? variant}
          {children}
        </span>
        {text ? <span className="can-wait-text"> · {text}</span> : null}
      </span>
    );
  }
  return (
    <div className="can-wait" data-variant={variant} data-size={size}>
      <p className="can-wait-title">
        {ICONS[variant] ? <Icon name={ICONS[variant]} size={ICON_SIZES[size] ?? 16} /> : null}
        {title ?? DEFAULT_TITLES[variant] ?? variant}
      </p>
      <p className="can-wait-text">{text}</p>
    </div>
  );
}
