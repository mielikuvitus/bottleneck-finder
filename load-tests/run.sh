#!/usr/bin/env bash
# Runs a k6 load test and saves its results in load-tests/results/<run>/.
#
# Usage: load-tests/run.sh [test name, default: main]
# VARIANT=after labels a run made after the Day 5 fixes (default: before).
# Start the server first (npm start) in another terminal.

set -e
cd "$(dirname "$0")/.."

TEST=${1:-main}
VARIANT=${VARIANT:-before}
BASE_URL=${BASE_URL:-http://localhost:3000}
RUN_ID="$(date +%Y-%m-%d_%H%M%S)-$TEST"
[ "$VARIANT" != before ] && RUN_ID="$RUN_ID-$VARIANT"
RUN_DIR="load-tests/results/$RUN_ID"

if ! curl -s -o /dev/null "$BASE_URL/hello"; then
  echo "The server isn't running at $BASE_URL. Start it with: npm start"
  exit 1
fi

echo "Reseeding the database so the run starts from exactly 100,000 users..."
npm run seed --silent

mkdir -p "$RUN_DIR"
echo "Run: $RUN_ID"

# Save what this run was set up with: the test's stages (k6 inspect prints the
# final options) and the config files, so the analyser reads the same values
# Pass on any RAMP/HOLD overrides (dry runs), or inspect would show the defaults
ENV_ARGS=(-e BASE_URL="$BASE_URL" -e RUN_ID="$RUN_ID")
[ -n "$RAMP" ] && ENV_ARGS+=(-e RAMP="$RAMP")
[ -n "$HOLD" ] && ENV_ARGS+=(-e HOLD="$HOLD")
k6 inspect "${ENV_ARGS[@]}" "load-tests/$TEST.js" > "$RUN_DIR/options.json"
cp load-tests/test-config.json analyzer/route-context.json "$RUN_DIR/"

# Label the run: which test, and which version of the code it ran against, so
# the analyser can tell when results from different runs don't match
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
DIRTY=$([ -n "$(git status --porcelain 2>/dev/null)" ] && echo true || echo false)
cat > "$RUN_DIR/run.json" <<EOF
{
  "test": "$TEST",
  "variant": "$VARIANT",
  "superseded": false,
  "git": { "commit": "$COMMIT", "uncommitted_changes": $DIRTY }
}
EOF

# Record the server's own metrics once a second while k6 runs
BASE_URL="$BASE_URL" node load-tests/poll-metrics.mjs "$RUN_DIR/metrics.jsonl" &
POLLER=$!
trap 'kill $POLLER 2>/dev/null' EXIT

# k6 exits with 99 when a threshold fails, which is expected here: keep going
# so the timeline is still built, then exit with k6's code
K6_EXIT=0
k6 run \
  "${ENV_ARGS[@]}" \
  --summary-export "$RUN_DIR/summary.json" \
  --out csv="$RUN_DIR/raw.csv.gz" \
  "load-tests/$TEST.js" || K6_EXIT=$?

kill $POLLER 2>/dev/null || true
node analyzer/timeline.mjs "$RUN_DIR"
exit $K6_EXIT
