// Loads recorded runs from public/data (written by npm run data).
const base = `${import.meta.env.BASE_URL}data`;

async function getJson(path) {
  const res = await fetch(`${base}/${path}`);
  if (!res.ok) throw new Error(`Couldn't load ${path} (${res.status}). Did you run npm run data?`);
  return res.json();
}

export const loadRunIndex = () => getJson('runs.json');

// Everything the dashboard needs for one run
export async function loadRun(name) {
  const [findings, timeline, runInfo, config, routeContext] = await Promise.all([
    getJson(`runs/${name}/findings.json`),
    getJson(`runs/${name}/timeline.json`),
    getJson(`runs/${name}/run.json`).catch(() => null),
    getJson(`runs/${name}/test-config.json`).catch(() => null),
    getJson(`runs/${name}/route-context.json`).catch(() => null),
  ]);
  return { name, findings, timeline, runInfo, config, routeContext };
}

export const imageUrl = (file) => `${base}/images/${file}`;
