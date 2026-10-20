// The AI's reply (AI analysis panel), in the shape of OUTPUT_SCHEMA
// (src/data/aiContract.js): a summary, "Check first" steps, then the fixes
// most recommended first, each with its reason and "Added by AI" when the
// analyser didn't suggest it. With typing, it appears one word at a time, like
// a chat answer.
import { useEffect, useState } from 'react';
import Icon from '../atoms/Icon.jsx';

const WORD_MS = 18; // one word every 18ms

const CHECK_TITLE = 'Check first';
const FIXES_TITLE = 'Fixes, most recommended first';

// Every piece of text in reading order, so the typing can go through them
const pieces = (r) => [
  r.summary,
  ...(r.check_first.length ? [CHECK_TITLE, ...r.check_first.flatMap((c) => [c.step, c.reason])] : []),
  FIXES_TITLE,
  ...r.ranked_fixes.flatMap((f) => [f.fix, f.reason]),
];
const wordCount = (text) => text.split(' ').length;

export default function AiResponse({ response, modelName, typing = false }) {
  const total = pieces(response).reduce((n, text) => n + wordCount(text), 0);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [shown, setShown] = useState(typing && !reduceMotion ? 0 : total);

  const done = shown >= total;

  useEffect(() => {
    if (done) return undefined;
    const timer = setInterval(() => setShown((n) => Math.min(n + 1, total)), WORD_MS);
    return () => clearInterval(timer);
  }, [done, total]);

  // Takes the next words of the budget: the text so far, or null when none of
  // it is shown yet
  let budget = shown;
  const take = (text) => {
    const words = text.split(' ');
    const n = Math.max(0, Math.min(words.length, budget));
    budget -= words.length;
    return n ? words.slice(0, n).join(' ') : null;
  };

  const summary = take(response.summary);
  const checkTitle = response.check_first.length ? take(CHECK_TITLE) : null;
  const checks = response.check_first.map((c) => ({ step: take(c.step), reason: take(c.reason) }));
  const fixesTitle = take(FIXES_TITLE);
  const fixes = response.ranked_fixes.map((f) => ({ fix: take(f.fix), reason: take(f.reason), added: f.source === 'added' }));

  return (
    <div className="ai-response" aria-live="polite" aria-busy={!done}>
      <p className="ai-response-model">
        <Icon name="autoAwesome" size={16} />
        {modelName}
      </p>
      {summary ? <p className="ai-response-summary">{summary}</p> : null}

      {checkTitle ? (
        <div className="ai-response-section">
          <h5 className="verdict-fix-title">{checkTitle}</h5>
          <ul className="ai-response-list">
            {checks.map((c, i) =>
              c.step ? (
                <li key={i}>
                  <span className="ai-response-item">{c.step}</span>
                  {c.reason ? <span className="ai-response-reason">{c.reason}</span> : null}
                </li>
              ) : null
            )}
          </ul>
        </div>
      ) : null}

      {fixesTitle ? (
        <div className="ai-response-section">
          <h5 className="verdict-fix-title">{fixesTitle}</h5>
          <ol className="ai-response-list">
            {fixes.map((f, i) =>
              f.fix ? (
                <li key={i}>
                  <span className="ai-response-item">
                    {f.fix}
                    {f.added ? <span className="ai-response-added">Added by AI</span> : null}
                  </span>
                  {f.reason ? <span className="ai-response-reason">{f.reason}</span> : null}
                </li>
              ) : null
            )}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
