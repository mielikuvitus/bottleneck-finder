// A labelled number, e.g. label "Visit length", value 4.65, unit "s"
export default function Stat({ label, value, unit, note }) {
  return (
    <div className="stat">
      <div className="stat-label muted">{label}</div>
      <div className="stat-value">
        {value ?? '–'}
        {unit ? ` ${unit}` : ''}
      </div>
      {note ? <div className="stat-note muted">{note}</div> : null}
    </div>
  );
}
