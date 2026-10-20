// One entry from src/data/screenshots.js: { file, route, state, caption }
import { imageUrl } from '../../data/api.js';

export default function ScreenshotFrame({ file, route, state, caption }) {
  return (
    <figure className="screenshot-frame" data-state={state}>
      <img src={imageUrl(file)} alt={caption} loading="lazy" />
      <figcaption className="muted">
        {route} · {state}: {caption}
      </figcaption>
    </figure>
  );
}
