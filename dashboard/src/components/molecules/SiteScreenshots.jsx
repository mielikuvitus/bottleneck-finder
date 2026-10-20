// Screenshots of the test site in the test details: the main test shows the
// homepage and the sign-up page, the sign-up test only the sign-up page. A
// thumbnail opens it large (ScreenshotModal).
import { useState } from 'react';
import ScreenshotModal from './ScreenshotModal.jsx';
import { SCREENSHOTS } from '../../data/screenshots.js';
import { imageUrl } from '../../data/api.js';

const PAGES = { main: ['GET /', 'GET /signup'], signup: ['GET /signup'] };

export default function SiteScreenshots({ test }) {
  const [open, setOpen] = useState(null);
  const shots = (PAGES[test] ?? []).map((route) => SCREENSHOTS[route]?.normal).filter(Boolean);
  if (!shots.length) return null;

  return (
    <div className="site-screenshots">
      <p className="site-screenshots-title">The test site</p>
      <div className="site-screenshots-row">
        {shots.map((shot) => (
          <button type="button" key={shot.file} className="site-screenshot" onClick={() => setOpen(shot)}>
            <img src={imageUrl(shot.file)} alt="" loading="lazy" />
            <span className="site-screenshot-caption">{shot.caption}</span>
            <span className="visually-hidden">: open larger</span>
          </button>
        ))}
      </div>
      {open ? <ScreenshotModal file={open.file} caption={open.caption} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
