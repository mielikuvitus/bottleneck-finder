// The components page's Tokens tab: every design token of the dashboard and the
// bank site, read from their real stylesheets so it can't go out of date.
import { useEffect, useState } from 'react';
import dashboardCss from '../styles/tokens.css?raw';

const SITE_CSS = `${import.meta.env.BASE_URL}data/site/styles.css`;

// The first :root block's tokens, in groups. A comment on its own line starts a
// group, and a second one straight after it is the group's description; a
// comment after a token is that token's note.
function parseTokens(css, firstGroup) {
  const block = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  const groups = [{ name: firstGroup, tokens: [] }];
  let afterHeading = false;
  for (const line of block.split('\n')) {
    const comment = line.match(/^\s*\/\*\s*(.+?)\s*\*\/\s*$/);
    const token = line.match(/^\s*(--[\w-]+):\s*(.+?);\s*(?:\/\*\s*(.+?)\s*\*\/)?\s*$/);
    if (comment && afterHeading) groups.at(-1).description = comment[1];
    else if (comment) groups.push({ name: comment[1], tokens: [] });
    else if (token) groups.at(-1).tokens.push({ name: token[1], value: token[2], note: token[3] });
    afterHeading = Boolean(comment) && !afterHeading;
  }
  return groups.filter((group) => group.tokens.length);
}

function Preview({ name, value }) {
  if (/^(#|rgb)/.test(value)) return <span className="dev-token-swatch" style={{ background: value }} />;
  if (name.startsWith('--shadow')) return <span className="dev-token-box" style={{ boxShadow: value }} />;
  if (name.startsWith('--radius')) return <span className="dev-token-box" style={{ borderRadius: value }} />;
  if (name.startsWith('--space')) return <span className="dev-token-bar" style={{ width: value }} />;
  if (name.startsWith('--font-size')) return <span style={{ fontSize: value }}>Aa</span>;
  if (name.startsWith('--font-weight')) return <span style={{ fontWeight: value }}>Aa</span>;
  if (name.startsWith('--font-family')) return <span style={{ fontFamily: value }}>Aa</span>;
  if (name.startsWith('--line-height')) {
    return (
      <span className="dev-token-lines" style={{ lineHeight: value }}>
        Two
        <br />
        lines
      </span>
    );
  }
  return null;
}

// resolve: the final value of a token that points at another one
function TokenGroup({ group, resolve }) {
  return (
    <>
      <h3 className="dev-token-group">{group.name}</h3>
      {group.description ? <p className="muted dev-token-description">{group.description}</p> : null}
      <div className="dev-token-scroll">
        <table className="dev-tokens">
          <thead>
            <tr>
              <th scope="col">Preview</th>
              <th scope="col">Token</th>
              <th scope="col">Value</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {group.tokens.map(({ name, value, note }) => {
              const final = resolve(name, value);
              return (
                <tr key={name}>
                  <td className="dev-token-preview">
                    <Preview name={name} value={final} />
                  </td>
                  <td>
                    <code>{name}</code>
                  </td>
                  <td>
                    <code>{value}</code>
                    {final !== value ? <code className="dev-token-final">{final}</code> : null}
                  </td>
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

const fromPage = (name, value) => (value.includes('var(') ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : value);
const asWritten = (name, value) => value;

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

  return (
    <>
      <p className="muted">Read from each stylesheet, so these are always the values in use.</p>
      <h2 className="dev-level">Dashboard</h2>
      {parseTokens(dashboardCss, 'Tokens').map((group) => (
        <TokenGroup key={group.name} group={group} resolve={fromPage} />
      ))}
      <h2 className="dev-level">Tomorrow site</h2>
      {error ? <p role="alert">{error.message}</p> : null}
      {siteCss
        ? parseTokens(siteCss, 'Colours').map((group) => <TokenGroup key={group.name} group={group} resolve={asWritten} />)
        : null}
    </>
  );
}
