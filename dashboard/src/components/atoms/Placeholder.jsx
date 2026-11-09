// A grey block standing in for content that's still loading. width/height
// are CSS lengths; width defaults to the full row.
export default function Placeholder({ width = '100%', height = 12, className = '', style, ...rest }) {
  return <div {...rest} className={`placeholder ${className}`.trim()} style={{ ...style, width, height }} aria-hidden="true" />;
}
