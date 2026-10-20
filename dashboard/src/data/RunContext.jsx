// Provides the run list and the selected run to every component: useRun().
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadRun, loadRunIndex } from './api.js';

const RunContext = createContext(null);

export function RunProvider({ children }) {
  const [runs, setRuns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showSuperseded, setShowSuperseded] = useState(false);
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load the index; by default pick the newest run that isn't superseded
  useEffect(() => {
    loadRunIndex()
      .then((index) => {
        setRuns(index);
        // ?run=<name> in the address picks a run, e.g. for a shared link
        const fromUrl = new URLSearchParams(window.location.search).get('run');
        const wanted = index.find((r) => r.name === fromUrl);
        if (wanted?.superseded) setShowSuperseded(true);
        // No run is chosen by default: the page waits for one to be selected
        if (wanted) setSelected(wanted.name);
        else setLoading(false);
      })
      .catch(setError);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    loadRun(selected)
      .then((data) => {
        setRun(data);
        setError(null);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [selected]);

  const value = useMemo(
    () => ({
      runs,
      visibleRuns: showSuperseded ? runs : runs.filter((r) => !r.superseded),
      selected,
      selectRun: setSelected,
      showSuperseded,
      setShowSuperseded,
      run,
      loading,
      error,
    }),
    [runs, selected, showSuperseded, run, loading, error]
  );
  return <RunContext.Provider value={value}>{children}</RunContext.Provider>;
}

export function useRun() {
  const value = useContext(RunContext);
  if (!value) throw new Error('useRun() must be used inside <RunProvider>');
  return value;
}
