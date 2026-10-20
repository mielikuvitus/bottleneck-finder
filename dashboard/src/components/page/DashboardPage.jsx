// The whole page: header with the run picker and the summary strip, then
// verdict cards and funnel
// (the assumptions are in the summary strip; each finding's evidence and charts are in its verdict card)
import { useEffect } from 'react';
import { useRun } from '../../data/RunContext.jsx';
import { pageTitle } from '../../data/runLabels.js';
import RunPicker from '../molecules/RunPicker.jsx';
import SummaryStrip from './SummaryStrip.jsx';
import FindingCard from '../organisms/FindingCard.jsx';
import AllClearCard from '../organisms/AllClearCard.jsx';
import Funnel from '../organisms/Funnel.jsx';
import HealthyRoutes from '../organisms/HealthyRoutes.jsx';
import DashboardSkeleton from './DashboardSkeleton.jsx';
import EmptyReport from './EmptyReport.jsx';
import AppHeader from './AppHeader.jsx';
import ProjectContext from './ProjectContext.jsx';

// ?skeleton in the address keeps the loading state on screen (for checking the design)
const forceSkeleton = new URLSearchParams(window.location.search).has('skeleton');

export default function DashboardPage() {
  const { runs, selected, selectRun, showSuperseded, setShowSuperseded, run, loading, error } = useRun();

  // The browser tab says which run is open
  const selectedRun = runs.find((r) => r.name === selected);
  const isLoading = !error && (forceSkeleton || loading || (selected && !run));
  useEffect(() => {
    document.title = pageTitle(selectedRun, isLoading);
  }, [selectedRun, isLoading]);

  const picker = (
    <RunPicker runs={runs} selected={selected} onSelect={selectRun} showSuperseded={showSuperseded} onToggleSuperseded={setShowSuperseded} />
  );

  // Nothing selected yet: the empty report
  if (!error && !forceSkeleton && !selected && !loading) {
    return (
      <div className="app-frame-wrap">
        <EmptyReport picker={picker} />
      </div>
    );
  }

  // No verdict is shown until the whole run has loaded
  if (!error && (forceSkeleton || loading || !run)) {
    return (
      <div className="app-frame-wrap">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="app-frame">
        <AppHeader />
        <ProjectContext>{picker}</ProjectContext>
        {/* The test details sit in the same box as the run picker, once a run is open */}
        {run ? <SummaryStrip run={run} /> : null}
      </div>

      {error ? <p role="alert">{error.message}</p> : null}

      {run ? (
        <main>
          <section id="verdicts">
            <h2>Verdicts</h2>
            <div className="findings">
              {run.findings.findings.map((f) => (
                <FindingCard key={run.name + f.title} finding={f} timeline={run.timeline} routeContext={run.routeContext} peaks={run.findings?.peaks} />
              ))}
              {run.findings.all_clear ? (
                <AllClearCard allClear={run.findings.all_clear} dateLabel={selectedRun?.date_label} commit={run.runInfo?.git?.commit} />
              ) : null}
            </div>
            {run.findings.healthyRoutes?.length ? (
              <>
                <h3>Healthy routes</h3>
                <HealthyRoutes healthyRoutes={run.findings.healthyRoutes} upTo={run.findings.healthy_up_to} timeline={run.timeline} routeContext={run.routeContext} />
              </>
            ) : null}
          </section>

          <section id="funnel">
            <h2>Funnel</h2>
            <Funnel funnel={run.findings.funnel} />
          </section>
        </main>
      ) : null}
    </div>
  );
}
