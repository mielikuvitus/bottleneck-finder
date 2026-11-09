// An icon from Google's Material Icons; the shapes are in iconPaths.jsx (where
// to add one, and the licence).
import { ICON_PATHS } from './iconPaths.jsx';


/** @typedef {keyof typeof ICON_PATHS} IconName  the icons in iconPaths.jsx */

// Decorative: hidden from screen readers, so the text next to it carries the
// meaning. It takes the text colour (currentColor).
/**
 * @param {object} props
 * @param {IconName} props.name
 * @param {number} [props.size]  in px (default 14)
 * @param {string} [props.className]  added to its own; other attributes go to the <svg> too
 */
export default function Icon({ name, size = 14, className = '', ...rest }) {
  return (
    <svg
      {...rest}
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
