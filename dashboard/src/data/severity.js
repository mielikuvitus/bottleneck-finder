// Which can-it-wait look each severity gets. An unknown severity gets the amber
// warning, as nothing says it's safe.
const WAIT_VARIANT = { critical: 'now', high: 'soon', medium: 'caution', low: 'safe', info: 'safe' };

export const waitVariant = (severity) => WAIT_VARIANT[severity] ?? 'caution';
