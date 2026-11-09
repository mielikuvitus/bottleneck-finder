// A screenshot as a button that opens it large (ScreenshotModal).
// file: relative to public/data/images. With captionClassName the caption shows
// under the image; without it, the caption is the image's alt text.
import { useState } from 'react';
import ScreenshotModal from './ScreenshotModal.jsx';
import { imageUrl } from '../../data/api.js';

export default function ScreenshotButton({ file, caption, className, captionClassName, loading }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <img src={imageUrl(file)} alt={captionClassName ? '' : caption} loading={loading} />
        {captionClassName ? <span className={captionClassName}>{caption}</span> : null}
        <span className="visually-hidden">: open larger</span>
      </button>
      {open ? <ScreenshotModal file={file} caption={caption} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
