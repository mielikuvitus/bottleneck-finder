// Which organism (or page part) each atom and molecule is used in, for the
// "Used in" links on the components page's Dashboard tab. Worked out from the
// components' own imports and the order of this page's specimens, so it can't
// go out of date (a component uses another directly, or through an atom or
// molecule).
import pageSource from './ComponentsPage.jsx?raw';

const SOURCES = import.meta.glob('../components/*/*.jsx', { query: '?raw', import: 'default', eager: true });

// name → { level, imports }
const COMPONENTS = new Map(
  Object.entries(SOURCES).map(([path, text]) => {
    const [, level, name] = path.match(/components\/(\w+)\/(\w+)\.jsx$/);
    const imports = new Set([...text.matchAll(/from ['"]\.{1,2}\/(?:\w+\/)?(\w+)\.jsx['"]/g)].map((match) => match[1]));
    return [name, { level, imports }];
  })
);

// Handed over as a prop rather than imported: the dashboard page gives the run
// picker to EmptyReport
const PASSED_TO = { RunPicker: ['EmptyReport'] };

// The specimens in page order, by their first word
const ORDER = [...new Set([...pageSource.matchAll(/Specimen name=[\s"'{`]+(\w+)/g)].map((match) => match[1]))];

function usersOf(name, found = new Set()) {
  for (const [other, { level, imports }] of COMPONENTS) {
    if (!imports.has(name) || found.has(other)) continue;
    found.add(other);
    if (level === 'atoms' || level === 'molecules') usersOf(other, found);
  }
  (PASSED_TO[name] ?? []).forEach((user) => found.add(user));
  return found;
}

// Atoms and molecules link to the first organism using them, else the first
// page part. Organisms link only to a page part using them (AssumptionsList, in
// the test details); page parts have no link.
export function usedIn(name) {
  const level = COMPONENTS.get(name)?.level;
  if (level !== 'atoms' && level !== 'molecules' && level !== 'organisms') return null;
  const users = usersOf(name);
  const first = (userLevel) => ORDER.find((specimen) => users.has(specimen) && COMPONENTS.get(specimen)?.level === userLevel);
  return (level === 'organisms' ? null : first('organisms')) ?? first('page') ?? null;
}
