// Development only: every component on one page, with all its variants and
// real data from the newest main and sign-up runs, in atoms, molecules,
// organisms order. Open /monzo/dashboard/components while running npm run dev.
// It isn't part of the built dashboard.
import { useEffect, useState } from 'react';
import { loadRun, loadRunIndex } from '../data/api.js';
import SeverityBadge from '../components/atoms/SeverityBadge.jsx';
import ConfidenceIndicator from '../components/atoms/ConfidenceIndicator.jsx';
import Placeholder from '../components/atoms/Placeholder.jsx';
import Icon from '../components/atoms/Icon.jsx';
import ChartLegend from '../components/atoms/ChartLegend.jsx';
import CanWaitCallout from '../components/molecules/CanWaitCallout.jsx';
import KeyNumbers from '../components/molecules/KeyNumbers.jsx';
import CustomerView from '../components/molecules/CustomerView.jsx';
import RunPicker from '../components/molecules/RunPicker.jsx';
import AppHeader from '../components/page/AppHeader.jsx';
import ProjectContext from '../components/page/ProjectContext.jsx';
import EmptyReport from '../components/page/EmptyReport.jsx';
import DashboardSkeleton from '../components/page/DashboardSkeleton.jsx';
import PromptComposer from '../components/molecules/PromptComposer.jsx';
import AiResponse from '../components/molecules/AiResponse.jsx';
import VerdictCard from '../components/organisms/VerdictCard.jsx';
import AiAnalysisDisclosure from '../components/organisms/AiAnalysisDisclosure.jsx';
import { ATTACHMENT_NAME, MODELS, PROMPT_TEMPLATE } from '../data/aiContract.js';
import CANNED_AI from '../data/cannedAiResponses.json';
import FindingCard from '../components/organisms/FindingCard.jsx';

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
const ICONS = ['error', 'priorityHigh', 'warningAmber', 'arrowDownward', 'check', 'checkCircle', 'visibility', 'schedule', 'bolt', 'description', 'arrowUpward', 'autoAwesome'];
const WAIT_VARIANTS = ['safe', 'caution', 'soon', 'now'];
const LEGEND_KINDS = [
  { kind: 'line', label: 'Arrivals' },
  { kind: 'area', label: 'Success' },
  { kind: 'area-red', label: 'Waiting' },
  { kind: 'block', label: 'Left' },
  { kind: 'hatched', label: 'Fallback' },
  { kind: 'knee', label: 'Knee' },
  { kind: 'capacity', label: 'Capacity' },
  { kind: 'campaign', label: 'Campaign' },
];

function Specimen({ name, children }) {
  return (
    <div className="dev-specimen">
      <p className="dev-specimen-name">{name}</p>
      <div className="dev-specimen-body">{children}</div>
    </div>
  );
}

export default function ComponentsPage() {
  const [runs, setRuns] = useState([]);
  const [main, setMain] = useState(null);
  const [signup, setSignup] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showSuperseded, setShowSuperseded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRunIndex()
      .then((index) => {
        setRuns(index);
        const newest = (test) => index.find((r) => r.test === test && !r.superseded);
        if (newest('main')) loadRun(newest('main').name).then(setMain);
        if (newest('signup')) loadRun(newest('signup').name).then(setSignup);
      })
      .catch(setError);
  }, []);

  const [model, setModel] = useState(MODELS[0].id);
  const [typingKey, setTypingKey] = useState(0); // remounts AiResponse to type it again

  const firstFinding = main?.findings.findings[0];
  const picker = <RunPicker runs={runs} selected={selected} onSelect={setSelected} showSuperseded={showSuperseded} onToggleSuperseded={setShowSuperseded} />;

  return (
    <div className="dev-components">
      <h1>Components</h1>
      <p className="muted">Development only. Real data from the newest main and sign-up runs (run npm run data first).</p>
      {error ? <p role="alert">{error.message}</p> : null}

      <h2 className="dev-level">Atoms</h2>
      <Specimen name="SeverityBadge">
        {SEVERITIES.map((s) => (
          <SeverityBadge key={s} severity={s} />
        ))}
      </Specimen>
      <Specimen name="ConfidenceIndicator">
        {['high', 'medium', 'low'].map((l) => (
          <ConfidenceIndicator key={l} level={l} />
        ))}
      </Specimen>
      <Specimen name="Icon">
        {ICONS.map((n) => (
          <span key={n} className="dev-icon">
            <Icon name={n} size={20} /> <code>{n}</code>
          </span>
        ))}
      </Specimen>
      <Specimen name="ChartLegend (every kind)">
        <ChartLegend items={LEGEND_KINDS} />
      </Specimen>
      <Specimen name="Placeholder">
        <div style={{ width: 320, display: 'grid', gap: 8 }}>
          <Placeholder width={70} height={23} />
          <Placeholder height={12} />
        </div>
      </Specimen>

      <h2 className="dev-level">Molecules</h2>
      <Specimen name="CanWaitCallout (regular)">
        <div className="dev-grid-4">
          {WAIT_VARIANTS.map((v) => (
            <CanWaitCallout key={v} variant={v} text={`Sample sentence for the ${v} look.`} />
          ))}
        </div>
      </Specimen>
      <Specimen name='CanWaitCallout (size="large")'>
        <div className="dev-grid-4">
          {WAIT_VARIANTS.map((v) => (
            <CanWaitCallout key={v} variant={v} size="large" text={`Sample sentence for the ${v} look.`} />
          ))}
        </div>
      </Specimen>
      <Specimen name='CanWaitCallout (size="inline")'>
        {WAIT_VARIANTS.map((v) => (
          <CanWaitCallout key={v} variant={v} size="inline" />
        ))}
      </Specimen>
      <Specimen name="PromptComposer (send replays AiResponse's typing below)">
        <div style={{ width: '100%', maxWidth: 720 }}>
          <PromptComposer
            prompt={PROMPT_TEMPLATE}
            attachment={{ name: ATTACHMENT_NAME, size: '4 KB' }}
            models={MODELS}
            model={model}
            onModelChange={setModel}
            onSend={() => setTypingKey((k) => k + 1)}
          />
        </div>
      </Specimen>
      {Object.entries(CANNED_AI).map(([key, response]) => (
        <Specimen key={key} name={`AiResponse · ${key}`}>
          <div style={{ width: '100%', maxWidth: 720 }}>
            <AiResponse key={typingKey} response={response} modelName={MODELS.find((m) => m.id === model)?.name} typing={typingKey > 0} />
          </div>
        </Specimen>
      ))}
      <Specimen name="RunPicker">
        <div style={{ width: '100%', maxWidth: 520 }}>{picker}</div>
      </Specimen>
      {firstFinding ? (
        <>
          <Specimen name="KeyNumbers (main run, first finding)">
            <div style={{ width: '100%' }}>
              <KeyNumbers loadLevels={firstFinding.load_levels} />
            </div>
          </Specimen>
          <Specimen name="CustomerView (main run, first finding)">
            <div style={{ width: 440 }}>
              <CustomerView customerView={firstFinding.customer_view} />
            </div>
          </Specimen>
        </>
      ) : null}

      <h2 className="dev-level">Organisms</h2>
      {firstFinding ? (
        <Specimen name="AiAnalysisDisclosure (main run, first finding)">
          <div className="verdict-card" style={{ width: '100%', paddingTop: 'var(--verdict-gutter)' }}>
            <AiAnalysisDisclosure finding={firstFinding} peaks={main.findings.peaks} />
          </div>
        </Specimen>
      ) : null}
      {[main, signup].filter(Boolean).flatMap((run) =>
        run.findings.findings.map((f) => (
          <Specimen key={run.name + f.title} name={`VerdictCard · ${run.name} · ${f.severity}`}>
            <div style={{ width: '100%' }}>
              <VerdictCard finding={f} timeline={run.timeline} routeContext={run.routeContext} peaks={run.findings?.peaks} />
            </div>
          </Specimen>
        ))
      )}
      {[main, signup].filter(Boolean).flatMap((run) =>
        run.findings.findings.map((f) => (
          <Specimen key={'short' + run.name + f.title} name={`FindingCard (short, until →) · ${run.name} · ${f.severity}`}>
            <div style={{ width: 430 }}>
              <FindingCard finding={f} defaultExpanded={false} timeline={run.timeline} routeContext={run.routeContext} peaks={run.findings?.peaks} />
            </div>
          </Specimen>
        ))
      )}

      <h2 className="dev-level">Page parts</h2>
      <Specimen name="AppHeader + ProjectContext">
        <div className="app-frame" style={{ width: '100%', margin: 0 }}>
          <AppHeader />
          <ProjectContext label="Select a run" />
        </div>
      </Specimen>
      <Specimen name="EmptyReport">
        <div style={{ width: '100%' }}>
          <EmptyReport picker={picker} />
        </div>
      </Specimen>
      <Specimen name="DashboardSkeleton">
        <div style={{ width: '100%' }}>
          <DashboardSkeleton />
        </div>
      </Specimen>
    </div>
  );
}
