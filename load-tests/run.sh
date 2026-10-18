#!/usr/bin/env bash
# Runs a k6 load test and saves its results in load-tests/results/.
#
# Usage: load-tests/run.sh [test name, default: main]
# Start the server first (npm start) in another terminal.

set -e
cd "$(dirname "$0")/.."

TEST=${1:-main}
BASE_URL=${BASE_URL:-http://localhost:3000}
RUN_ID="$(date +%Y-%m-%d_%H%M%S)-$TEST"
RESULTS=load-tests/results

if ! curl -s -o /dev/null "$BASE_URL/hello"; then
  echo "The server isn't running at $BASE_URL. Start it with: npm start"
  exit 1
fi

echo "Reseeding the database so the run starts from exactly 100,000 users..."
npm run seed --silent

mkdir -p "$RESULTS"
echo "Run: $RUN_ID"

k6 run \
  -e BASE_URL="$BASE_URL" \
  -e RUN_ID="$RUN_ID" \
  --summary-export "$RESULTS/$RUN_ID-summary.json" \
  --out csv="$RESULTS/$RUN_ID-raw.csv.gz" \
  "load-tests/$TEST.js"
