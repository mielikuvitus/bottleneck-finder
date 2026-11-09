// Every legend mark, by kind: a sample label (for the components page) and how
// to draw it in a 16 x 10 box. ChartLegend.jsx draws them; adding a kind here
// adds it to the components page too.

// A shaded area with a solid top edge
const area = (edge, fill) => (
  <>
    <rect x="1" y="3" width="14" height="7" fill={fill} />
    <line x1="1" y1="3" x2="15" y2="3" stroke={edge} strokeWidth="1.5" />
  </>
);

export const LEGEND_SYMBOLS = {
  main: { label: 'Arrivals', draw: () => <line x1="0" y1="5" x2="16" y2="5" stroke="var(--color-chart-arrivals)" strokeWidth="2" /> },
  success: { label: 'Success', draw: () => area('var(--color-chart-success)', 'var(--color-chart-success-fill)') },
  second: { label: 'Waiting', draw: () => area('var(--color-chart-fallback)', 'var(--color-chart-fallback-fill)') },
  'other-cause': {
    label: 'Second cause',
    draw: () => <line x1="0" y1="5" x2="16" y2="5" stroke="var(--color-chart-fallback)" strokeWidth="1.5" strokeDasharray="3 2" />,
  },
  left: { label: 'Left', draw: () => <rect x="3" y="0" width="10" height="10" fill="var(--color-chart-left)" /> },
  fallback: {
    label: 'Fallback',
    draw: (patternId) => <rect x="3.5" y="0.5" width="9" height="9" fill={`url(#${patternId})`} stroke="var(--color-chart-fallback)" strokeDasharray="1.5 1" />,
  },
  knee: { label: 'Knee', draw: () => <circle cx="8" cy="5" r="4" fill="var(--color-surface)" stroke="var(--color-chart-annotation)" strokeWidth="1.5" /> },
  capacity: {
    label: 'Capacity',
    draw: () => <line x1="0" y1="5" x2="16" y2="5" stroke="var(--color-chart-annotation)" strokeWidth="1.5" strokeDasharray="2 2" />,
  },
  campaign: { label: 'Campaign', draw: () => <line x1="8" y1="0" x2="8" y2="10" stroke="var(--color-chart-annotation)" strokeWidth="1.5" /> },
};
