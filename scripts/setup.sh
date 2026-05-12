#!/usr/bin/env bash
# RakshaAI — Development environment setup script for Linux/macOS
# Usage: bash scripts/setup.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

step()  { echo -e "\n\033[0;36m[SETUP] $*\033[0m"; }
ok()    { echo -e "  \033[0;32m[OK]\033[0m $*"; }
warn()  { echo -e "  \033[0;33m[WARN]\033[0m $*"; }
fatal() { echo -e "  \033[0;31m[ERR]\033[0m $*"; exit 1; }

# ─── Prerequisites ────────────────────────────────────────────────
step "Checking prerequisites"

command -v node &>/dev/null || fatal "Node.js not found. Install v20+ from https://nodejs.org"
NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
[[ $NODE_MAJOR -ge 20 ]] || fatal "Node.js 20+ required (found: $(node --version))"
ok "Node.js $(node --version)"

command -v npm &>/dev/null || fatal "npm not found"
ok "npm $(npm --version)"

command -v docker &>/dev/null && ok "Docker $(docker --version)" || warn "Docker not found — install Docker to run full stack"

# ─── .env files ───────────────────────────────────────────────────
step "Setting up .env files"

copy_env() {
  local src="$ROOT/$1" dst="$ROOT/$2"
  if [[ ! -f "$dst" ]]; then
    cp "$src" "$dst"
    ok "Created $2 from example"
  else
    warn "$2 already exists — skipping"
  fi
}

copy_env "apps/backend/.env.example" "apps/backend/.env"
copy_env "apps/web/.env.example"     "apps/web/.env.local"

# ─── Install ──────────────────────────────────────────────────────
step "Installing npm workspace dependencies"
cd "$ROOT"
npm install
ok "npm install complete"

step "Generating Prisma client"
cd "$ROOT/apps/backend"
npm run db:generate
ok "Prisma client generated"
cd "$ROOT"

# ─── Done ─────────────────────────────────────────────────────────
echo -e "\n\033[0;32m[SETUP] Phase 1 setup complete!\033[0m"
echo ""
echo "Next steps:"
echo "  1. Edit apps/backend/.env with your secrets"
echo "  2. Start infra:  docker compose -f docker/docker-compose.dev.yml up -d"
echo "  3. Run backend:  cd apps/backend && npm run dev"
echo "  4. Run web:      cd apps/web    && npm run dev"
