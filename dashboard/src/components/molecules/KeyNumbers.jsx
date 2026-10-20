// How much traffic a finding's route carries, against both peaks
// (finding.load_levels). Room is only shown when a level fits.
export default function KeyNumbers({ loadLevels }) {
  if (!loadLevels) return null;
  return (
    <div className="key-numbers">
      <div className="key-number">
        <p className="key-number-label">Handles</p>
        <p className="key-number-value">about {loadLevels.handles_visitors} visitors</p>
        <p className="key-number-note">
          {/* "visitors at once" → "at once": the value already says visitors */}
          {loadLevels.handles_what.replace(/^visitors /, '')} · {loadLevels.handles_requests_per_second} requests a second
        </p>
      </div>
      {loadLevels.levels.map((level) => (
        <div key={level.name} className="key-number" data-fits={level.fits === null ? 'unknown' : String(level.fits)}>
          <p className="key-number-label">{level.name}</p>
          <p className="key-number-value">
            {level.visitors} visitors ·{' '}
            <span className="key-number-verdict">{level.fits === null ? 'unknown' : level.fits ? 'fits' : 'over the limit'}</span>
          </p>
          {level.note ? <p className="key-number-note">{level.note}</p> : null}
        </div>
      ))}
    </div>
  );
}
