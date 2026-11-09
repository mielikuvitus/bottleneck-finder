// The components page's Tomorrow tab: pieces of the bank site, taken from its
// real pages (npm run data copies them to public/data/site). Each piece sits in
// a Shadow DOM, because the site and the dashboard both style elements like p,
// a and :root, and those rules would clash on one page.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SPECIMEN_CSS, SPECIMENS } from './siteSpecimens.js';
import { JumpHint, UsedInLink, useJumps } from './jumps.jsx';

const SITE = `${import.meta.env.BASE_URL}data/site`;
const iconUrl = (file) => `${SITE}/icons/${file}`;

async function fetchOk(file) {
  const res = await fetch(`${SITE}/${file}`);
  if (!res.ok) throw new Error(`Couldn't load the site's ${file} (${res.status}). Run npm run build in the project root, then npm run data.`);
  return res;
}

async function loadSite() {
  const [homeHtml, signupHtml, css, manifest] = await Promise.all([
    fetchOk('home.html').then((r) => r.text()),
    fetchOk('signup.html').then((r) => r.text()),
    fetchOk('styles.css').then((r) => r.text()),
    fetchOk('manifest.json').then((r) => r.json()),
  ]);
  const parser = new DOMParser();
  const pages = {
    home: parser.parseFromString(homeHtml, 'text/html'),
    signup: parser.parseFromString(signupHtml, 'text/html'),
  };
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css.replaceAll(':root', ':host') + SPECIMEN_CSS);
  return { pages, sheet, manifest };
}

function specimenHtml(specimen, { pages, manifest }) {
  const pick = (page, selector) => {
    const found = pages[page].querySelector(selector);
    if (!found) throw new Error(`Couldn't find ${selector} on the ${page} page.`);
    return found.outerHTML.replaceAll('src="/icons/', `src="${SITE}/icons/`);
  };
  return specimen.build
    ? specimen.build({ pick, manifest, iconUrl })
    : specimen.pick.map(([page, selector]) => pick(page, selector)).join('');
}

const ORGANISMS = SPECIMENS.filter((s) => s.level === 'Organisms');

// The first organism a piece is used in, found on the real pages: the organism
// whose element contains the piece's element. So it can't go out of date.
function usedInFor(specimen, { pages }) {
  if (specimen.usedIn) return specimen.usedIn;
  if (specimen.level === 'Organisms' || !specimen.pick) return null;
  const pieces = specimen.pick.map(([page, selector]) => [page, pages[page].querySelector(selector)]);
  const found = ORGANISMS.find((organism) =>
    (organism.pick ?? []).some(([page, selector]) => {
      const root = pages[page].querySelector(selector);
      return root && pieces.some(([piecePage, el]) => piecePage === page && el && root.contains(el));
    })
  );
  return found?.name ?? null;
}

// The first organism showing an icon file
const organismWithIcon = (file, site) => ORGANISMS.find((organism) => specimenHtml(organism, site).includes(`/icons/${file}`))?.name ?? null;

function Piece({ specimen, site, onActivate }) {
  const hostRef = useRef(null);
  const activateRef = useRef(onActivate);
  useEffect(() => {
    activateRef.current = onActivate;
  });
  let html = null;
  let error = null;
  try {
    html = specimenHtml(specimen, site);
  } catch (err) {
    error = err.message;
  }

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [site.sheet];

    const classes = ['spec'];
    if (specimen.full) classes.push('spec-full');
    if (specimen.stacked) classes.push('spec-stacked');
    if (specimen.dark) classes.push('spec-dark');
    if (specimen.glow) classes.push('spec-glow');
    if (specimen.standalone) classes.push('spec-standalone');
    if (specimen.width) classes.push('spec-limit');
    if (activateRef.current) classes.push('spec-linked');
    const style = specimen.width ? ` style="--spec-width:${specimen.width}px"` : '';
    root.innerHTML = `<div class="${classes.join(' ')}"${style}>${html}</div>`;

    // A specimen can't send anything or take anyone anywhere
    root.querySelectorAll('[name]').forEach((el) => el.removeAttribute('name'));
    const stop = (event) => {
      if (event.type === 'submit' || event.target.closest('a, button')) event.preventDefault();
      if (event.type === 'click') activateRef.current?.(event);
    };
    root.addEventListener('click', stop);
    root.addEventListener('submit', stop);
    return () => {
      root.removeEventListener('click', stop);
      root.removeEventListener('submit', stop);
    };
  }, [html, site, specimen]);

  if (error) return <p role="alert">{error}</p>;
  return <div ref={hostRef} className="dev-site-piece" />;
}

// One specimen. With variants, one version at a time and a toggle between them,
// and each version links to where that version is used.
function SiteSpecimen({ specimen, site, jumpTo }) {
  const [variant, setVariant] = useState(0);
  const cardRef = useRef(null);
  const shown = specimen.variants?.[variant] ?? specimen;
  const target = usedInFor(shown.level ? shown : { ...shown, level: specimen.level }, site);
  const hasIcons = Boolean(specimen.iconLinks);

  function activate(event) {
    if (hasIcons) {
      const file = event.target.closest('[data-icon]')?.dataset.icon;
      const iconTarget = file ? organismWithIcon(file, site) : null;
      if (iconTarget) jumpTo(cardRef.current, file.replace('.svg', ''), iconTarget);
    } else if (target) {
      jumpTo(cardRef.current, specimen.name, target);
    }
  }

  return (
    <div ref={cardRef} className={`dev-specimen${target || hasIcons ? ' is-linked' : ''}`} data-component={specimen.name} tabIndex={-1}>
      <div className="dev-specimen-head">
        <p className="dev-specimen-name">{specimen.name}</p>
        {target ? <UsedInLink target={target} onClick={() => jumpTo(cardRef.current, specimen.name, target)} /> : null}
        {hasIcons ? <p className="dev-used-in-note">Click an icon to see it in use</p> : null}
      </div>
      {specimen.variants ? (
        <div className="dev-toggle" role="group" aria-label={`${specimen.name} version`}>
          {specimen.variants.map((v, i) => (
            <button key={v.label} type="button" className="dev-toggle-option" aria-pressed={i === variant} onClick={() => setVariant(i)}>
              {v.label}
            </button>
          ))}
        </div>
      ) : null}
      <Piece specimen={shown} site={site} onActivate={target || hasIcons ? activate : undefined} />
    </div>
  );
}

export default function SiteComponents() {
  const [site, setSite] = useState(null);
  const [error, setError] = useState(null);
  const { jumpTo, backButton } = useJumps();

  useEffect(() => {
    loadSite().then(setSite).catch(setError);
  }, []);

  const levels = [...new Set(SPECIMENS.map((s) => s.level))];

  return (
    <>
      <p className="muted">Pieces of tomorrow, a fictional bank built as the load test’s target. They come from its real pages.</p>
      <JumpHint />
      {error ? <p role="alert">{error.message}</p> : null}
      {site
        ? levels.map((level) => (
            <div key={level}>
              <h2 className="dev-level">{level}</h2>
              {SPECIMENS.filter((s) => s.level === level).map((specimen) => (
                <SiteSpecimen key={specimen.name} specimen={specimen} site={site} jumpTo={jumpTo} />
              ))}
            </div>
          ))
        : null}
      {backButton}
    </>
  );
}
