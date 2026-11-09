import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/skeleton.css';
import './styles/run-picker.css';
import './styles/atoms.css';
import './styles/verdict-card.css';
import './styles/ai-analysis.css';
import './styles/summary.css';
import { RunProvider } from './data/RunContext.jsx';
import DashboardPage from './components/page/DashboardPage.jsx';

const root = createRoot(document.getElementById('root'));

// The dashboard has two addresses, /monzo/dashboard/ and /components under it.
// Any other path under it (e.g. /monzo/dashboard/monzo, which the server answers
// with this page too) is swapped for the first, keeping ?run=…
const base = import.meta.env.BASE_URL;
const isComponentsPage = window.location.pathname.replace(/\/$/, '') === `${base}components`;
if (window.location.pathname !== base && !isComponentsPage) {
  window.history.replaceState(null, '', base + window.location.search + window.location.hash);
}

// /monzo/dashboard/components: every component on one page. It's imported only
// when opened, so the dashboard doesn't load it.
if (isComponentsPage) {
  document.title = 'Components · Bottleneck finder';
  Promise.all([import('./dev/ComponentsPage.jsx'), import('./styles/dev.css')]).then(([{ default: ComponentsPage }]) =>
    root.render(
      <StrictMode>
        <ComponentsPage />
      </StrictMode>
    )
  );
} else {
  root.render(
    <StrictMode>
      <RunProvider>
        <DashboardPage />
      </RunProvider>
    </StrictMode>
  );
}
