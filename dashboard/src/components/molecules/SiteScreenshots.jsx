// Screenshots of the test site in the test details, each opening large
// (ScreenshotButton). shots: [{ src, caption }], from siteShots() in
// src/data/screenshots.js. None, and nothing shows.
import ScreenshotButton from './ScreenshotButton.jsx';

export default function SiteScreenshots({ shots }) {
  if (!shots?.length) return null;

  return (
    <div className="site-screenshots">
      <p className="site-screenshots-title">The test site</p>
      <div className="site-screenshots-row">
        {shots.map((shot) => (
          <ScreenshotButton
            key={shot.src}
            src={shot.src}
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
