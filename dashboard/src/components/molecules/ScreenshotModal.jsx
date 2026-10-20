// One screenshot, large, in a native <dialog>: the page behind is blocked,
// Esc closes it, and focus returns to the button that opened it. Closes with
// the ✕ at the top right or a click outside the image.
import { useEffect, useRef } from 'react';
import Icon from '../atoms/Icon.jsx';
import { imageUrl } from '../../data/api.js';

export default function ScreenshotModal({ file, caption, onClose }) {
  const ref = useRef(null);

  // Open as a modal on mount. No close() on cleanup: removing the dialog
  // closes it anyway, and in StrictMode a close would fire onClose at once
  useEffect(() => {
    if (!ref.current.open) ref.current.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="screenshot-modal"
      aria-label={caption}
      onClose={onClose}
      // The dialog has no padding, so a click on the dialog itself (not the
      // image or the button) is on the backdrop around it
      onClick={(e) => e.target === ref.current && ref.current.close()}
    >
      <img src={imageUrl(file)} alt={caption} />
      <button type="button" className="screenshot-modal-close" onClick={() => ref.current.close()}>
        <Icon name="close" size={20} />
        <span className="visually-hidden">Close</span>
      </button>
    </dialog>
  );
}
