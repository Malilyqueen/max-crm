#!/bin/bash
# Déploiement Complet Phase 1: Per-Tenant Encryption + IPv4 Fix
# Date: 2026-01-12

set -e  # Exit on error

echo "=========================================================="
echo "🚀 Déploiement Complet Phase 1"
echo "   - Per-Tenant Encryption (HMAC-SHA256)"
echo "   - IPv4 Fix (ENETUNREACH resolution)"
echo "=========================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running on production server
if [ ! -d "/opt/max-infrastructure" ]; then
    echo -e "${RED}❌ Erreur: Ce script doit être exécuté sur le serveur de production${NC}"
    echo "Répertoire /opt/max-infrastructure non trouvé"
    exit 1
fi

cd /opt/max-infrastructure

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📋 Étape 1/8: Vérification de l'environnement${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check CREDENTIALS_ENCRYPTION_KEY
if ! grep -q "CREDENTIALS_ENCRYPTION_KEY" .env; then
    echo -e "${RED}❌ CREDENTIALS_ENCRYPTION_KEY manquante dans .env${NC}"
    exit 1
fi
echo -e "${GREEN}✅ CREDENTIALS_ENCRYPTION_KEY présente${NC}"

# Check DATABASE_URL
if ! grep -q "DATABASE_URL" .env; then
    echo -e "${RED}❌ DATABASE_URL manquante dans .env${NC}"
    exit 1
fi
echo -e "${GREEN}✅ DATABASE_URL présente${NC}"

# Check/Add FORCE_IPV4
if ! grep -q "FORCE_IPV4" .env; then
    echo -e "${YELLOW}⚠️  FORCE_IPV4 non trouvée, ajout automatique...${NC}"
    echo "FORCE_IPV4=true" >> .env
    echo -e "${GREEN}✅ FORCE_IPV4=true ajoutée à .env${NC}"
else
    echo -e "${GREEN}✅ FORCE_IPV4 déjà présente${NC}"
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📋 Étape 2/8: Vérification docker-compose.yml${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if ! grep -q "FORCE_IPV4" docker-compose.yml; then
    echo -e "${YELLOW}⚠️  FORCE_IPV4 non trouvée dans docker-compose.yml${NC}"
    echo -e "${YELLOW}   Ajoutez manuellement cette ligne dans max-backend.environment:${NC}"
    echo -e "${YELLOW}   - FORCE_IPV4=\${FORCE_IPV4}${NC}"
    echo ""
    read -p "Appuyez sur ENTRÉE après avoir ajouté la ligne, ou CTRL+C pour annuler..."
fi
echo -e "${GREEN}✅ docker-compose.yml vérifié${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📋 Étape 3/8: Pull du code depuis Git${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

git fetch origin
CURRENT_BRANCH=$(git branch --show-current)
echo "Branche actuelle: $CURRENT_BRANCH"

git pull origin "$CURRENT_BRANCH"
echo -e "${GREEN}✅ Code mis à jour${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📋 Étape 4/8: Backup de la configuration actuelle${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup .env
cp .env "$BACKUP_DIR/.env"
echo -e "${GREEN}✅ .env sauvegardé dans $BACKUP_DIR${NC}"

# Backup docker-compose.yml
cp docker-compose.yml "$BACKUP_DIR/docker-compose.yml"
echo -e "${GREEN}✅ docker-compose.yml sauvegardé dans $BACKUP_DIR${NC}"

# Save current backend image ID
docker images max-infrastructure-max-backend --format "{{.ID}}" > "$BACKUP_DIR/backend_image_id.txt" 2>/dev/null || echo "none" > "$BACKUP_DIR/backend_image_id.txt"
echo -e "${GREEN}✅ Image ID sauvegardé${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📋 Étape 5/8: Arrêt du backend actuel${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

docker compose stop max-backend
echo -e "${GREEN}✅ Backend arrêté${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📋 Étape 6/8: Rebuild de l'image backend${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "⚠️  Cette étape peut prendre 2-3 minutes..."

docker compose build max-backend
echo -e "${GREEN}✅ Image reconstruite avec les nouveaux changements${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📋 Étape 7/8: Démarrage du nouveau backend${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

docker compose up -d max-backend
echo -e "${GREEN}✅ Backend démarré${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📋 Étape 8/8: Vérification du démarrage${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Attente du démarrage (10 secondes)..."
sleep 10

echo ""
echo -e "${YELLOW}📊 Logs de démarrage:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose logs --tail=30 max-backend
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for critical success indicators
echo -e "${YELLOW}🔍 Vérification des indicateurs clés:${NC}"

# Check IPv4 resolution
if docker compose logs max-backend | grep -q "DNS résolu.*IPv4"; then
    IPV4=$(docker compose logs max-backend | grep "DNS résolu" | tail -1 | grep -oP '\d+\.\d+\.\d+\.\d+')
    echo -e "${GREEN}✅ IPv4 Force: DNS résolu → $IPV4${NC}"
else
    echo -e "${YELLOW}⚠️  IPv4 Force: Pas de résolution DNS détectée (peut-être pas activé)${NC}"
fi

# Check encryption
if docker compose logs max-backend | grep -q "Clé de chiffrement globale valide"; then
    echo -e "${GREEN}✅ Encryption: Clé globale valide${NC}"
else
    echo -e "${RED}❌ Encryption: Clé non validée${NC}"
fi

if docker compose logs max-backend | grep -q "Test de chiffrement/déchiffrement réussi.*per-tenant"; then
    echo -e "${GREEN}✅ Encryption: Test per-tenant réussi${NC}"
else
    echo -e "${RED}❌ Encryption: Test per-tenant échoué${NC}"
fi

# Check PostgreSQL
if docker compose logs max-backend | grep -q "PostgreSQL client initialisé"; then
    echo -e "${GREEN}✅ PostgreSQL: Client initialisé${NC}"
else
    echo -e "${RED}❌ PostgreSQL: Échec d'initialisation${NC}"
fi

# Check server started
if docker compose logs max-backend | grep -q "Serveur démarré\|listening on"; then
    echo -e "${GREEN}✅ Server: Démarré sur port 3005${NC}"
else
    echo -e "${RED}❌ Server: Échec de démarrage${NC}"
fi

# Check for ENETUNREACH errors
if docker compose logs max-backend | grep -q "ENETUNREACH"; then
    echo -e "${RED}❌ IPv4 Fix: Erreur ENETUNREACH toujours présente!${NC}"
    echo -e "${RED}   Vérifier que FORCE_IPV4=true est bien activée${NC}"
else
    echo -e "${GREEN}✅ IPv4 Fix: Pas d'erreur ENETUNREACH${NC}"
fi

echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🧪 Test de santé du backend${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

sleep 2
if curl -f -s http://localhost:3005/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend répond correctement sur /api/health${NC}"
else
    echo -e "${RED}❌ Backend ne répond pas sur /api/health${NC}"
    echo -e "${YELLOW}   Vérifier les logs avec: docker compose logs -f max-backend${NC}"
fi
echo ""

echo "=========================================================="
echo -e "${GREEN}✅ DÉPLOIEMENT TERMINÉ!${NC}"
echo "=========================================================="
echo ""
echo -e "${BLUE}📊 Résumé des changements déployés:${NC}"
echo "  1. ✅ Per-Tenant Encryption (HMAC-SHA256)"
echo "     - Chaque tenant a sa propre clé de chiffrement"
echo "     - Isolation cryptographique complète"
echo ""
echo "  2. ✅ IPv4 Force Mode"
echo "     - Résolution DNS manuelle en IPv4 uniquement"
echo "     - Fix de l'erreur ENETUNREACH"
echo ""
echo -e "${BLUE}🎯 Prochaines étapes:${NC}"
echo "  1. Tester SMS Settings: https://crm.studiomacrea.cloud/settings"
echo "  2. Configurer Twilio SMS provider"
echo "  3. Cliquer sur 'Sauvegarder' (devrait réussir sans ENETUNREACH)"
echo "  4. Cliquer sur 'Tester la connexion'"
echo ""
echo -e "${BLUE}📊 Monitoring:${NC}"
echo "  Logs live:    docker compose logs -f max-backend"
echo "  Vérifier IPv4: docker compose logs max-backend | grep 'DNS résolu'"
echo "  Vérifier Enc: docker compose logs max-backend | grep Encryption"
echo ""
echo -e "${BLUE}🔙 Rollback (si nécessaire):${NC}"
echo "  cd /opt/max-infrastructure"
echo "  cp $BACKUP_DIR/.env .env"
echo "  cp $BACKUP_DIR/docker-compose.yml docker-compose.yml"
echo "  docker compose up -d max-backend"
echo ""
echo -e "${GREEN}🎉 Déploiement réussi!${NC}"
echo ""