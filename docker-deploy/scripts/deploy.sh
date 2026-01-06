#!/bin/bash
# ========================================
# MAX Infrastructure - Deployment Script
# ========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "========================================" echo "🚀 MAX Infrastructure Deployment"
echo "========================================"

# Check if running on Oracle server
if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
    echo "❌ Error: .env.production not found"
    echo "📝 Copy .env.production.example and fill with real values"
    exit 1
fi

# Pull latest code
echo ""
echo "📥 Pulling latest code from Git..."
cd "$PROJECT_ROOT"
git pull origin main

# Stop existing containers
echo ""
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start services
echo ""
echo "🏗️  Building Docker images..."
docker-compose build --no-cache

echo ""
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
echo ""
echo "🩺 Health Check:"
docker-compose ps

echo ""
echo "✅ MAX Backend:"
curl -s http://localhost:3005/api/health | jq '.' || echo "⚠️  Backend not ready yet"

echo ""
echo "✅ EspoCRM:"
curl -s http://localhost:8080/api/v1/App/user | jq '.user.userName' || echo "⚠️  EspoCRM not ready yet"

echo ""
echo "========================================" echo "✅ Deployment Complete"
echo "========================================"
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f max-backend"
echo "   docker-compose logs -f espocrm"
echo ""
echo "🔍 Check status:"
echo "   docker-compose ps"
echo ""
