# Dashboard components

To see them all at once, run `npm run dev` and open http://localhost:5173/monzo/dashboard/components
(development only).

Every component, its props, the real data fields it uses, and one example
value from the current runs: `2026-10-19_000132-main` and
`2026-10-19_001114-signup`. The components are unstyled stubs in
`src/components/`. All colours, spacing and type come from the CSS variables in
[src/styles/tokens.css](src/styles/tokens.css).

**Where the data comes from** (copied into `public/data/` by `npm run data`):

- `runs.json`: the index of runs
- `runs/<run>/findings.json`: the analyser's output, written "findings" below
- `runs/<run>/timeline.json`: one entry per second, written "timeline" below
- `runs/<run>/test-config.json`, `route-context.json`, `run.json`: the run's setup
- `images/`: screenshots, listed in [src/data/screenshots.js](src/data/screenshots.js)

Components get the selected run from `useRun()` ([src/data/RunContext.jsx](src/data/RunContext.jsx)).

---

## Loading skeleton

Shown whenever a run is loading (on first load and when switching runs): no
values or verdicts appear until the whole run is ready. Add `?skeleton` to the
address to keep it on screen. Figma: "Loading dashboard layout".

### DashboardSkeleton

| Prop | Example |
| ---- | ------- |
| `label` | `"Campaign readiness · loading…"` (the text in the run selector box) |

No data. It mirrors the loaded page: a closed test-details box, one verdict
card and the funnel, all grey bars. It uses `AppHeader`, `ProjectContext` and
`Placeholder`.

### AppHeader

No props: the tilted coral "T", "tomorrow", and "Web Performance".

### ProjectContext

| Prop | Example |
| ---- | ------- |
| `title` | `"Traffic readiness"` |
| `label` | `"Campaign readiness · loading…"`: shown as a read-only selector box when there are no `children` |
| `children` | the real `RunPicker`, once the loaded page is designed |

### EmptyReport

No props or data. Shown when no run is selected (Figma: "No run selected
layout"): the header, "Traffic readiness", the "Select a run" box and the "Choose a run to see the story." card. The dashboard
opens on this. Until the dropdown is designed, open a run with `?run=<name>` in
the address.

### Placeholder

| Prop | Example |
| ---- | ------- |
| `width` | `320` (px) or any CSS length; default `"100%"`. Never wider than its container |
| `height` | `22` |

---

## Atoms

### SeverityBadge

Figma: "Severity badges". An icon and a label, in the severity's colours.

| Prop | Field | Example |
| ---- | ----- | ------- |
| `severity` | `finding.severity` | `"high"` |

| `severity` | Label | Icon (Material Icons) | Look |
| ---------- | ----- | --------------------- | ---- |
| `critical` | Critical | `error` (filled circle with "!") | coral, `#ff4f40` border (the "Fix now" callout) |
| `high` | High | `priorityHigh` ("!") | pale red, `#ffbdb6` border (the "Fix before campaign" callout) |
| `medium` | Medium | `warningAmber` (triangle) | yellow `#faf2df` / `#8b5e17` |
| `low` | Low | `arrowDownward` | blue `#edf2f6` / `#3b6b8b` |
| `info` | Healthy | `check` | green `#edf5f0` / `#246754` |

The labels are the design's (atom text the user chose to keep). The icon is
hidden from screen readers; the label is read out.

### Icon

| Prop | Example |
| ---- | ------- |
| `name` | `"priorityHigh"`: one of `error`, `priorityHigh`, `warningAmber`, `arrowDownward`, `check` (severity badges), `checkCircle`, `visibility`, `schedule`, `bolt` (can it wait), `description`, `arrowUpward`, `autoAwesome` (AI analysis) |
| `size` | `14` (px, default) |

Google's Material Icons, copied as SVG paths into
[src/components/atoms/Icon.jsx](src/components/atoms/Icon.jsx) under the
Apache License 2.0 (notice in the file), so no MUI packages are needed. To add
an icon, copy its path data into `ICONS`. It uses the text colour
(`currentColor`).

### HeadroomComponent

| Prop | Field | Example |
| ---- | ----- | ------- |
| `headroom.break_point_visitors` | `finding.headroom.break_point_visitors` | `163` |
| `headroom.expected_pct` | `finding.headroom.expected_pct` | `48` (48% to spare) |
| `headroom.campaign_pct` | `finding.headroom.campaign_pct` | `-37` (37% over the limit) |
| `headroom.summary` | `finding.headroom.summary` | `"breaks at about 163 visitors at once: 48% to spare at expected peak (110), 37% over the limit at campaign peak (260)"` |

`headroom` is `null` when nothing broke yet (for example the slow-lookup
finding). Percentages below 0 mean over the limit.

### ConfidenceIndicator

| Prop | Field | Example |
| ---- | ----- | ------- |
| `level` | `finding.confidence`, or `finding.normal_day_confidence` | `"high"`, `"medium"` or `"low"` |

Figma: "Confidence / all three levels". Three bars of rising height, with 3,
2 or 1 filled, then "High confidence", "Medium confidence" or "Low
confidence". Change `level` and it updates. Any other value shows no filled
bars and "<value> confidence" (for example `normal_day_confidence` can be
`"none"`). The bars are hidden from screen readers; the label is read out.

Why the finding has its confidence (`finding.confidence_reason`) isn't part
of this atom: it's the first line of `EvidenceDisclosure`.

### ChartLegend

| Prop | Example |
| ---- | ------- |
| `items` | `[{ kind: "line", label: "Arrivals" }, { kind: "hatched", label: "Fallback" }]` |

Figma: "Legend & chart annotation vocabulary". A row of small SVG symbols
with labels. Kinds and colours (tokens in `tokens.css`, `--color-chart-*`):

| `kind` | Means | Looks like |
| ------ | ----- | ---------- |
| `line` | arrivals | solid navy line |
| `area` | successful | pale green shaded area with a solid green top edge |
| `area-red` | the second series in "what filled up" (e.g. requests waiting) | pale red shaded area with a solid red top edge |
| `dashed-red` | any further cause in "Server busy" (`cause.contributors`) | red dashed line, no fill |
| `block` | left | solid navy block |
| `hatched` | saw a fallback | pale red block, red hatching, dotted red outline |
| `knee` | where it broke | grey open circle |
| `capacity` | the most it served | dotted grey line |
| `campaign` | campaign peak | vertical grey line |

Also exports `HatchPattern` (`id`), the SVG `<pattern>` the fallback bars use.

---

## Molecules

### RunPicker

Figma: "Run picker / open". A button showing the selected run; it opens a list
of runs and a "Show superseded runs" switch. Keyboard: Enter, Space or the arrow
keys open it, the arrows move, Enter or Space picks, Esc closes; a click outside
also closes it.

| Prop | Field | Example |
| ---- | ----- | ------- |
| `runs` | all of `runs.json` (superseded ones are hidden unless the switch is on) | `{ "name": "2026-10-19_000132-main", "test": "main", "date_label": "19 Oct 2026 · 00:01 BST", "superseded": false, ... }` |
| `selected` | the selected run's `name`, or `null` | `"2026-10-19_000132-main"` |
| `onSelect` | – | function(name) |
| `showSuperseded`, `onToggleSuperseded` | – | `false`, function(on) |

Each option and the button show:

| Text | From | Example |
| ---- | ---- | ------- |
| Title | `test`: "Main test" or "Sign-up campaign test" (runs have no names yet) | `"Main test"` |
| Description | `test`, options only: "Testing / → /signup funnel" or "Testing /signup with assumed campaign traffic" | `"Testing / → /signup funnel"` |
| Date | `date_label`: the run's start, in the time zone of the machine it ran on | `"19 Oct 2026 · 00:01 BST"` |
| "Superseded" | `superseded` | shown in red on superseded runs |
| "Fixes applied" | `variant` | shown in green on runs made after the Day 5 fixes (`"after"`), in the same place; "Superseded" wins if a run is both |

The button shows "Select a run" until a run is chosen; the dashboard opens with
no run selected. `?run=<name>` in the address opens a run directly.

### ImpactRow

One row per level; a verdict card has three: `finding.user_impact_now`
(expected peak), `user_impact_at_campaign` and `user_impact_at_limit`.

| Prop | Field | Example (`user_impact_at_campaign`, main run) |
| ---- | ----- | ------- |
| `label` | – | `"Campaign peak"` |
| `impact.level` | `.level` | `"campaign peak (just after an ad goes live)"` |
| `impact.visitors` | `.visitors` | `260` |
| `impact.stage_used` | `.stage_used` | `"57 visits/s (planned about 265 visitors at once, measured 420)"` |
| `impact.left` | `.left` | `0` |
| `impact.degraded` | `.degraded` | `3419` |
| `impact.lost_signups` | `.lost_signups.lost`, `.attempts` | `0` of `593` |
| `impact.summary` | `.summary` | `"At about 260 visitors at once (…): 3,419 of 3,419 visits (100%) were degraded: the cards show "Couldn't load rates right now." …"` |

Also available: `.measured_visitors_at_once`, `.failures`,
`.slow_visit_share` (`0.12`), and `.routes[route]` with `p50_ms`, `p95_ms`,
`requests`, `failed`, `fallback_shown`. For a campaign scenario,
`user_impact_now` comes from the main run and also has `.source` (the main
run's name) and `.warning`.

### CanWaitCallout

Figma: "Can it wait variants". A bold title and a sentence underneath. The
look comes from `variant`; the words come from the analyser.

| Prop | Field | Example |
| ---- | ----- | ------- |
| `variant` | from `finding.severity` (below) | `"soon"` |
| `title` | `finding.can_wait_title` | `"Fix before campaign"` |
| `text` | `finding.can_wait` | `"Not past the next campaign: it copes with a normal busy hour (48% to spare), but an ad would push it 37% over its limit."` |
| `size` | – | `"regular"` (default), `"large"` (the verdict card) or `"inline"` (just the title in the variant's colour, no box; the short finding card). Inline is made of spans so it can sit in a button; `children` follow the title in the same colour. |

| `variant` | Look | Icon | Severity |
| --------- | ---- | ---- | -------- |
| `safe` | green | `checkCircle` (tick in a circle) | `low`, `info` |
| `caution` | yellow, the design's `#faf2df` / `#8b5e17` (from the severity badges) | `visibility` (an eye) | `medium` |
| `soon` | pale red | `schedule` (a clock) | `high` |
| `now` | coral, with a shadow | `bolt` (a lightning bolt) | `critical` |

The icon (not in the Figma design) says *when* to act, so it's different from
the severity badge's icons, which say how bad it is. It sits before the title
in the title's colour: 16px, 18px in `large`, 15px in `inline`.

`can_wait_title` is chosen by the analyser from why the finding got its
severity, so it only mentions a campaign when the campaign peak is the reason:
"Fix now", "Fix before campaign", "Fix before next release", "Fix before
traffic grows", "Watch closely", "Safe for now" or "Safe to wait". All wording
is placeholder, to be revisited.

### ScreenshotFrame

| Prop | Field | Example |
| ---- | ----- | ------- |
| `file` | `screenshots.js` | `"fallbacks/2-rates-fallback.png"` |
| `route` | `screenshots.js` | `"GET /api/rates"` |
| `state` | `screenshots.js` | `"fallback"` (or `normal`, `loading`, `waiting`, `timed out`, `connection failed`, `unreachable`) |
| `caption` | `screenshots.js` | `"After 3s: \"Couldn't load rates right now.\""` |

Screenshots are 2560px wide (2x). The verdict card shows the fallback states
for its `affected_routes`.

### PredictionVsMeasured

| Prop | Field | Example (main run, rates) |
| ---- | ----- | ------- |
| `fallbackPoint.timeout_seconds` | `finding.fallback_point.timeout_seconds` | `3` |
| `.predicted.starts_above` | | `"about 35/s GET /api/rates requests: any load above that leads to fallbacks if it lasts long enough"` |
| `.predicted.expected.summary` / `.campaign.summary` | also `.arrivals_rps`, `.overload_pct`, `.seconds_until_fallback` | campaign: `seconds_until_fallback: 5` |
| `.measured.summary` | | `"The arriving load first went over capacity at second 362 … timeouts became sustained … from second 401 (39s after going over) … The prediction assumes the load jumps straight to that level…"` |
| `.measured.seconds_after_load_went_over_capacity` | | `39` |
| `.measured.sustained_timeouts_from_second` | | `401` |
| `.measured.predicted_for_that_load.seconds_until_fallback` | | `10.4` (predicted for 45 visits/s) |
| `.measured.note` | | the ramp-vs-sudden-jump explanation |

`fallback_point` is `null` when there's no knee.

### ChartCard

| Prop | Example |
| ---- | ------- |
| `title` | `"Response time (p95)"` |
| `unit` | `"ms"` (shown above the y axis, in mono) |
| `legend` | `ChartLegend` items: `[{ kind: "line", label: "GET /signup p95" }]` |
| `children` | a Recharts chart |

One chart card. Also exports the shared `xAxis(rows)`, `yAxis`, `tooltip` and
`grid`. Used by `EvidenceDisclosure` and `HealthyRoutes`.

### AssumptionsList

| Prop | Field | Example |
| ---- | ----- | ------- |
| `config` | `test-config.json`: the values with a `_labels` entry (`{ label, unit? }`) | `expected_peak_visitors: 110` with `_labels.expected_peak_visitors: { label: "Busy-hour peak", unit: "visitors at once" }` |
| `routeContext` | `route-context.json[route]`: `powers`, `timeout_ms`, `on_failure`, `critical` | `"POST /api/signup": { powers: "Submitting an email to create an account", timeout_ms: 3000, on_failure: "left", critical: true }` |
| `findings` | `findings.test`, the routes in `findings.findings[]` and `findings.healthyRoutes[]` | `"signup"` |

An underlined "Show assumptions" / "Hide assumptions" link at the bottom of the
test details. Open, three compact parts, numbers in IBM Plex Mono:

1. **Traffic numbers:** a grid of the top-level labelled values, label above
   value and unit (`null` shows "measured from the run").
2. **Visitor behaviour:** the viewed test's group (`main_funnel` or
   `signup_test`) on one line: "30% go on to sign-up · 60% submit the form · …".
3. **Routes:** one row per route this run reports on: route, powers, site
   timeout, what the visitor does if it fails (`left` → leaves, `degraded` →
   carries on degraded) and critical.

Last, a muted note says where to change them: `load-tests/test-config.json`
(traffic and visitor behaviour) and `analyzer/route-context.json` (routes).

The long `_` notes and the routes' `while_slow` / `fallback` stay in the files
(the customer view shows what visitors see). Labels come from the current
`test-config.json`: `npm run data` adds its `_labels` to each run's copy, so
older runs get them too; without them, keys show as sentences.

---

### SiteScreenshots

"The test site" in the test details, above "Show assumptions": thumbnails of
the test site's pages, each opening `ScreenshotModal`. The main test shows the
homepage and the sign-up page, the sign-up test only the sign-up page. Files
and captions come from the `normal` state in `src/data/screenshots.js`
(`GET /` → `tomorrow1.png`, `GET /signup` → `tomorrow2.png`).

| Prop | Example |
| ---- | ------- |
| `test` | `findings.test`: `"main"` or `"signup"` (anything else shows nothing) |

### ScreenshotModal

Used by `SiteScreenshots` and `CustomerView` (a click on its screenshot opens
the current tab's). One screenshot, up to 90% of the window, in a native `<dialog>` over a dark
backdrop (`--color-backdrop`). Closes with the ✕ at the top right, a click
outside the image, or Esc; focus then returns to the thumbnail.

| Prop | Example |
| ---- | ------- |
| `file` | `"tomorrow1.png"` (relative to `public/data/images`) |
| `caption` | `"The homepage"` (the dialog's label and the image's alt text) |
| `onClose` | called once it has closed |

### PromptComposer

A chat-style prompt box, used by `AiAnalysisDisclosure`: a file chip for the
attachment (an icon, the name and size; not clickable), the prompt as
read-only text, the conversation (`children`, under a
divider: "Thinking…" and then the reply), and a bottom bar with the model picker
on the left and the round send
button on the right. The box keeps one height (340px): everything above the
bar scrolls, and once sent it scrolls to the bottom and follows the reply as
it types, unless the reader scrolls up. To change the prompt or the models, edit
`PROMPT_TEMPLATE` and `MODELS` in
[src/data/aiContract.js](src/data/aiContract.js).

| Prop | Example |
| ---- | ------- |
| `prompt` | `PROMPT_TEMPLATE` |
| `attachment` | `{ name: "findings.json", size: "4 KB" }` |
| `models` | `MODELS`: `[{ id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5" }, …]` |
| `model`, `onModelChange` | the picked model's `id`, and called with a new one |
| `onSend` | called by the send button |
| `children` | shown under the prompt once sent: the thinking state or `AiResponse` |
| `sendDisabled` | `true` once sent, or when there's no reply for the finding |

### AiResponse

The AI's reply, in the shape of `OUTPUT_SCHEMA`: the model's name with a
sparkle, `summary`, "Check first" (`check_first[]`: `step` and `reason`; left
out when empty), then "Fixes, most recommended first" (`ranked_fixes[]`, a
numbered list: `fix`, `reason` under it, and an "Added by AI" pill when
`source` is `"added"`). With `typing`, it appears one word every 18ms
(`WORD_MS`); all at once with reduced motion.

| Prop | Example |
| ---- | ------- |
| `response` | one entry of [src/data/cannedAiResponses.json](src/data/cannedAiResponses.json) |
| `modelName` | `"Claude Sonnet 5.5"` |
| `typing` | `true` to type it out (default `false`) |

---

## Organisms

### FindingCard

One finding, short or full. Every finding starts as the short card (Figma:
"Supporting finding"), `critical` and `high` ones with a red border (the full
`VerdictCard` keeps it),
and "→ READ MORE" opens the full card in place (keyboard focus moves to it). "READ LESS",
the last thing in the full card, closes it back to the short card (focus
returns to "→ READ MORE"). Every finding
gets it.

The short card: `SeverityBadge` and `ConfidenceIndicator`, the `headline`, a
grey line (`powers` from `route-context.json` · `customer_view.shown_on` ·
`evidence_summary`), and `CanWaitCallout size="inline"` (`can_wait_title`)
followed by "→ READ MORE" on the same line, in its colour (the button: the text is "Read more", capitals come from CSS).

| Prop | Example |
| ---- | ------- |
| `finding`, `timeline`, `routeContext`, `peaks` | as for `VerdictCard` |
| `defaultExpanded` | `true` to start as the full card (default `false`) |

On the page, findings sit in a grid: full cards take the whole row, short cards
two to a row (one below 760px).

### VerdictCard

Figma: "Expanded verdict". One finding, important things first:

1. **Heading:** `SeverityBadge` (`severity`) and `ConfidenceIndicator` (`confidence`); the headline (`headline`, what visitors experienced, e.g. `"At campaign peak, every visit showed “Couldn't load rates right now.”"`); a subline from `route-context.json` `powers` plus `customer_view.shown_on` (`"Savings rate cards on the homepage · /"`).
2. **`KeyNumbers`** (`load_levels`), with a divider under them. Left out when there's no break point.
3. **Body** (3:2 columns; one column below 960px): `CanWaitCallout size="large"` (`can_wait_title`, `can_wait`) and "Suggested fix" (`suggested_fix_groups`: a list per cause under its name and share of the server's time; else `suggested_fixes` as bullet points when there are several, else one sentence) on the left; `CustomerView` (`customer_view`) on the right.
4. **`AiAnalysisDisclosure`** (the planned LLM layer, not connected).
5. **`EvidenceDisclosure`** (`evidence_summary`, `cause`, `title`, `evidence`, and the run's timeline).

| Prop | Example |
| ---- | ------- |
| `finding` | one item of `findings.findings` |
| `timeline` | the run's `timeline.json` |
| `routeContext` | the run's `route-context.json` |
| `peaks` | `findings.peaks` (for the campaign marker) |
| `onCollapse` | set by `FindingCard`; adds "READ LESS" at the bottom. Left out, there's none |

Spacing: one 28px inner gutter for every section (20px on phones), 24px between
sections, 12px within a group.

### KeyNumbers

How much traffic the route carries, against both peaks. Room is only shown
when a level fits; over the limit just says so.

| Field (`finding.load_levels`) | Example |
| ----------------------------- | ------- |
| `handles_visitors`, `handles_what`, `handles_requests_per_second` | `160`, `"visitors at once"`, `35` |
| `levels[]`: `name`, `visitors`, `fits`, `note` | `{ name: "Normal busy hour", visitors: 110, fits: true, note: "room for about 50 more" }`, `{ name: "Ad campaign", visitors: 260, fits: false, note: null }` |

### CustomerView

A browser-style frame: "tomorrow" + the page address, a tab per state that has
a screenshot (Normal, Slow / Loading, Fallback; tabs without a screenshot are
left out), and a caption. Tabs work with the arrow keys. Clicking the
screenshot opens the current tab's image large in `ScreenshotModal`.

| Field (`finding.customer_view`) | Example |
| ------------------------------- | ------- |
| `route` | `"GET /api/rates"` (picks the screenshots in `src/data/screenshots.js`) |
| `shown_on` | `"/"` |
| `state` | `"fallback"`: the tab it opens on (what most visitors saw) |
| `caption` | `"Savings rate cards on the homepage at campaign peak"` |

### AiAnalysisDisclosure

"AI analysis for the suggested fixes", closed by default, between the body
and the evidence. It shows the planned LLM layer, which isn't connected:

1. A note with a `warningAmber` icon: "Not connected yet: this shows the planned LLM layer. The prompt is read-only and the reply is pre-written."
2. `PromptComposer` with `PROMPT_TEMPLATE` and a `findings.json` chip. Its size is that of `buildAiInput(finding, peaks)`: the attachment that would be sent, a compact summary of the finding with no timeline data.
3. After send, inside the same box under the prompt: "Thinking…" for 0.9s, then `AiResponse` typing out the canned reply. Send works once, then the button turns grey. Closing the panel hides it without removing it, so the reply stays and doesn't type again.

The canned reply is picked by the finding's cause (`"pool:cms"`,
`"db:findUserByEmail"`, `"render:SignupPage"`, from `cannedKey`). A finding
without one gets a note and a disabled send button.

| Prop | Example |
| ---- | ------- |
| `finding` | one item of `findings.findings` |
| `peaks` | `findings.peaks` (part of the attachment) |

The contract is in [src/data/aiContract.js](src/data/aiContract.js):
`PROMPT_TEMPLATE`, `buildAiInput` (the input), and `OUTPUT_SCHEMA` (what the
model must return, sent as its structured output format):

```
{ summary, check_first: [{ step, reason }],
  ranked_fixes: [{ fix, reason, source: "analyser" | "added" }] }
```

### EvidenceDisclosure

"Evidence", closed by default: "Why <level> confidence?" with
`confidence_reason` on the line below it (`"The time per call points to a full table scan, but the analyser only sees timings: …"`), then `evidence_summary`
(`"Once traffic passed about 160 visitors at once, successful GET /api/rates requests fell from 35/s to 10/s, …"`),
four chart cards in a 2×2 grid (one per row below 960px), plus the extra cards
below, then `title` and every
`evidence` sentence. Charts use the `ChartLegend` vocabulary, with IBM Plex
Mono axis labels and the unit above the y axis. Success, and the second series
in "what filled up", are shaded areas drawn as a 5-second rolling average
(`smoothRows` in `series.js`); hovering still shows the real value for that
second:

1. **Arrivals vs successful** (`target`, `finding.route` ok/s): the capacity
   line at `capacity.requests_per_second`, the knee circle at the start of
   `knee_at.stage`, and the campaign marker where the run reaches
   `peaks.campaign.closestStage` (the peak itself can be just above the
   highest tested level).
2. **Visitors who left or saw a fallback:** stacked bars, one per 10 seconds
   (per-second averages of `funnel.left` and `funnel.degraded`).
3. **Response time (p95)** for `finding.route`.
4. **What filled up**, from `cause`: `{ kind: "pool", name: "cms" }` shows that
   pool's slots in use and waiting, `render`/`db` the event loop and that
   operation's share. With `cause.contributors` (several causes), one line per
   cause: the main one shaded, the rest dashed red.

Extra cards, only where they explain the finding (from `cause.kind`):

- `render`, `db`, `loop`: **Server CPU** (`server.cpuPercent`, % of one core:
  100% is one core fully busy, the Node server's ceiling) and **Wait for the
  event loop** (`server.delayMs`).
- `unexplained` (nothing measured was full): those two, plus every pool's
  slots, to show that nothing filled up.
- `pool`: none. The server was idle, so flat CPU lines would mislead.

None of them appear when the run has no server samples. `server` is `null` for
seconds without a sample, or `{ pollFailed: true }` when `/metrics` didn't answer.

### AllClearCard

| Prop | Field | Example (main after run) |
| ---- | ----- | ------- |
| `allClear` | `findings.all_clear`: `title`, `summary`, `keep_fresh` | `{ title: "No problems found.", summary: "Every route stayed healthy up to 57 visits/s, about 249 visitors at once. …", keep_fresh: "This is true for the code this run tested. …" }` |
| `dateLabel` | `runs.json[].date_label` | `"20 Oct 2026 · 20:52 BST"` |
| `commit` | `run.json` `git.commit` | `"479539e"` |

Shown in place of the finding cards when the run found nothing. The verdict
card's frame, one column wide like a short finding card (the full row on phones): the "Healthy" severity badge (`SeverityBadge`, `info`) at the top, then the title in the verdict headline style with
"As of … · commit …" on the right of the same line (under it on narrow
screens), the summary under it (body size), then the `keep_fresh` note (muted,
small, italic). Runs with findings
have no `all_clear`, so it doesn't appear.

### HealthyRoutes

| Prop | Field | Example (main run) |
| ---- | ----- | ------- |
| `healthyRoutes` | `findings.healthyRoutes[]`: `route`, `p95` | `{ route: "GET /", p95: "22ms" }` |
| `upTo` | `findings.healthy_up_to` | `"57 visits/s (planned about 265 visitors at once, measured 420)"` |
| `routeContext` | `route-context.json[route].powers` | `"The homepage"` |
| `timeline` | `timeline.json` | |

"No knee up to …" once, then one row per route: the route (mono, bold), what
it powers (muted, under the route on phones), and the p95 at the highest load.
A row opens two chart cards for that route: **Arrivals vs successful** (the
route's own requests/s, `route|rps`, against its successful ones, `route|ok`,
as a 5-second average) and **Response time (p95)**. Older `findings.json`
files without `p95` show the whole `note` instead.

### Funnel

| Prop | Field | Example (main run) |
| ---- | ----- | ------- |
| `funnel.steps` | `findings.funnel.steps[]`: `{ step, name, count, share_of_previous, kind, why, by_reason? }` | `{ step: "degraded@GET /api/rates", name: "Carried on with degraded rate cards", count: 7944, share_of_previous: 0.496, kind: "degraded", why: "7,944 got no answer within 3s", by_reason: { timeout: 7944 } }` |
| `funnel.voluntary_drop_off` | | `"1,984 of 4,854 visitors who opened the sign-up page (41%) left without submitting. That's their choice, not a failure."` |
| `funnel.lost_signups.expected` / `.campaign` | `.label` (bold), `.detail`, `.summary` (both together), `.lost`, `.attempts`, `.lost_share`, `.left_at_signup_page`, `.tried_to_open` | sign-up run, campaign: `"82 of 2,511 sign-up attempts failed (82 got no answer within 3s): 3% of people who tried to open an account couldn't. Before that, 6,255 of 9,643 visitors (65%) left because the sign-up page didn't appear …"` |

Styled like the stage table in the test details: row dividers only, headers
small and grey, numbers right-aligned in IBM Plex Mono with thousands
separators. Ways out of the main path (`kind: "exit"`) and degraded visits are
indented and grey; visitors the site lost (`left@…`, `signup_lost`) show their
count in red when above 0, and a 0 is faint. Each row has a bar against the
first step's count, in the chart vocabulary: success shaded green (`path`), a
solid block (`exit`), hatched (`degraded`). Below the table, the voluntary
drop-off sentence and each peak's sentence (`label` slightly heavier), small, grey and italic. On phones
the bar and Why columns are hidden.

The steps, in order:
1. Landed on the homepage
2. Left: the homepage didn't load
3. Carried on with degraded rate cards
4. Went on to the sign-up page
5. Left: the sign-up page didn't appear
6. Opened the sign-up page
7. Left without submitting
8. Submitted an email
9. Account created
10. Email already had an account
11. Sign-up failed (lost)

The sign-up test starts at step 4.

---

## Page

### DashboardPage

1. **Header:** title, plus `RunPicker`.
2. **Test details** (`SummaryStrip`): in the header box under `RunPicker`, on white like it, and only once a run is open. A disclosure, closed by default, labelled with the test and scenario ("Sign-up test details · campaign scenario"). Open, it shows key numbers on the left (visit length, requests per visit, both peaks, the findings by severity) and a table of planned vs measured visitors at once per stage on the right (one column below 760px), then the normal-day note and `AssumptionsList`. It shares the `.disclosure` box and toggle with `EvidenceDisclosure`.
3. **Verdicts:** one `FindingCard` per finding, then `HealthyRoutes`.
4. **Funnel:** `Funnel`.

Each finding's evidence and charts are in its verdict card (`EvidenceDisclosure`),
so there's no separate evidence or charts section.

### SummaryStrip fields

| Field | Example |
| ----- | ------- |
| `findings.test`, `.scenario` | `"signup"`, `"campaign"` (the toggle label) |
| `findings.visit.avgVisitSeconds`, `.source` | `4.65`, `"measured from the healthy stages (…)"` |
| `findings.visit.totalRequestsPerVisit` | `2.5` (also `requestsPerVisit` per route: rates `1`, sign-up page `0.31`, POST `0.19`) |
| `findings.peaks.expected` / `.campaign`: `visitors`, `visitsPerSecond`, `closestLoad` | `110`, `23.6`, `"24 visits/s (planned about 112 visitors at once, measured 111)"` |
| `findings.stages[]`: `label`, `visitorsAtOnce` (planned), `measuredVisitorsAtOnce` | `"45 visits/s"`, `209.3`, `314.8` |
| `findings.test` | also picks the screenshots (`SiteScreenshots`), above the assumptions |
| `findings.normal_day_warning` (campaign scenario) | `"Normal-day numbers come from main run 2026-10-19_000132-main. Both runs are on commit 93ba655, but with uncommitted changes…"` |
| `findings.superseded`, `.superseded_reason` | `false` |
| `findings.variant` | `"after"`: "Fixes applied" (green) in front of the details title, where "Superseded" goes |
