// A grey block standing in for content that's still loading. width/height
// are CSS lengths; width defaults to the full row.
export default function Placeholder({ width = '100%', height = 12, className = '' }) {
  return <div className={`placeholder ${className}`.trim()} style={{ width, height }} aria-hidden="true" />;
}
