// Plain-English wording for the analyser.

// 4 -> "4ms", 250 -> "0.25s", 2700 -> "2.7s"
export function seconds(ms) {
  if (ms === null || ms === undefined) return 'unknown';
  if (ms < 100) return `${Math.round(ms)}ms`;
  return ms < 1000 ? `${(ms / 1000).toFixed(2)}s` : `${(ms / 1000).toFixed(1)}s`;
}

// 0.094 -> "9%", 0.003 -> "under 1%"
export function percent(share) {
  if (share === 0) return '0%';
  if (share < 0.01) return 'under 1%';
  return `${Math.round(share * 100)}%`;
}

export const num = (n) => Math.round(n).toLocaleString('en-GB');

// "1 in 20" style for small shares
export function oneIn(share) {
  if (!share) return 'no one';
  const n = Math.round(1 / share);
  return n <= 1 ? 'everyone' : `1 in ${n}`;
}

// Chance a visit making n requests has at least one in the slowest 5%:
// each request is fine 95% of the time, so all n are fine 0.95^n of the time
export const slowVisitShare = (requestsPerVisit) => 1 - 0.95 ** requestsPerVisit;

export function routeName(route, context) {
  return context[route]?.powers ?? route;
}

