// A screenshot as a button that opens it large (ScreenshotModal). If the
// image doesn't load, a box with "Screenshot not found" takes its place and the
// button is disabled.
import { useState } from 'react';
import ScreenshotModal from './ScreenshotModal.jsx';

/**
 * @param {object} props
 * @param {string} props.src  the image's address
 * @param {string} props.caption
 * @param {number} [props.width]  the file's pixel size, so the page keeps its space while it loads
 * @param {number} [props.height]
 * @param {string} [props.className]  the button's look comes from its user
 * @param {string} [props.captionClassName]  shows the caption under the image; left out, the caption is the image's alt text
 * @param {'lazy' | 'eager'} [props.loading]
 */
export default function ScreenshotButton({ src, caption, width, height, className, captionClassName, loading }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} disabled={failed}>
        {failed ? (
          <span className="screenshot-missing" style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}>
            Screenshot not found{captionClassName ? null : `: ${caption}`}
          </span>
        ) : (
          <img src={src} alt={captionClassName ? '' : caption} width={width} height={height} loading={loading} onError={() => setFailed(true)} />
        )}
        {captionClassName ? <span className={captionClassName}>{caption}</span> : null}
        {failed ? null : <span className="visually-hidden">: open larger</span>}
      </button>
      {open ? <ScreenshotModal src={src} caption={caption} width={width} height={height} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
