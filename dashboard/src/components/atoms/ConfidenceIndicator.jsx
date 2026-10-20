// How well a finding is supported (Figma: Confidence / all three levels).
// level: "high" | "medium" | "low" (finding.confidence). Three bars of rising
// height, with 3, 2 or 1 of them filled.
const LEVELS = {
  high: { filled: 3, label: 'High confidence' },
  medium: { filled: 2, label: 'Medium confidence' },
  low: { filled: 1, label: 'Low confidence' },
};

export default function ConfidenceIndicator({ level }) {
  const { filled, label } = LEVELS[level] ?? { filled: 0, label: `${level ?? 'Unknown'} confidence` };
  return (
    <span className="confidence-indicator" data-level={level}>
      <span className="confidence-scale" aria-hidden="true">
        {[1, 2, 3].map((bar) => (
          <span key={bar} className={`confidence-bar${bar <= filled ? ' is-filled' : ''}`} />
        ))}
      </span>
      <span className="confidence-label">{label}</span>
    </span>
  );
}
