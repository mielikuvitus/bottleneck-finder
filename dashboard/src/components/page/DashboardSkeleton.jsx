// The loading state: the page's layout with grey placeholders. No values or
// verdicts appear until the whole run has loaded.
import AppHeader from "./AppHeader.jsx";
import ProjectContext from "./ProjectContext.jsx";
import Placeholder from "../atoms/Placeholder.jsx";

export default function DashboardSkeleton({
  label = "Campaign readiness · loading…",
}) {
  return (
    <div className="app-frame skeleton" aria-busy="true">
      <AppHeader />
      <ProjectContext label={label} />

      {/* the test details box, closed */}
      <div className="disclosure skeleton-disclosure">
        <Placeholder width={220} height={17} />
      </div>

      <div className="skeleton-sections">
        <section className="skeleton-section">
          <h2 className="section-title">Verdict cards</h2>
          <div className="skeleton-card">
            <Placeholder width={70} height={23} />
            <Placeholder width={320} height={22} />
            <Placeholder />
            <Placeholder />
            <div className="skeleton-pair">
              <Placeholder height={80} />
              <Placeholder height={80} />
            </div>
          </div>
        </section>

        <section className="skeleton-section">
          <h2 className="section-title">Funnel</h2>
          <Placeholder height={38} />
        </section>

        <p className="skeleton-note" role="status">
          Preparing a report… Findings and values will appear together. No
          verdict is shown until the run is ready.
        </p>
      </div>
    </div>
  );
}
