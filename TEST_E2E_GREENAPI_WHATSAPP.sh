#!/bin/bash
################################################################################
# TEST E2E: Green-API WhatsApp - Pipe Complet
################################################################################
#
# Objectif: Tester le pipe complet WhatsApp Green-API depuis internet
#   1. Envoi message via Green-API
#   2. Webhook entrant accessible
#   3. Event persisté en DB/JSON
#   4. Corrélation Lead
#
# Prérequis: Instance Green-API configurée
# Durée: ~15 secondes
#
################################################################################

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}🧪 TEST E2E: Green-API WhatsApp (Stack Court Terme)${NC}"
echo -e "${CYAN}===============================================${NC}"
echo ""

# Configuration
API_URL="https://max-api.studiomacrea.cloud"
WEBHOOK_URL="${API_URL}/webhooks/greenapi"

# ⚠️ CONFIGURATION À PERSONNALISER
GREEN_API_INSTANCE="7105440259"  # Votre instance Green-API
GREEN_API_TOKEN="YOUR_API_TOKEN"  # Token de votre instance
TEST_PHONE="+33648662734"  # Numéro de test WhatsApp

if [ "$GREEN_API_TOKEN" = "YOUR_API_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  WARNING: GREEN_API_TOKEN par défaut détecté${NC}"
    echo ""
    echo -e "${GRAY}Obtenir le token:${NC}"
    echo -e "${GRAY}1. Se connecter à https://console.green-api.com${NC}"
    echo -e "${GRAY}2. Dashboard → Instance ${GREEN_API_INSTANCE} → API Token${NC}"
    echo ""
    read -p "Appuyez sur Entrée pour continuer avec les valeurs par défaut..."
fi

echo -e "${GRAY}📍 API URL: $API_URL${NC}"
echo -e "${GRAY}📱 Instance Green-API: $GREEN_API_INSTANCE${NC}"
echo -e "${GRAY}📞 Numéro test: $TEST_PHONE${NC}"
echo ""

# ============================================================================
# ÉTAPE 1: Tester endpoint webhook (santé)
# ============================================================================
echo -e "${YELLOW}📋 ÉTAPE 1/4: Test accessibilité webhook${NC}"
echo ""

HTTP_CODE=$(curl -s -o /tmp/webhook_health.json -w "%{http_code}" \
  -X GET "$WEBHOOK_URL/status")

if [ "$HTTP_CODE" = "200" ]; then
    RESPONSE=$(cat /tmp/webhook_health.json)
    echo -e "${GREEN}✅ Webhook accessible (HTTP 200)${NC}"
    echo -e "${GRAY}Response: $RESPONSE${NC}"
else
    echo -e "${RED}❌ Webhook inaccessible (HTTP $HTTP_CODE)${NC}"
    echo -e "${GRAY}Response: $(cat /tmp/webhook_health.json 2>/dev/null || echo 'empty')${NC}"
    echo ""
    echo -e "${YELLOW}🔧 FIXES NÉCESSAIRES:${NC}"
    echo "1. Vérifier que le backend est démarré"
    echo "2. Vérifier route nginx /webhooks/greenapi"
    echo "3. Vérifier Cloudflare Access ne bloque pas"
    exit 1
fi

echo ""

# ============================================================================
# ÉTAPE 2: Envoyer un message WhatsApp via Green-API
# ============================================================================
echo -e "${YELLOW}📤 ÉTAPE 2/4: Envoi message WhatsApp${NC}"
echo ""

MESSAGE_TEXT="🧪 Test E2E Green-API WhatsApp - $(date '+%Y-%m-%d %H:%M:%S')"

SEND_PAYLOAD='{
  "chatId": "'${TEST_PHONE}'@c.us",
  "message": "'${MESSAGE_TEXT}'"
}'

SEND_URL="https://api.green-api.com/waInstance${GREEN_API_INSTANCE}/sendMessage/${GREEN_API_TOKEN}"

SEND_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST "$SEND_URL" \
  -H "Content-Type: application/json" \
  -d "$SEND_PAYLOAD")

HTTP_CODE=$(echo "$SEND_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$SEND_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    MESSAGE_ID=$(echo "$BODY" | grep -o '"idMessage":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✅ Message envoyé via Green-API${NC}"
    echo -e "${GRAY}   Message ID: $MESSAGE_ID${NC}"
    echo -e "${GRAY}   Destinataire: $TEST_PHONE${NC}"
else
    echo -e "${RED}❌ Échec envoi message (HTTP $HTTP_CODE)${NC}"
    echo -e "${GRAY}Response: $BODY${NC}"
    echo ""
    echo -e "${YELLOW}🔧 CAUSES PROBABLES:${NC}"
    echo "1. Instance Green-API non autorisée (scanner QR code)"
    echo "2. Token API invalide"
    echo "3. Numéro destinataire invalide"
    exit 1
fi

echo ""

# ============================================================================
# ÉTAPE 3: Simuler webhook entrant (réponse utilisateur)
# ============================================================================
echo -e "${YELLOW}🔄 ÉTAPE 3/4: Simulation webhook entrant${NC}"
echo ""

WEBHOOK_PAYLOAD='{
  "typeWebhook": "incomingMessageReceived",
  "instanceData": {
    "idInstance": '${GREEN_API_INSTANCE}',
    "wid": "33648662734@c.us",
    "typeInstance": "whatsapp"
  },
  "timestamp": '$(date +%s)',
  "idMessage": "test_e2e_'$(date +%s)'",
  "senderData": {
    "chatId": "'${TEST_PHONE}'@c.us",
    "sender": "'${TEST_PHONE}'@c.us",
    "senderName": "Test E2E User"
  },
  "messageData": {
    "typeMessage": "textMessage",
    "textMessageData": {
      "textMessage": "Réponse de test au message envoyé"
    }
  }
}'

WEBHOOK_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_PAYLOAD")

HTTP_CODE=$(echo "$WEBHOOK_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$WEBHOOK_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Webhook traité (HTTP 200)${NC}"
    echo -e "${GRAY}Response: $BODY${NC}"
else
    echo -e "${RED}❌ Webhook échoué (HTTP $HTTP_CODE)${NC}"
    echo -e "${GRAY}Response: $BODY${NC}"
    exit 1
fi

echo ""

# ============================================================================
# ÉTAPE 4: Vérifier event persisté
# ============================================================================
echo -e "${YELLOW}📊 ÉTAPE 4/4: Vérification persistence${NC}"
echo ""

# Attendre 2s pour laisser le temps au flush
sleep 2

echo -e "${CYAN}🔍 VÉRIFICATIONS MANUELLES REQUISES:${NC}"
echo ""

echo "1. Logs backend - Event reçu ?"
echo -e "${GRAY}   ssh root@51.159.170.20 \"docker logs max-backend --tail 100 | grep 'WEBHOOK GREEN-API'\"${NC}"
echo ""

echo "2. Persistence JSON - Fichier créé ?"
echo -e "${GRAY}   ssh root@51.159.170.20 \"ls -lh /opt/max-infrastructure/max-backend/logs/message_events/\"${NC}"
echo ""

echo "3. Persistence Supabase - Event en DB ?"
echo -e "${GRAY}   SELECT * FROM message_events WHERE channel = 'whatsapp' AND provider = 'greenapi' ORDER BY timestamp DESC LIMIT 5;${NC}"
echo ""

echo "4. Corrélation Lead - Lead trouvé ?"
echo -e "${GRAY}   Chercher dans logs: \"👤 Lead trouvé\"${NC}"
echo ""

# ============================================================================
# RÉSUMÉ
# ============================================================================
echo -e "${CYAN}📊 RÉSUMÉ DU TEST${NC}"
echo -e "${CYAN}=================${NC}"
echo ""
echo -e "${GREEN}✅ Webhook accessible: $WEBHOOK_URL${NC}"
echo -e "${GREEN}✅ Message envoyé: $MESSAGE_ID${NC}"
echo -e "${GREEN}✅ Webhook entrant traité (HTTP 200)${NC}"
echo ""

echo -e "${YELLOW}📝 CRITÈRES DE SUCCÈS:${NC}"
echo ""
echo "Pour considérer le test RÉUSSI, vérifier:"
echo "  1. ✅ HTTP 200 à toutes les étapes"
echo "  2. ✅ Event visible dans logs backend"
echo "  3. ✅ Event persisté (DB ou JSON)"
echo "  4. ✅ Lead corrélé (si numéro existe dans CRM)"
echo ""

echo -e "${CYAN}🔗 CONFIGURATION GREEN-API (Si test échoue):${NC}"
echo ""
echo "1. Dashboard Green-API:"
echo -e "${GRAY}   https://console.green-api.com${NC}"
echo ""
echo "2. Configurer webhook URL dans Green-API:"
echo -e "${GRAY}   Settings → Webhooks → Add URL: $WEBHOOK_URL${NC}"
echo ""
echo "3. Vérifier instance autorisée (QR code scanné)"
echo ""

echo -e "${GREEN}✅ TEST E2E GREEN-API TERMINÉ${NC}"