// The components page's Tokens tab: every design token, read from
// public/tokens.css (shared by the bank site and the dashboard), grouped by
// name, and which of the two uses it, worked out from their real styles so it
// can't go out of date.
import { useEffect, useMemo, useState } from 'react';
import tokensCss from '../../../public/tokens.css?raw';

// The dashboard's styles and components, as text
const DASHBOARD_SOURCES = Object.values(import.meta.glob(['../styles/*.css', '../components/**/*.jsx'], { query: '?raw', import: 'default', eager: true }));
const SITE_CSS = `${import.meta.env.BASE_URL}data/site/styles.css`;

const tokensIn = (text) => [...text.matchAll(/var\((--[\w-]+)/g)].map((match) => match[1]);

// The tokens some styles use: directly, or through a token that refers to
// another (--color-brand uses --palette-red-500)
function usedBy(sources, values) {
  const used = new Set();
  const visit = (name) => {
    if (used.has(name)) return;
    used.add(name);
    tokensIn(values.get(name) ?? '').forEach(visit);
  };
  sources.forEach((text) => tokensIn(text).forEach(visit));
  return used;
}

// The groups, in order. A token goes in the first group whose prefix its name
// starts with; any other goes under "Other".
const GROUPS = [
  { name: 'Palette', prefixes: ['--palette'] },
  {
    name: 'Can it wait?',
    description:
      'The callout on each finding that says how soon it needs fixing. It has four looks, picked from the finding\'s severity: safe (green), caution (amber), soon (pale red) and now (coral).',
    prefixes: ['--color-wait-'],
  },
  { name: 'Severity badges', prefixes: ['--color-severity-'] },
  { name: 'Charts', prefixes: ['--color-chart-'] },
  { name: 'Colour Variables', prefixes: ['--color-'] },
  {
    name: 'Shadows',
    description:
      'Bigger the higher something sits. sm: buttons at rest. md: buttons and cards lifted on hover, and boxes on the page. lg: only a box on top of another shadowed box. The coral ones go on coral things, or things with a coral border.',
    prefixes: ['--shadow-'],
  },
  { name: 'Focus', prefixes: ['--focus-'] },
  { name: 'Motion', prefixes: ['--duration-', '--ease-'] },
  { name: 'Spacing', prefixes: ['--space-'] },
  { name: 'Corner radius', prefixes: ['--radius-'] },
  { name: 'Type', prefixes: ['--font-', '--line-height'] },
  { name: 'Layout', prefixes: ['--page-'] },
];
// Shown in this order (Colour Variables before the colours for one component)
const ORDER = ['Palette', 'Colour Variables', 'Can it wait?', 'Severity badges', 'Charts', 'Shadows', 'Focus', 'Motion', 'Spacing', 'Corner radius', 'Type', 'Layout', 'Other'];

// Every token in tokens.css, in file order: { name, value, note }. The comment
// after a token is its note.
function readTokens(css) {
  const block = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  // [ \t] rather than \s: a note is only a comment on the token's own line
  return [...block.matchAll(/^[ \t]*(--[\w-]+):[ \t]*(.+?);[ \t]*(?:\/\*[ \t]*(.+?)[ \t]*\*\/)?[ \t]*$/gm)].map(([, name, value, note]) => ({ name, value, note: note ?? '' }));
}

function inGroups(tokens) {
  const groups = new Map(ORDER.map((name) => [name, { name, description: GROUPS.find((g) => g.name === name)?.description, tokens: [] }]));
  for (const token of tokens) {
    const group = GROUPS.find(({ prefixes }) => prefixes.some((prefix) => token.name.startsWith(prefix)))?.name ?? 'Other';
    groups.get(group).tokens.push(token);
  }
  return [...groups.values()].filter((group) => group.tokens.length);
}

function Preview({ name, value }) {
  if (/^(#|rgb)/.test(value)) return <span className="c-lib-token-swatch" style={{ background: value }} />;
  if (name.startsWith('--shadow')) return <span className="c-lib-token-box" style={{ boxShadow: value }} />;
  if (name.startsWith('--radius')) return <span className="c-lib-token-box" style={{ borderRadius: value }} />;
  if (name.startsWith('--space')) return <span className="c-lib-token-bar" style={{ width: value }} />;
  if (name.startsWith('--font-size')) return <span style={{ fontSize: value }}>Aa</span>;
  if (name.startsWith('--font-weight')) return <span style={{ fontWeight: value }}>Aa</span>;
  if (name.startsWith('--font-family')) return <span style={{ fontFamily: value }}>Aa</span>;
  if (name.startsWith('--line-height')) {
    return (
      <span className="c-lib-token-lines" style={{ lineHeight: value }}>
        Two
        <br />
        lines
      </span>
    );
  }
  return null;
}

function TokenGroup({ group, usedLabel }) {
  return (
    <>
      <h3 className="c-lib-token-group">{group.name}</h3>
      {group.description ? <p className="muted c-lib-token-description">{group.description}</p> : null}
      <div className="c-lib-token-scroll">
        <table className="c-lib-tokens">
          <thead>
            <tr>
              <th scope="col">Preview</th>
              <th scope="col">Token</th>
              <th scope="col">Value</th>
              <th scope="col">Used by</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {group.tokens.map(({ name, value, note }) => {
              const final = value.includes('var(') ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : value;
              return (
                <tr key={name}>
                  <td className="c-lib-token-preview">
                    <Preview name={name} value={final} />
                  </td>
                  <td>
                    <code>{name}</code>
                  </td>
                  <td>
                    <code>{value}</code>
                    {final !== value ? <code className="c-lib-token-final">{final}</code> : null}
                  </td>
                  <td className="c-lib-token-used">{usedLabel(name)}</td>
                  <td className="muted">{note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function TokensTab() {
  const [siteCss, setSiteCss] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(SITE_CSS)
      .then((res) => {
        if (!res.ok) throw new Error(`Couldn't load the site's styles.css (${res.status}). Run npm run build in the project root, then npm run dashboard:data.`);
        return res.text();
      })
      .then(setSiteCss)
      .catch(setError);
  }, []);

  const tokens = useMemo(() => readTokens(tokensCss), []);
  const groups = useMemo(() => inGroups(tokens), [tokens]);
  const values = useMemo(() => new Map(tokens.map((token) => [token.name, token.value])), [tokens]);
  const dashboard = useMemo(() => usedBy(DASHBOARD_SOURCES, values), [values]);
  const site = useMemo(() => (siteCss ? usedBy([siteCss], values) : null), [siteCss, values]);

  function usedLabel(name) {
    if (!site) return '…';
    const users = [dashboard.has(name) && 'Dashboard', site.has(name) && 'Tomorrow'].filter(Boolean);
    return users.length === 2 ? 'Both' : (users[0] ?? '–');
  }

  return (
    <>
      <p className="muted">
        One set of tokens for both, in <code>public/tokens.css</code>, with the comment after each as its note. "Used by" shows which of
        the two uses each one, directly or through another token.
      </p>
      {error ? <p role="alert">{error.message}</p> : null}
      {groups.map((group) => (
        <TokenGroup key={group.name} group={group} usedLabel={usedLabel} />
      ))}
    </>
  );
}
