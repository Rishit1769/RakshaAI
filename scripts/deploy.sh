#!/usr/bin/env bash
set -euo pipefail

echo "Starting Raksha AI production deployment..."

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm use 20 >/dev/null || true
fi

echo "Pulling latest code..."
git pull origin main

echo "Installing dependencies..."
npm install

echo "Generating Prisma client..."
npm run db:generate

echo "Running database migrations..."
npm run db:migrate

echo "Building backend and frontend..."
npm run build

echo "Restarting PM2 processes..."
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save

echo "Deployment complete."
echo
pm2 status
echo

echo "Verifying backend health..."
sleep 3
curl -s http://127.0.0.1:5000/api/health && echo " Backend healthy" || echo " Backend not responding"
