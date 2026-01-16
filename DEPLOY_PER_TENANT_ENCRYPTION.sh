#!/bin/bash
# Deploy Per-Tenant Encryption to Production
# Date: 2026-01-12

set -e  # Exit on error

echo "=================================================="
echo "🚀 Déploiement Per-Tenant Encryption"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running on production server
if [ ! -d "/opt/max-infrastructure" ]; then
    echo -e "${RED}❌ Erreur: Ce script doit être exécuté sur le serveur de production${NC}"
    echo "Répertoire /opt/max-infrastructure non trouvé"
    exit 1
fi

cd /opt/max-infrastructure

echo -e "${YELLOW}📋 Étape 1: Vérification de l'environnement${NC}"
if ! grep -q "CREDENTIALS_ENCRYPTION_KEY" .env; then
    echo -e "${RED}❌ CREDENTIALS_ENCRYPTION_KEY manquante dans .env${NC}"
    exit 1
fi
echo -e "${GREEN}✅ CREDENTIALS_ENCRYPTION_KEY présente${NC}"

if ! grep -q "DATABASE_URL" .env; then
    echo -e "${RED}❌ DATABASE_URL manquante dans .env${NC}"
    exit 1
fi
echo -e "${GREEN}✅ DATABASE_URL présente${NC}"
echo ""

echo -e "${YELLOW}📋 Étape 2: Pull du code depuis Git${NC}"
git pull origin main
echo -e "${GREEN}✅ Code mis à jour${NC}"
echo ""

echo -e "${YELLOW}📋 Étape 3: Backup du backend actuel${NC}"
docker compose stop max-backend
echo -e "${GREEN}✅ Backend arrêté${NC}"
echo ""

echo -e "${YELLOW}📋 Étape 4: Rebuild de l'image backend (REQUIS pour changements code)${NC}"
docker compose build max-backend
echo -e "${GREEN}✅ Image reconstruite${NC}"
echo ""

echo -e "${YELLOW}📋 Étape 5: Démarrage du nouveau backend${NC}"
docker compose up -d max-backend
echo -e "${GREEN}✅ Backend démarré${NC}"
echo ""

echo -e "${YELLOW}📋 Étape 6: Vérification des logs (10 secondes)${NC}"
sleep 3
echo "Logs de démarrage:"
docker compose logs --tail=50 max-backend | grep -E "Encryption|Started|Error" || true
echo ""

echo -e "${YELLOW}📋 Étape 7: Test de santé du backend${NC}"
sleep 2
if curl -f http://localhost:3005/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend répond correctement${NC}"
else
    echo -e "${RED}❌ Backend ne répond pas sur /api/health${NC}"
    echo "Vérifier les logs avec: docker compose logs -f max-backend"
    exit 1
fi
echo ""

echo "=================================================="
echo -e "${GREEN}✅ DÉPLOIEMENT RÉUSSI!${NC}"
echo "=================================================="
echo ""
echo "🎯 Prochaines étapes:"
echo "1. Tester SMS Settings: https://crm.studiomacrea.cloud/settings"
echo "2. Configurer Twilio SMS provider"
echo "3. Cliquer sur 'Tester la connexion'"
echo ""
echo "📊 Monitoring:"
echo "   docker compose logs -f max-backend"
echo ""
echo "🔍 Vérifier encryption au démarrage:"
echo "   docker compose logs max-backend | grep Encryption"
echo "   Attendu:"
echo "   [Encryption] ✅ Clé de chiffrement globale valide (32 bytes)"
echo "   [Encryption] ✅ Test de chiffrement/déchiffrement réussi (per-tenant)"
echo ""
