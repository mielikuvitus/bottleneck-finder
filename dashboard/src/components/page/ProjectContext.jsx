// The project title, and the run selector below it (children). While loading,
// pass a label instead and it shows as a read-only selector box.
export default function ProjectContext({ title = 'Traffic readiness', label, children }) {
  return (
    <div className="project-context">
      <h1 className="project-title">{title}</h1>
      {children ?? (
        <div className="run-selector run-selector-static">
          <span className="run-selector-label">{label}</span>
          <span className="run-selector-chevron" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
