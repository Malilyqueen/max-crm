#!/bin/bash
# ========================================
# MAX Infrastructure - Scaleway Deployment
# Execute on Scaleway Ubuntu 22.04
# ========================================

set -e

echo "========================================" echo "🚀 MAX Scaleway Deployment"
echo "========================================"

# Step 1: Install Docker
echo ""
echo "📦 Installing Docker..."
apt-get update
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Step 2: Verify Docker
echo ""
echo "✅ Docker installed:"
docker --version
docker compose version

# Step 3: Clone repository
echo ""
echo "📥 Cloning repository..."
cd /opt
if [ -d "max-infrastructure" ]; then
    echo "⚠️  max-infrastructure exists, pulling latest..."
    cd max-infrastructure
    git pull
else
    git clone YOUR_GIT_REPO_URL max-infrastructure
    cd max-infrastructure/docker-deploy
fi

# Step 4: Check .env.production
if [ ! -f ".env.production" ]; then
    echo ""
    echo "❌ ERROR: .env.production not found"
    echo "📝 Create it from .env.production.example and upload via scp"
    echo ""
    echo "Example:"
    echo "  scp .env.production root@YOUR_SCALEWAY_IP:/opt/max-infrastructure/docker-deploy/"
    exit 1
fi

# Step 5: Check SSL certificates
if [ ! -f "services/nginx/ssl/cloudflare-origin-cert.pem" ]; then
    echo ""
    echo "❌ ERROR: Cloudflare Origin Certificate not found"
    echo "📝 Generate at Cloudflare Dashboard → SSL/TLS → Origin Server"
    echo ""
    echo "Then upload:"
    echo "  scp cloudflare-origin-cert.pem root@YOUR_SCALEWAY_IP:/opt/max-infrastructure/docker-deploy/services/nginx/ssl/"
    echo "  scp cloudflare-origin-key.pem root@YOUR_SCALEWAY_IP:/opt/max-infrastructure/docker-deploy/services/nginx/ssl/"
    exit 1
fi

# Step 6: Check MAX backend code
if [ ! -f "services/max-backend/package.json" ]; then
    echo ""
    echo "❌ ERROR: MAX backend code not found"
    echo "📝 Copy code to services/max-backend/"
    exit 1
fi

# Step 7: Set permissions
chmod 600 .env.production
chmod 600 services/nginx/ssl/*.pem

# Step 8: Build and deploy
echo ""
echo "🏗️  Building Docker images..."
docker compose build --no-cache

echo ""
echo "🚀 Starting services..."
docker compose up -d

# Step 9: Wait for services
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 15

# Step 10: Health checks
echo ""
echo "🩺 Health Checks:"
docker compose ps

echo ""
echo "✅ MAX Backend:"
curl -f http://localhost:3005/api/health || echo "⚠️  Backend not ready"

echo ""
echo "✅ EspoCRM:"
curl -f http://localhost:8080/api/v1/App/user || echo "⚠️  EspoCRM not ready"

echo ""
echo "========================================" echo "✅ Deployment Complete"
echo "========================================"
echo ""
echo "🌐 Public URLs:"
echo "   https://api.max.studiomacrea.cloud/api/health"
echo "   https://crm.studiomacrea.cloud"
echo ""
echo "📊 View logs:"
echo "   docker compose logs -f max-backend"
echo "   docker compose logs -f espocrm"
echo ""
