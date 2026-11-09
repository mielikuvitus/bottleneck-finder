// Every component on one page, in atoms, molecules, organisms order, under
// tabs: the bank site (SiteComponents.jsx), the dashboard, with all its variants
// and real data from the newest main and sign-up runs with findings, and the
// design tokens of both (TokensTab.jsx).
// Lives at /monzo/dashboard/components, loaded only when that address is opened.
import { useContext, useEffect, useMemo, useState } from 'react';
import { Line, LineChart } from 'recharts';
import SiteComponents from './SiteComponents.jsx';
import TokensTab from './TokensTab.jsx';
import { INTERACTIVE, JumpContext, JumpHint, UsedInLink, useJumps } from './jumps.jsx';
import { chartRows } from '../data/series.js';
import { siteShots, statesFor } from '../data/screenshots.js';
import { assumptionsFor } from '../data/assumptions.js';
import ChartCard from '../components/molecules/ChartCard.jsx';
import { chartBase } from '../components/molecules/chartBase.jsx';
import SiteScreenshots from '../components/molecules/SiteScreenshots.jsx';
import ScreenshotModal from '../components/molecules/ScreenshotModal.jsx';
import ScreenshotButton from '../components/molecules/ScreenshotButton.jsx';
import Disclosure from '../components/molecules/Disclosure.jsx';
import AssumptionsList from '../components/organisms/AssumptionsList.jsx';
import EvidenceDisclosure from '../components/organisms/EvidenceDisclosure.jsx';
import HealthyRoutes from '../components/organisms/HealthyRoutes.jsx';
import AllClearCard from '../components/organisms/AllClearCard.jsx';
import Funnel from '../components/organisms/Funnel.jsx';
import SummaryStrip from '../components/page/SummaryStrip.jsx';
import { loadRun, loadRunIndex } from '../data/api.js';
import SeverityBadge from '../components/atoms/SeverityBadge.jsx';
import ConfidenceIndicator from '../components/atoms/ConfidenceIndicator.jsx';
import Placeholder from '../components/atoms/Placeholder.jsx';
import Icon from '../components/atoms/Icon.jsx';
import ChartLegend from '../components/atoms/ChartLegend.jsx';
import CanWaitCallout from '../components/molecules/CanWaitCallout.jsx';
import CanWaitTitle from '../components/molecules/CanWaitTitle.jsx';
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
const ICONS = ['error', 'priorityHigh', 'warningAmber', 'arrowDownward', 'check', 'checkCircle', 'visibility', 'schedule', 'bolt', 'close', 'description', 'arrowUpward', 'autoAwesome'];
// The look of each variant, with a title the analyser writes for it
const WAIT_VARIANTS = [
  ['safe', 'Safe to wait'],
  ['caution', 'Watch closely'],
  ['soon', 'Fix before campaign'],
  ['now', 'Fix now'],
];
const LEGEND_KINDS = [
  { kind: 'main', label: 'Arrivals' },
  { kind: 'success', label: 'Success' },
  { kind: 'second', label: 'Waiting' },
  { kind: 'other-cause', label: 'Second cause' },
  { kind: 'left', label: 'Left' },
  { kind: 'fallback', label: 'Fallback' },
  { kind: 'knee', label: 'Knee' },
  { kind: 'capacity', label: 'Capacity' },
  { kind: 'campaign', label: 'Campaign' },
];

// The first specimen on this page that uses each atom and molecule (from the
// components' imports). A few only appear in page parts, not in an organism.
const USED_IN = {
  SeverityBadge: 'VerdictCard',
  ConfidenceIndicator: 'VerdictCard',
  Icon: 'AiAnalysisDisclosure',
  ChartLegend: 'EvidenceDisclosure',
  Placeholder: 'DashboardSkeleton',
  CanWaitCallout: 'VerdictCard',
  CanWaitTitle: 'FindingCard',
  PromptComposer: 'AiAnalysisDisclosure',
  AiResponse: 'AiAnalysisDisclosure',
  RunPicker: 'EmptyReport',
  KeyNumbers: 'VerdictCard',
  CustomerView: 'VerdictCard',
  ChartCard: 'EvidenceDisclosure',
  SiteScreenshots: 'SummaryStrip',
  ScreenshotModal: 'VerdictCard',
  ScreenshotButton: 'VerdictCard',
  Disclosure: 'AiAnalysisDisclosure',
  AssumptionsList: 'SummaryStrip',
};

function Specimen({ name, children }) {
  const jumps = useContext(JumpContext);
  const component = name.split(/[\s·(]/)[0];
  const target = USED_IN[component];

  // A click on the piece jumps, unless it's on something with its own job or
  // the end of selecting some text
  function onBodyClick(event) {
    if (event.target.closest(INTERACTIVE) || window.getSelection()?.toString()) return;
    jumps.jumpTo(event.currentTarget.closest('.dev-specimen'), component, target);
  }

  return (
    <div className={`dev-specimen${target ? ' is-linked' : ''}`} data-component={component} tabIndex={-1}>
      <div className="dev-specimen-head">
        <p className="dev-specimen-name">{name}</p>
        {target ? <UsedInLink target={target} onClick={(event) => jumps.jumpTo(event.currentTarget.closest('.dev-specimen'), component, target)} /> : null}
      </div>
      <div className="dev-specimen-body" onClick={target ? onBodyClick : undefined}>
        {children}
      </div>
    </div>
  );
}

const NO_FINDINGS = 'No run has findings yet, so there’s nothing to show here.';
const NO_RUNS = 'No runs yet, so there’s nothing to show here.';

// A specimen that needs run data: says why when there's none to show.
// children is a function, so it only runs once the data is there.
function RunSpecimen({ name, status, ready, empty, children }) {
  let message = null;
  if (status === 'loading') message = 'Loading run data…';
  else if (status === 'error') {
    message = (
      <>
        Couldn’t load run data. Run <code>npm run data</code> first.
      </>
    );
  } else if (!ready) message = empty;
  return <Specimen name={name}>{message ? <p className="muted">{message}</p> : children()}</Specimen>;
}

function DashboardComponents() {
  const [runs, setRuns] = useState([]);
  const [status, setStatus] = useState('loading'); // loading, ready or error
  const [main, setMain] = useState(null);
  const [signup, setSignup] = useState(null);
  const [clear, setClear] = useState(null); // a run with nothing wrong, for AllClearCard
  const [modalOpen, setModalOpen] = useState(false);
  const jumps = useJumps();
  const [selected, setSelected] = useState(null);
  const [showSuperseded, setShowSuperseded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRunIndex()
      .then((index) => {
        setRuns(index);
        // Runs with findings fill the most components. The newest runs came
        // back all clear, so "newest" alone would leave most of the page empty.
        const current = index.filter((r) => !r.superseded);
        const withFindings = (test) => current.find((r) => r.test === test && r.findings > 0);
        const load = (r) => (r ? loadRun(r.name) : Promise.resolve(null));
        return Promise.all([load(withFindings('main')), load(withFindings('signup')), load(current.find((r) => r.findings === 0))]);
      })
      .then(([mainRun, signupRun, clearRun]) => {
        setMain(mainRun);
        setSignup(signupRun);
        setClear(clearRun);
        setStatus('ready');
      })
      .catch((err) => {
        setError(err);
        setStatus('error');
      });
  }, []);

  const [model, setModel] = useState(MODELS[0].id);
  const [typingKey, setTypingKey] = useState(0); // remounts AiResponse to type it again

  const firstFinding = main?.findings.findings[0];
  const signupFinding = signup?.findings.findings[0];
  const findings = [main, signup].filter(Boolean).flatMap((run) => run.findings.findings.map((finding) => ({ run, finding })));
  const anyRun = main ?? signup ?? clear;
  const healthyRun = [main, signup, clear].find((run) => run?.findings.healthyRoutes?.length);
  const p95Rows = useMemo(() => (main ? chartRows(main.timeline) : []), [main]);
  const modalShot = siteShots('main')[0];
  const picker = <RunPicker runs={runs} value={selected} onChange={setSelected} showSuperseded={showSuperseded} onShowSupersededChange={setShowSuperseded} />;

  return (
    <JumpContext.Provider value={jumps}>
      <p className="muted">Real data from the newest main and sign-up runs with findings.</p>
      <JumpHint />
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
        <ChartLegend legend={LEGEND_KINDS} />
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
          {WAIT_VARIANTS.map(([v, title]) => (
            <CanWaitCallout key={v} variant={v} title={title} text={`Sample sentence for the ${v} look.`} />
          ))}
        </div>
      </Specimen>
      <Specimen name='CanWaitCallout (size="large")'>
        <div className="dev-grid-4">
          {WAIT_VARIANTS.map(([v, title]) => (
            <CanWaitCallout key={v} variant={v} title={title} size="large" text={`Sample sentence for the ${v} look.`} />
          ))}
        </div>
      </Specimen>
      <Specimen name="CanWaitTitle">
        {WAIT_VARIANTS.map(([v, title]) => (
          <CanWaitTitle key={v} variant={v} title={title} />
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
      <Specimen name="AiResponse">
        <div style={{ width: '100%', maxWidth: 720 }}>
          <AiResponse key={typingKey} response={Object.values(CANNED_AI)[0]} modelName={MODELS.find((m) => m.id === model)?.name} typing={typingKey > 0} />
        </div>
      </Specimen>
      <Specimen name="RunPicker">
        <div style={{ width: '100%', maxWidth: 520 }}>{picker}</div>
      </Specimen>
      <Specimen name="RunPicker (no runs yet: open it)">
        <div style={{ width: '100%', maxWidth: 520 }}>
          <RunPicker runs={[]} value={null} onChange={() => {}} showSuperseded={false} onShowSupersededChange={() => {}} />
        </div>
      </Specimen>
      <RunSpecimen name="KeyNumbers (main run, first finding)" status={status} ready={firstFinding} empty={NO_FINDINGS}>
        {() => (
          <div style={{ width: '100%' }}>
            <KeyNumbers loadLevels={firstFinding.load_levels} />
          </div>
        )}
      </RunSpecimen>
      <RunSpecimen name="CustomerView (main run, first finding)" status={status} ready={firstFinding} empty={NO_FINDINGS}>
        {() => (
          <div style={{ width: 440 }}>
            <CustomerView
              states={statesFor(firstFinding.customer_view?.route)}
              initialState={firstFinding.customer_view?.state}
              address={firstFinding.customer_view?.shown_on}
              caption={firstFinding.customer_view?.caption}
            />
          </div>
        )}
      </RunSpecimen>
      <RunSpecimen name="ChartCard (p95, main run, first finding)" status={status} ready={firstFinding} empty={NO_FINDINGS}>
        {() => (
          <div style={{ width: '100%', maxWidth: 560 }}>
            <ChartCard title="Response time (p95)" unit="ms" legend={[{ kind: 'main', label: `${firstFinding.route} p95` }]}>
              <LineChart data={p95Rows} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
                {chartBase(p95Rows)}
                <Line dataKey={`${firstFinding.route}|p95`} name="p95" stroke="var(--color-chart-arrivals)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
              </LineChart>
            </ChartCard>
          </div>
        )}
      </RunSpecimen>
      <Specimen name="SiteScreenshots (main test: both pages; sign-up test: one)">
        <div style={{ width: '100%' }}>
          <SiteScreenshots shots={siteShots('main')} />
        </div>
      </Specimen>
      <Specimen name="ScreenshotButton (caption under the image, or as its alt text)">
        <ScreenshotButton src={modalShot.src} caption={modalShot.caption} width={modalShot.width} height={modalShot.height} className="site-screenshot" captionClassName="site-screenshot-caption" />
      </Specimen>
      <Specimen name="ScreenshotButton (image not found)">
        <ScreenshotButton src={`${modalShot.src}-missing`} caption={modalShot.caption} width={modalShot.width} height={modalShot.height} className="site-screenshot" captionClassName="site-screenshot-caption" />
      </Specimen>
      <Specimen name="ChartCard (no data)">
        <div style={{ width: '100%', maxWidth: 560 }}>
          <ChartCard title="Response time (p95)" unit="ms" legend={[{ kind: 'main', label: 'GET /signup p95' }]} empty />
        </div>
      </Specimen>
      <Specimen name="Disclosure">
        <div style={{ width: '100%' }}>
          <Disclosure label="Sample disclosure">
            <p className="muted">The content, shown while it's open.</p>
          </Disclosure>
        </div>
      </Specimen>
      <Specimen name="ScreenshotModal (opens over the page)">
        <button type="button" className="text-link" onClick={() => setModalOpen(true)}>
          Open the modal
        </button>
        {modalOpen ? <ScreenshotModal src={modalShot.src} caption={modalShot.caption} width={modalShot.width} height={modalShot.height} onClose={() => setModalOpen(false)} /> : null}
      </Specimen>
      <RunSpecimen name="AssumptionsList" status={status} ready={anyRun} empty={NO_RUNS}>
        {() => (
          <div style={{ width: '100%' }}>
            <AssumptionsList {...assumptionsFor(anyRun)} />
          </div>
        )}
      </RunSpecimen>

      <h2 className="dev-level">Organisms</h2>
      <RunSpecimen name="AiAnalysisDisclosure (main run, first finding)" status={status} ready={firstFinding} empty={NO_FINDINGS}>
        {() => (
          <div className="verdict-card" style={{ width: '100%', paddingTop: 'var(--verdict-gutter)' }}>
            <AiAnalysisDisclosure finding={firstFinding} peaks={main.findings.peaks} defaultOpen />
          </div>
        )}
      </RunSpecimen>
      <RunSpecimen name={`EvidenceDisclosure (open) · main run · cause: ${firstFinding?.cause?.kind ?? 'none'}`} status={status} ready={firstFinding} empty={NO_FINDINGS}>
        {() => (
          <div className="verdict-card" style={{ width: '100%', paddingTop: 'var(--verdict-gutter)' }}>
            <EvidenceDisclosure finding={firstFinding} timeline={main.timeline} peaks={main.findings.peaks} defaultOpen />
          </div>
        )}
      </RunSpecimen>
      <RunSpecimen name={`EvidenceDisclosure (open) · sign-up run · cause: ${signupFinding?.cause?.kind ?? 'none'}`} status={status} ready={signupFinding} empty={NO_FINDINGS}>
        {() => (
          <div className="verdict-card" style={{ width: '100%', paddingTop: 'var(--verdict-gutter)' }}>
            <EvidenceDisclosure finding={signupFinding} timeline={signup.timeline} peaks={signup.findings.peaks} defaultOpen />
          </div>
        )}
      </RunSpecimen>
      {findings.length ? (
        findings.map(({ run, finding: f }) => (
          <Specimen key={run.name + f.title} name={`VerdictCard · ${run.name} · ${f.severity}`}>
            <div style={{ width: '100%' }}>
              <VerdictCard finding={f} timeline={run.timeline} routeContext={run.routeContext} peaks={run.findings?.peaks} />
            </div>
          </Specimen>
        ))
      ) : (
        <RunSpecimen name="VerdictCard" status={status} empty={NO_FINDINGS} />
      )}
      {findings.length ? (
        findings.map(({ run, finding: f }) => (
          <Specimen key={'short' + run.name + f.title} name={`FindingCard (short, until →) · ${run.name} · ${f.severity}`}>
            <div style={{ width: 430 }}>
              <FindingCard finding={f} defaultExpanded={false} timeline={run.timeline} routeContext={run.routeContext} peaks={run.findings?.peaks} />
            </div>
          </Specimen>
        ))
      ) : (
        <RunSpecimen name="FindingCard" status={status} empty={NO_FINDINGS} />
      )}
      <RunSpecimen name="AllClearCard (newest run with no findings)" status={status} ready={clear?.findings.all_clear} empty="No run came back all clear, so there’s nothing to show here.">
        {() => (
          <div style={{ width: '100%' }}>
            <AllClearCard allClear={clear.findings.all_clear} dateLabel={runs.find((r) => r.name === clear.name)?.date_label} commit={clear.runInfo?.git?.commit} />
          </div>
        )}
      </RunSpecimen>
      <RunSpecimen name={`HealthyRoutes${healthyRun ? ` · ${healthyRun.name}` : ''}`} status={status} ready={healthyRun} empty="This run has no healthy routes to show.">
        {() => (
          <div style={{ width: '100%' }}>
            <HealthyRoutes healthyRoutes={healthyRun.findings.healthyRoutes} upTo={healthyRun.findings.healthy_up_to} timeline={healthyRun.timeline} routeContext={healthyRun.routeContext} />
          </div>
        )}
      </RunSpecimen>
      <RunSpecimen name="Funnel" status={status} ready={anyRun?.findings.funnel} empty={NO_RUNS}>
        {() => (
          <div style={{ width: '100%' }}>
            <Funnel funnel={anyRun.findings.funnel} />
          </div>
        )}
      </RunSpecimen>

      <h2 className="dev-level">Page parts</h2>
      <RunSpecimen name="SummaryStrip (open)" status={status} ready={anyRun} empty={NO_RUNS}>
        {() => (
          <div className="app-frame" style={{ width: '100%', margin: 0 }}>
            <SummaryStrip run={anyRun} defaultOpen />
          </div>
        )}
      </RunSpecimen>
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
      {jumps.backButton}
    </JumpContext.Provider>
  );
}

const TABS = [
  { key: 'tomorrow', label: 'Tomorrow site', Content: SiteComponents },
  { key: 'dashboard', label: 'Dashboard', Content: DashboardComponents },
  { key: 'tokens', label: 'Tokens', Content: TokensTab },
];

export default function ComponentsPage() {
  const [current, setCurrent] = useState(() => {
    const asked = new URLSearchParams(window.location.search).get('tab');
    return TABS.some((t) => t.key === asked) ? asked : TABS[0].key;
  });
  // A tab's content loads the first time it's opened, then stays as it was
  const [opened, setOpened] = useState(() => new Set([current]));

  function select(key) {
    setCurrent(key);
    setOpened((was) => new Set(was).add(key));
    const url = new URL(window.location.href);
    if (key === TABS[0].key) url.searchParams.delete('tab');
    else url.searchParams.set('tab', key);
    window.history.replaceState(null, '', url);
  }

  function onKey(event) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const index = TABS.findIndex((t) => t.key === current);
    const next = TABS[(index + step + TABS.length) % TABS.length];
    select(next.key);
    document.getElementById(`components-tab-${next.key}`)?.focus();
  }

  return (
    <div className="dev-components">
      <h1>Components</h1>
      <div className="dev-tabs" role="tablist" aria-label="Which components to show" onKeyDown={onKey}>
        {TABS.map((t) => (
          <button
            key={t.key}
            id={`components-tab-${t.key}`}
            type="button"
            role="tab"
            aria-selected={t.key === current}
            aria-controls={`components-panel-${t.key}`}
            tabIndex={t.key === current ? 0 : -1}
            className={`dev-tab${t.key === current ? ' is-active' : ''}`}
            onClick={() => select(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {TABS.map(({ key, Content }) => (
        <div key={key} id={`components-panel-${key}`} role="tabpanel" aria-labelledby={`components-tab-${key}`} hidden={key !== current}>
          {opened.has(key) ? <Content /> : null}
        </div>
      ))}
    </div>
  );
}
