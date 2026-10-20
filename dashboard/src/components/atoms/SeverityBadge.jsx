// A finding's severity (Figma: Severity badges).
// severity: finding.severity ("critical" | "high" | "medium" | "low" | "info").
import Icon from './Icon.jsx';

const BADGES = {
  critical: { label: 'Critical', icon: 'error' },
  high: { label: 'High', icon: 'priorityHigh' },
  medium: { label: 'Medium', icon: 'warningAmber' },
  low: { label: 'Low', icon: 'arrowDownward' },
  info: { label: 'Healthy', icon: 'check' },
};

export default function SeverityBadge({ severity }) {
  const badge = BADGES[severity] ?? { label: severity, icon: null };
  return (
    <span className="severity-badge" data-severity={severity}>
      {badge.icon ? <Icon name={badge.icon} size={14} /> : null}
      {badge.label}
    </span>
  );
}
