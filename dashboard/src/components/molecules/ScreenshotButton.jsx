// A screenshot as a button that opens it large (ScreenshotModal).
// src: the image's address. With captionClassName the caption shows under the
// image; without it, the caption is the image's alt text.
import { useState } from 'react';
import ScreenshotModal from './ScreenshotModal.jsx';

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
