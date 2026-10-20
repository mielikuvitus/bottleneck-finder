// Picks the run to show (Figma: Run picker / open). A button that opens a list
// of runs, following the ARIA listbox pattern: Enter, Space or the arrow keys
// open it; arrows move; Enter or Space selects; Esc or a click outside closes.
import { useEffect, useId, useRef, useState } from 'react';
import { DESCRIPTIONS, titleOf } from '../../data/runLabels.js';

// Choosing a run shows the skeleton while it loads, which removes the picker
// for a moment; this puts keyboard focus back on it afterwards
let refocusAfterLoad = false;

// How long the switch and the superseded runs animate: keep in step with
// --duration-switch in tokens.css
const SWITCH_MS = 240;

export default function RunPicker({ runs, selected, onSelect, showSuperseded, onToggleSuperseded }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [usingKeyboard, setUsingKeyboard] = useState(false);
  // "in" or "out" for a moment after the switch is used, so superseded runs
  // grow in or shrink away instead of jumping (matches --duration-switch)
  const [motion, setMotion] = useState(null);
  const motionTimer = useRef(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const id = useId();

  // Superseded runs only when the switch is on (the selected run always shows)
  // (while they shrink away after switching off, they're still shown)
  const options = runs.filter((r) => showSuperseded || motion === 'out' || !r.superseded || r.name === selected);
  const current = runs.find((r) => r.name === selected);

  useEffect(() => {
    if (refocusAfterLoad) {
      refocusAfterLoad = false;
      buttonRef.current?.focus();
    }
  }, []);

  // Close on a click outside
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function openList() {
    const index = options.findIndex((r) => r.name === selected);
    setActive(index >= 0 ? index : 0);
    setOpen(true);
    requestAnimationFrame(() => listRef.current?.focus());
  }

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function choose(run) {
    if (run.name !== selected) refocusAfterLoad = true;
    onSelect(run.name);
    close();
  }

  function onButtonKey(e) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      setUsingKeyboard(true);
      openList();
    }
  }

  function onListKey(e) {
    setUsingKeyboard(true);
    if (e.key === 'ArrowDown') setActive((i) => Math.min(options.length - 1, i + 1));
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(options.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') options[active] && choose(options[active]);
    else if (e.key === 'Escape') close();
    else return;
    e.preventDefault();
  }

  // Close when focus leaves the whole picker (e.g. tabbing past the switch)
  function onBlur(e) {
    if (open && !rootRef.current?.contains(e.relatedTarget)) setOpen(false);
  }

  return (
    <div className="run-picker" ref={rootRef} onBlur={onBlur}>
      <button
        ref={buttonRef}
        type="button"
        className={`run-selector run-picker-control${open ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => {
          setUsingKeyboard(false);
          if (open) close();
          else openList();
        }}
        onKeyDown={onButtonKey}
      >
        {current ? (
          <span className="run-picker-current">
            <span className="run-picker-current-title">
              {titleOf(current)}
            </span>
            <span className="run-picker-current-date">{current.date_label}</span>
          </span>
        ) : (
          <span className="run-selector-label">Select a run</span>
        )}
        <span className={`run-selector-chevron${open ? ' is-up' : ''}`} aria-hidden="true" />
      </button>

      {open ? (
        <div className="run-picker-popover">
          <ul
            ref={listRef}
            id={`${id}-list`}
            className={`run-picker-options${usingKeyboard ? ' is-keyboard' : ''}`}
            role="listbox"
            tabIndex={-1}
            aria-label="Runs"
            aria-activedescendant={options[active] ? `${id}-${active}` : undefined}
            onKeyDown={onListKey}
          >
            {options.map((run, i) => {
              const isSelected = run.name === selected;
              return (
                <li
                  key={run.name}
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  className={[
                    'run-option',
                    isSelected ? 'is-selected' : '',
                    run.superseded ? 'is-superseded' : '',
                    run.superseded && run.name !== selected && motion === 'in' ? 'is-entering' : '',
                    run.superseded && run.name !== selected && motion === 'out' ? 'is-leaving' : '',
                    i === active ? 'is-active' : '',
                  ].join(' ')}
                  onMouseEnter={() => {
                    setUsingKeyboard(false);
                    setActive(i);
                  }}
                  onClick={() => choose(run)}
                >
                  <span className="run-option-title-row">
                    <span className="run-option-title">{titleOf(run)}</span>
                    {run.superseded ? (
                      <span className="run-option-superseded">Superseded</span>
                    ) : run.variant === 'after' ? (
                      <span className="run-option-fixes">Fixes applied</span>
                    ) : isSelected ? (
                      <span className="run-option-check" aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                  </span>
                  {DESCRIPTIONS[run.test] ? <span className="run-option-description">{DESCRIPTIONS[run.test]}</span> : null}
                  <span className="run-option-date">{run.date_label}</span>
                </li>
              );
            })}
          </ul>
          <div className="run-picker-setting">
            <span id={`${id}-switch`}>Show superseded runs</span>
            <button
              type="button"
              role="switch"
              aria-checked={showSuperseded}
              aria-labelledby={`${id}-switch`}
              className={`switch${showSuperseded ? ' is-on' : ''}`}
              onClick={() => {
                clearTimeout(motionTimer.current);
                setMotion(showSuperseded ? 'out' : 'in');
                motionTimer.current = setTimeout(() => setMotion(null), SWITCH_MS + 50);
                onToggleSuperseded(!showSuperseded);
              }}
            >
              <span className="switch-thumb" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
