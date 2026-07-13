#!/usr/bin/env bash
set -euo pipefail

WEB_BASE_URL="${WEB_BASE_URL:-https://lmaa.space}"

request_status() {
  local url="$1"
  local attempt
  local output
  local exit_code

  for attempt in 1 2 3 4 5; do
    set +e
    output="$(curl -sS --connect-timeout 5 --max-time 20 -o /dev/null -w '%{http_code}' "$url" 2>&1)"
    exit_code=$?
    set -e

    if [[ $exit_code -eq 0 && "$output" =~ ^[0-9]{3}$ ]]; then
      echo "$output"
      return 0
    fi

    echo "Transient curl failure for $url (attempt $attempt/5): ${output:-exit $exit_code}" >&2
    sleep $((attempt * 2))
  done

  return 1
}

expect_status() {
  local url="$1"
  local expected="$2"
  local code

  if ! code="$(request_status "$url")"; then
    echo "Smoke check failed: unable to fetch $url after retries"
    exit 1
  fi

  if [[ "$code" != "$expected" ]]; then
    echo "Smoke check failed: $url returned $code (expected $expected)"
    exit 1
  fi
}

echo "Running production smoke checks against $WEB_BASE_URL"

expect_status "$WEB_BASE_URL/" "200"
expect_status "$WEB_BASE_URL/search" "200"
expect_status "$WEB_BASE_URL/suggestion" "200"
expect_status "$WEB_BASE_URL/about" "200"
expect_status "$WEB_BASE_URL/category/computer" "200"
expect_status "$WEB_BASE_URL/api/v1/stats" "200"
node scripts/check-web-fonts.mjs --url "$WEB_BASE_URL"

echo "Production smoke checks passed."
