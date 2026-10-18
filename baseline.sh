#!/usr/bin/env bash
# "Quiet Tuesday" baseline: times each route while nothing else hits the server.
#
# Start the server first (npm start), then run: ./baseline.sh
# Each route gets 1 warm-up request, then RUNS measured ones.
# The "new email" sign-ups add users, so run `npm run seed` afterwards.

BASE=${BASE:-http://localhost:3000}
RUNS=5

# One curl request. NEW_EMAIL in any argument becomes a fresh address.
run() {
  local args=()
  for arg in "$@"; do
    args+=("${arg//NEW_EMAIL/baseline-$(date +%s)-$RANDOM@example.com}")
  done
  curl -s -o /dev/null -w '%{http_code} %{time_total}\n' "${args[@]}"
}

measure() {
  local label=$1; shift
  run "$@" > /dev/null # warm-up

  local results=()
  for ((i = 1; i <= RUNS; i++)); do results+=("$(run "$@")"); done

  local statuses times median slowest
  statuses=$(printf '%s\n' "${results[@]}" | awk '{print $1}' | sort -u | tr '\n' ' ')
  times=$(printf '%s\n' "${results[@]}" | awk '{print $2 * 1000}' | sort -n)
  median=$(echo "$times" | sed -n "$(((RUNS + 1) / 2))p")
  slowest=$(echo "$times" | tail -1)
  printf '%-34s %-8s %10.1f %11.1f\n' "$label" "$statuses" "$median" "$slowest"
}

if ! curl -s -o /dev/null "$BASE/hello"; then
  echo "The server isn't running at $BASE. Start it with: npm start"
  exit 1
fi

JSON=(-H 'Content-Type: application/json')

printf '%-34s %-8s %10s %11s\n' 'Route' 'Status' 'Median ms' 'Slowest ms'
measure 'GET /hello'                      "$BASE/hello"
measure 'GET /'                           "$BASE/"
measure 'GET /styles.css'                 "$BASE/styles.css"
measure 'GET /api/rates'                  "$BASE/api/rates"
measure 'GET /signup'                     "$BASE/signup"
measure 'POST /api/signup (new email)'    "${JSON[@]}" -d '{"email":"NEW_EMAIL"}' "$BASE/api/signup"
measure 'POST /api/signup (taken email)'  "${JSON[@]}" -d '{"email":"user100000@example.com"}' "$BASE/api/signup"
