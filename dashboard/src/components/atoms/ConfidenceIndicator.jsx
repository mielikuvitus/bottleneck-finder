// How well a finding is supported (Figma: Confidence / all three levels).
// Three bars of rising height, with 3, 2 or 1 of them filled, and a label.
const LEVELS = {
  high: { filled: 3, label: 'High confidence' },
  medium: { filled: 2, label: 'Medium confidence' },
  low: { filled: 1, label: 'Low confidence' },
};

/**
 * @param {object} props
 * @param {import('../../data/types.js').Confidence | string} props.level  finding.confidence. Any other value (e.g. "none") shows no filled bars
 * @param {string} [props.className]  added to its own; other attributes go to the outer span too
 */
export default function ConfidenceIndicator({ level, className = '', ...rest }) {
  const { filled, label } = LEVELS[level] ?? { filled: 0, label: `${level ?? 'Unknown'} confidence` };
  return (
    <span {...rest} className={`confidence-indicator ${className}`.trim()} data-level={level}>
      <span className="confidence-scale" aria-hidden="true">
        {[1, 2, 3].map((bar) => (
          <span key={bar} className={`confidence-bar${bar <= filled ? ' is-filled' : ''}`} />
        ))}
      </span>
      <span className="confidence-label">{label}</span>
    </span>
  );
}
