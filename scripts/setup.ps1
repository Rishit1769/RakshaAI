# RakshaAI — Development environment setup script for Windows (PowerShell 5+)
# Usage: .\scripts\setup.ps1

param(
  [switch]$SkipDockerCheck,
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent

function Write-Step  { param($msg) Write-Host "`n[SETUP] $msg" -ForegroundColor Cyan }
function Write-Ok    { param($msg) Write-Host "  [OK] $msg"   -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Fatal { param($msg) Write-Host "  [ERR] $msg"  -ForegroundColor Red; exit 1 }

# ─── Prerequisite checks ──────────────────────────────────────────
Write-Step "Checking prerequisites"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Fatal "Node.js not found. Install from https://nodejs.org (v20+ required)"
}
$nodeVer = (node --version).TrimStart('v').Split('.')[0] -as [int]
if ($nodeVer -lt 20) { Write-Fatal "Node.js 20+ required (found: $(node --version))" }
Write-Ok "Node.js $(node --version)"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Write-Fatal "npm not found" }
Write-Ok "npm $(npm --version)"

if (-not $SkipDockerCheck) {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Warn "Docker not found. Skipping docker checks. Install Docker Desktop to run full stack."
  } else {
    Write-Ok "Docker $(docker --version)"
  }
}

# ─── Environment files ────────────────────────────────────────────
Write-Step "Setting up .env files"

$envFiles = @(
  @{ src = "apps\backend\.env.example"; dst = "apps\backend\.env" },
  @{ src = "apps\web\.env.example";     dst = "apps\web\.env.local" }
)

foreach ($pair in $envFiles) {
  $srcPath = Join-Path $Root $pair.src
  $dstPath = Join-Path $Root $pair.dst
  if (-not (Test-Path $dstPath)) {
    Copy-Item $srcPath $dstPath
    Write-Ok "Created $($pair.dst) from example"
  } else {
    Write-Warn "$($pair.dst) already exists — skipping"
  }
}

# ─── npm workspaces install ───────────────────────────────────────
if (-not $SkipInstall) {
  Write-Step "Installing npm workspace dependencies (root)"
  Set-Location $Root
  npm install
  Write-Ok "npm install complete"

  Write-Step "Generating Prisma client"
  Set-Location (Join-Path $Root "apps\backend")
  npm run db:generate
  Write-Ok "Prisma client generated"
  Set-Location $Root
}

# ─── Done ─────────────────────────────────────────────────────────
Write-Host "`n[SETUP] Phase 1 setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Edit apps\backend\.env with your secrets" -ForegroundColor White
Write-Host "  2. Start infra:  docker compose -f docker\docker-compose.dev.yml up -d" -ForegroundColor White
Write-Host "  3. Run backend:  cd apps\backend && npm run dev" -ForegroundColor White
Write-Host "  4. Run web:      cd apps\web    && npm run dev" -ForegroundColor White
