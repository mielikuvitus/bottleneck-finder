// findings.json in the shape the components expect. The analyser writes
// schema_version; files from before it existed have none, so they count as
// version 0. Older shapes are converted here, in one place, so the components
// can rely on the current fields.

// The newest version this dashboard understands
export const SCHEMA_VERSION = 1;

/**
 * @param {Record<string, any>} raw  findings.json as loaded
 * @returns {Record<string, any>} the same, with every field the components use present
 */
export function normalizeFindings(raw) {
  const version = raw.schema_version ?? 0;
  if (version > SCHEMA_VERSION) {
    throw new Error(`This run's findings.json has schema version ${version}, but the dashboard only understands up to ${SCHEMA_VERSION}. Update the dashboard.`);
  }
  return {
    ...raw,
    schema_version: version,
    // Version 0: a healthy route could have only its note (the whole sentence)
    healthyRoutes: (raw.healthyRoutes ?? []).map((healthy) => ({ ...healthy, p95: healthy.p95 ?? null })),
    findings: raw.findings.map((finding) => ({
      ...finding,
      // Version 0: a finding could have only its title, and one suggested_fix
      headline: finding.headline ?? finding.title,
      suggested_fixes: finding.suggested_fixes ?? (finding.suggested_fix ? [finding.suggested_fix] : []),
    })),
  };
}
