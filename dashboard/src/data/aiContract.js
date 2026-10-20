// The planned LLM layer (designed, not connected): what would be sent for one
// finding and what should come back. Nothing here calls a model; the dashboard
// shows the prompt and a canned reply (cannedAiResponses.json) in the
// "AI analysis for the suggested fixes" panel.

// The attachment's name in the prompt box
export const ATTACHMENT_NAME = 'findings.json';

// The text sent with the attachment. The output schema goes separately, as
// the model's structured output format: the API then always returns JSON in
// that shape, and the dashboard renders it (AiResponse), so the prompt
// doesn't ask for JSON.
export const PROMPT_TEMPLATE = `You're helping a team decide what to fix after a load test of their website.

The attached findings.json describes one problem the analyser found: what visitors experienced, the measured numbers, the likely cause and the analyser's suggested fixes. The fixes are in no particular order, and some of them are checks that confirm the cause.

1. Separate the steps that only check or confirm the cause (for example profiling or EXPLAIN QUERY PLAN) from the fixes, and list them under "Check first".
2. Rank the fixes, most recommended first. Give one sentence per fix on why it's in that place, using the numbers in the file.
3. Add any fixes you think are missing, and mark them as added.

Use only the numbers in the file and don't invent measurements.`;

// What the model must return
export const OUTPUT_SCHEMA = {
  type: 'object',
  required: ['summary', 'check_first', 'ranked_fixes'],
  additionalProperties: false,
  properties: {
    summary: { type: 'string', description: 'One or two sentences: what to do first and why' },
    check_first: {
      type: 'array',
      description: 'Steps that check or confirm the cause',
      items: {
        type: 'object',
        required: ['step', 'reason'],
        additionalProperties: false,
        properties: { step: { type: 'string' }, reason: { type: 'string' } },
      },
    },
    ranked_fixes: {
      type: 'array',
      description: 'Fixes, most recommended first',
      items: {
        type: 'object',
        required: ['fix', 'reason', 'source'],
        additionalProperties: false,
        properties: {
          fix: { type: 'string' },
          reason: { type: 'string', description: 'Why it has this place in the ranking' },
          source: { enum: ['analyser', 'added'], description: '"added" when the analyser didn\'t suggest it' },
        },
      },
    },
  },
};

// The attachment: a compact summary of one finding (no timeline data)
export function buildAiInput(finding, peaks) {
  const { cause = {} } = finding;
  return {
    finding: {
      headline: finding.headline,
      route: finding.route,
      severity: finding.severity,
      confidence: finding.confidence,
      confidence_reason: finding.confidence_reason,
      cause: { kind: cause.kind, name: cause.name, label: cause.label, contributors: cause.contributors },
      likely_cause: finding.likely_cause,
      can_wait: finding.can_wait,
      knee_at: finding.knee_at,
      capacity: finding.capacity,
      load_levels: finding.load_levels,
      evidence_summary: finding.evidence_summary,
      evidence: finding.evidence,
      suggested_fixes: finding.suggested_fix_groups ? undefined : finding.suggested_fixes,
      suggested_fix_groups: finding.suggested_fix_groups,
    },
    peaks,
  };
}

// The attachment's size, e.g. "4 KB"
export function attachmentSize(input) {
  const bytes = new Blob([JSON.stringify(input, null, 2)]).size;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// The model picker (only changes the name on the reply). Names are examples.
export const MODELS = [
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5' },
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5' },
  { id: 'gpt-5', name: 'GPT-5' },
  { id: 'gemini-2-5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'deepseek-v3-1', name: 'DeepSeek V3.1' },
  { id: 'llama-4-maverick', name: 'Llama 4 Maverick' },
  { id: 'gpt-oss-120b', name: 'gpt-oss-120b' },
];

// A finding's canned reply is keyed by its cause, e.g. "pool:cms", so
// re-analysing a run keeps the link
export const cannedKey = (finding) => `${finding.cause?.kind}:${finding.cause?.name}`;
