// A screenshot as a button that opens it large (ScreenshotModal).
import { useState } from 'react';
import ScreenshotModal from './ScreenshotModal.jsx';

/**
 * @param {object} props
 * @param {string} props.src  the image's address
 * @param {string} props.caption
 * @param {string} [props.className]  the button's look comes from its user
 * @param {string} [props.captionClassName]  shows the caption under the image; left out, the caption is the image's alt text
 * @param {'lazy' | 'eager'} [props.loading]
 */
export default function ScreenshotButton({ src, caption, className, captionClassName, loading }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <img src={src} alt={captionClassName ? '' : caption} loading={loading} />
        {captionClassName ? <span className={captionClassName}>{caption}</span> : null}
        <span className="visually-hidden">: open larger</span>
      </button>
      {open ? <ScreenshotModal src={src} caption={caption} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
