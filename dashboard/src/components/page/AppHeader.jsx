// The tomorrow logo and the tool's name
export default function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-identity">
        <span className="app-monogram" aria-hidden="true">
          T
        </span>
        <span className="app-wordmark">tomorrow</span>
      </div>
      <p className="app-tool-name">Web Performance</p>
    </header>
  );
}
