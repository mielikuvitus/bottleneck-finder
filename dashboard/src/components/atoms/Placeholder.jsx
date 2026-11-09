// A grey block standing in for content that's still loading.
/**
 * @param {object} props
 * @param {number | string} [props.width]  px or any CSS length (default "100%"); never wider than its container
 * @param {number | string} [props.height]  px or any CSS length (default 12)
 * @param {string} [props.className]  added to its own; other attributes go to the block too
 * @param {object} [props.style]  merged under width and height
 */
export default function Placeholder({ width = '100%', height = 12, className = '', style, ...rest }) {
  return <div {...rest} className={`placeholder ${className}`.trim()} style={{ ...style, width, height }} aria-hidden="true" />;
}
