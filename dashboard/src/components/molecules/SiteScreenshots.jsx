// Screenshots of the test site in the test details: the main test shows the
// homepage and the sign-up page, the sign-up test only the sign-up page. A
// thumbnail opens it large (ScreenshotButton).
import ScreenshotButton from './ScreenshotButton.jsx';
import { SCREENSHOTS } from '../../data/screenshots.js';

const PAGES = { main: ['GET /', 'GET /signup'], signup: ['GET /signup'] };

export default function SiteScreenshots({ test }) {
  const shots = (PAGES[test] ?? []).map((route) => SCREENSHOTS[route]?.normal).filter(Boolean);
  if (!shots.length) return null;

  return (
    <div className="site-screenshots">
      <p className="site-screenshots-title">The test site</p>
      <div className="site-screenshots-row">
        {shots.map((shot) => (
          <ScreenshotButton
            key={shot.file}
            file={shot.file}
            caption={shot.caption}
            className="site-screenshot"
            captionClassName="site-screenshot-caption"
            loading="lazy"
          />
        ))}
      </div>
    </div>
  );
}
