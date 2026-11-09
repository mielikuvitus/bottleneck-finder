// The shapes of the data components receive, for editor hints (JSDoc). Only
// the fields the components use; REFERENCE.md describes the analyser's whole
// output. Nothing here runs: components refer to these with
// import('../../data/types.js').Name.

/** @typedef {'critical' | 'high' | 'medium' | 'low' | 'info'} Severity */
/** @typedef {'high' | 'medium' | 'low'} Confidence */
/** @typedef {'safe' | 'caution' | 'soon' | 'now'} WaitVariant */

/**
 * What a chart legend mark means: the chart's main series (a solid navy line),
 * success (a shaded green area), the second series in what filled up (a
 * shaded red area), any further cause (a dashed red line), visitors who left
 * (a solid block), fallbacks (a hatched block), and the knee, capacity and
 * campaign marks.
 * @typedef {'main' | 'success' | 'second' | 'other-cause' | 'left' | 'fallback' | 'knee' | 'capacity' | 'campaign'} LegendKind
 */

/** @typedef {{ kind: LegendKind, label: string }} LegendItem */

/**
 * One entry of runs.json (written by npm run dashboard:data)
 * @typedef {object} RunSummary
 * @property {string} name  the run's folder, e.g. "2026-10-19_000132-main"
 * @property {'main' | 'signup'} test
 * @property {string} date_label  e.g. "19 Oct 2026 · 00:01 BST"
 * @property {'before' | 'after'} variant  "after": made after the Day 5 fixes
 * @property {boolean} superseded
 * @property {number} findings  how many findings it has
 */

/**
 * finding.load_levels: how much traffic the route carries, against both peaks
 * @typedef {object} LoadLevels
 * @property {number} handles_visitors
 * @property {string} handles_what  e.g. "visitors at once"
 * @property {number} handles_requests_per_second
 * @property {{ name: string, visitors: number, fits: boolean | null, note: string | null }[]} levels
 */

/**
 * finding.customer_view: what visitors saw
 * @typedef {object} CustomerViewInfo
 * @property {string} route  picks the screenshots
 * @property {string} [shown_on]  the page address, e.g. "/"
 * @property {'normal' | 'slow' | 'fallback'} [state]  what most visitors saw
 * @property {string} [caption]
 */

/**
 * One finding of findings.json, after normalizeFindings (src/data/findings.js)
 * @typedef {object} Finding
 * @property {string} title
 * @property {string} headline  what visitors experienced
 * @property {string} route  e.g. "GET /api/rates"
 * @property {Severity} severity
 * @property {Confidence} confidence
 * @property {string} [confidence_reason]
 * @property {string} can_wait_title  e.g. "Fix before campaign"
 * @property {string} can_wait  the sentence under it
 * @property {LoadLevels} [load_levels]  missing when there's no break point
 * @property {CustomerViewInfo} [customer_view]
 * @property {string[]} suggested_fixes
 * @property {{ cause: string, share: number, fixes: string[] }[]} [suggested_fix_groups]  when several causes share the blame
 * @property {string} [evidence_summary]
 * @property {string[]} evidence
 */

/**
 * A screenshot, ready to show (from src/data/screenshots.js)
 * @typedef {object} Screenshot
 * @property {string} src  the image's address
 * @property {string} caption
 */

/**
 * One tab of the customer view: a state that has a screenshot
 * @typedef {Screenshot & { key: 'normal' | 'slow' | 'fallback', label: string }} ScreenshotState
 */

/**
 * test-config.json's traffic values: numbers (or null: measured from the run),
 * with _labels giving each one's { label, unit? }
 * @typedef {Record<string, any>} TestConfig
 */

/**
 * One route's entry in route-context.json
 * @typedef {object} RouteInfo
 * @property {string} powers  what it powers, e.g. "The homepage"
 * @property {number} [timeout_ms]  the site's own timeout
 * @property {'left' | 'degraded'} on_failure  what the visitor does if it fails
 * @property {boolean} critical
 */

/**
 * The AI's reply, in the shape of OUTPUT_SCHEMA (src/data/aiContract.js)
 * @typedef {object} AiReply
 * @property {string} summary
 * @property {{ step: string, reason: string }[]} check_first
 * @property {{ fix: string, reason: string, source: 'analyser' | 'added' }[]} ranked_fixes
 */

/** @typedef {{ id: string, name: string }} Model */

export {};
