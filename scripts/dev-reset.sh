#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_PORTS=(3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 5000)

kill_pid() {
  local pid="$1"

  if [[ -z "${pid}" ]]; then
    return
  fi

  kill -9 "${pid}" 2>/dev/null || true
}

echo "Cleaning stale Raksha AI dev processes..."

while IFS= read -r pid; do
  kill_pid "${pid}"
done < <(pgrep -f "${ROOT_DIR}/node_modules/.bin/concurrently" || true)

while IFS= read -r pid; do
  kill_pid "${pid}"
done < <(pgrep -f "${ROOT_DIR}/node_modules/.bin/next dev" || true)

while IFS= read -r pid; do
  kill_pid "${pid}"
done < <(pgrep -f "${ROOT_DIR}/node_modules/.bin/ts-node-dev" || true)

while IFS= read -r pid; do
  kill_pid "${pid}"
done < <(pgrep -f "${ROOT_DIR}/node_modules/ts-node-dev/lib/wrap.js src/server.ts" || true)

for port in "${TARGET_PORTS[@]}"; do
  while IFS= read -r pid; do
    kill_pid "${pid}"
  done < <(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)

  while IFS= read -r pid; do
    kill_pid "${pid}"
  done < <(
    ss -ltnp "sport = :${port}" 2>/dev/null \
      | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' \
      | sort -u
  )
done

echo "Raksha AI dev ports cleared: ${TARGET_PORTS[*]}"
