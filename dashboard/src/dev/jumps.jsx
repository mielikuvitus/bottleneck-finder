// Clicking an atom or molecule on the components page goes to the first place
// it's used, with a "Back" button to return. Each specimen says what it is in
// data-component, and each tab finds targets only inside its own panel.
import { createContext, useState } from 'react';

export const JumpContext = createContext(null);

// Clicks on these keep their own job (a tab, a menu, a text box)
export const INTERACTIVE = 'a, button, input, select, textarea, label, summary, dialog, [role="tab"]';

function reveal(el) {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  // Removing the class first restarts the highlight on a second visit
  el.classList.remove('is-jump-target');
  void el.offsetWidth;
  el.classList.add('is-jump-target');
  el.focus({ preventScroll: true });
}

export function useJumps() {
  const [back, setBack] = useState(null); // { el, label } to return to

  function jumpTo(fromEl, label, target) {
    const panel = fromEl.closest('[role="tabpanel"]');
    const targetEl = [...panel.querySelectorAll('[data-component]')].find((el) => el.dataset.component === target);
    if (!targetEl) return;
    setBack({ el: fromEl, label });
    reveal(targetEl);
  }

  const backButton = back ? (
    <button
      type="button"
      className="dev-back"
      onClick={() => {
        reveal(back.el);
        setBack(null);
      }}
    >
      ← Back to {back.label}
    </button>
  ) : null;

  return { jumpTo, backButton };
}

// Says at the top of each tab that the pieces can be clicked
export function JumpHint() {
  return (
    <p className="dev-jump-hint">
      <span className="dev-jump-hint-mark" aria-hidden="true">
        ↓
      </span>
      <span>
        <strong>Click any atom or molecule</strong> to jump to where it’s used.
      </span>
    </p>
  );
}

// The visible, keyboard-friendly way to make the same jump as clicking the piece
export function UsedInLink({ target, onClick }) {
  return (
    <button type="button" className="dev-used-in" onClick={onClick}>
      Used in {target} <span aria-hidden="true">→</span>
    </button>
  );
}
