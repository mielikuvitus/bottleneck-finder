// A finding's severity (Figma: Severity badges).
import Icon from './Icon.jsx';

/** @type {Record<string, { label: string, icon: import('./Icon.jsx').IconName }>} */
const BADGES = {
  critical: { label: 'Critical', icon: 'error' },
  high: { label: 'High', icon: 'priorityHigh' },
  medium: { label: 'Medium', icon: 'warningAmber' },
  low: { label: 'Low', icon: 'arrowDownward' },
  info: { label: 'Healthy', icon: 'check' },
};

/**
 * @param {object} props
 * @param {import('../../data/types.js').Severity} props.severity  finding.severity; "info" reads "Healthy"
 * @param {string} [props.className]  added to its own; other attributes go to the badge too
 */
export default function SeverityBadge({ severity, className = '', ...rest }) {
  const badge = BADGES[severity] ?? { label: severity, icon: null };
  return (
    <span {...rest} className={`severity-badge ${className}`.trim()} data-severity={severity}>
      {badge.icon ? <Icon name={badge.icon} size={14} /> : null}
      {badge.label}
    </span>
  );
}
