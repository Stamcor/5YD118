#!/usr/bin/env bash
# PLAT-013/AC6 — start the whole stack, check it answers through both frontends, tear down.
#   scripts/compose-smoke.sh            # uses podman-compose if installed, else docker compose
#   COMPOSE="docker compose" scripts/compose-smoke.sh
#   KEEP=1 scripts/compose-smoke.sh     # leave the stack running afterwards
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${COMPOSE:-}" ]]; then
  if command -v podman-compose >/dev/null; then COMPOSE="podman-compose"; else COMPOSE="docker compose"; fi
fi
WEB="http://localhost:${WEB_PORT:-8080}"
ADMIN="http://localhost:${ADMIN_PORT:-8081}"

cleanup() {
  if [[ "${KEEP:-0}" != "1" ]]; then $COMPOSE down -v >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

echo "→ $COMPOSE up -d --build"
$COMPOSE up -d --build

wait_for() { # url expected-substring
  for _ in $(seq 1 60); do
    if body=$(curl -fsS "$1" 2>/dev/null) && [[ "$body" == *"$2"* ]]; then
      echo "  ✓ $1"
      return 0
    fi
    sleep 2
  done
  echo "  ✗ $1 did not answer with '$2'"
  $COMPOSE logs --tail=50 || true
  return 1
}

echo "→ checking endpoints"
wait_for "$WEB/api/health" '"status":"ok"'
wait_for "$ADMIN/api/health" '"status":"ok"'
wait_for "$WEB/" '<div id="root">'
wait_for "$ADMIN/" '<div id="root">'
wait_for "$WEB/courses" '<div id="root">' # SPA fallback
echo "✓ stack is up"
