#!/usr/bin/env bash
set -e

echo "Deploying Raksha AI..."

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm use 20 >/dev/null || true
fi

echo "Starting infrastructure..."
docker compose --env-file .env.production -f docker/docker-compose.infra.yml up -d

echo "Waiting for Postgres..."
sleep 5

echo "Pulling latest code..."
git pull origin main

echo "Installing dependencies..."
npm install

set -a
. ./.env.production
set +a

echo "Generating Prisma client..."
npx prisma generate --schema=prisma/schema.prisma

echo "Running database migrations..."
npx prisma migrate deploy --schema=prisma/schema.prisma

echo "Building backend and frontend..."
npm run build

echo "Restarting PM2 processes..."
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save

echo
pm2 status
echo

sleep 3
curl -s http://127.0.0.1:5000/api/health && echo "Backend healthy" || echo "Backend not responding"
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001 | grep -q "200" && echo "Frontend healthy" || echo "Frontend not responding"

echo "Deployment complete!"
