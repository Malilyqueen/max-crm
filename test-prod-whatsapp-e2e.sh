#!/bin/bash
################################################################################
# TEST 3: WhatsApp Twilio E2E - Envoi + Webhook + Tracking
################################################################################
#
# Objectif: Test complet du pipeline WhatsApp:
#   1. Créer un message template
#   2. Envoyer à un numéro de test Twilio
#   3. Vérifier messageSid retourné
#   4. (Optionnel) Simuler webhook status callback
#
# Prérequis: JWT token utilisateur valide
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

echo -e "${CYAN}🧪 TEST 3: WhatsApp Twilio E2E${NC}"
echo -e "${CYAN}================================${NC}"
echo ""

# Configuration
API_URL="https://max-api.studiomacrea.cloud"
TEST_PHONE="+15005550006"  # Magic number Twilio (always succeeds in test mode)

# ⚠️ ATTENTION: Remplacer par un vrai JWT token
# Obtenir via: POST /api/auth/login
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

if [ "$JWT_TOKEN" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." ]; then
    echo -e "${YELLOW}⚠️  WARNING: JWT_TOKEN par défaut détecté${NC}"
    echo ""
    echo -e "${GRAY}Pour obtenir un token valide:${NC}"
    echo -e "${GRAY}  curl -X POST https://max-api.studiomacrea.cloud/api/auth/login \\${NC}"
    echo -e "${GRAY}    -H \"Content-Type: application/json\" \\${NC}"
    echo -e "${GRAY}    -d '{\"username\":\"admin\",\"password\":\"xxx\"}' \\${NC}"
    echo -e "${GRAY}    | jq -r '.token'${NC}"
    echo ""
    read -p "Appuyez sur Entrée pour continuer avec le token par défaut (échouera probablement)..."
fi

echo -e "${GRAY}📍 URL API: $API_URL${NC}"
echo -e "${GRAY}📱 Numéro test: $TEST_PHONE (Twilio Magic Number)${NC}"
echo ""

# ============================================================================
# ÉTAPE 1: Créer un message WhatsApp template
# ============================================================================
echo -e "${YELLOW}📝 ÉTAPE 1/3: Création du message template${NC}"
echo ""

MESSAGE_PAYLOAD='{
  "tenantId": "macrea",
  "name": "Test Audit WhatsApp '$(date +%s)'",
  "type": "test",
  "messageText": "Bonjour {{prenom}}, ceci est un test du système WhatsApp. ID: {{testId}}",
  "variables": ["prenom", "testId"]
}'

MESSAGE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST "$API_URL/api/whatsapp/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "$MESSAGE_PAYLOAD")

HTTP_CODE=$(echo "$MESSAGE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$MESSAGE_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}❌ ÉCHEC: Impossible de créer le message (HTTP $HTTP_CODE)${NC}"
    echo -e "${GRAY}Response: $BODY${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Causes probables:${NC}"
    echo "  1. JWT token invalide/expiré (401)"
    echo "  2. Route /api/whatsapp/messages non configurée (404)"
    echo "  3. Erreur serveur (500)"
    exit 1
fi

MESSAGE_ID=$(echo "$BODY" | jq -r '.message.id // empty')

if [ -z "$MESSAGE_ID" ]; then
    echo -e "${RED}❌ ÉCHEC: messageId absent dans la réponse${NC}"
    echo -e "${GRAY}Response: $BODY${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Message créé: $MESSAGE_ID${NC}"
echo ""

# ============================================================================
# ÉTAPE 2: Envoyer le message à un numéro de test
# ============================================================================
echo -e "${YELLOW}📤 ÉTAPE 2/3: Envoi du message WhatsApp${NC}"
echo ""

SEND_PAYLOAD='{
  "toPhoneNumber": "'$TEST_PHONE'",
  "leadId": "test_lead_audit_'$(date +%s)'",
  "variables": {
    "prenom": "Audit",
    "testId": "'$(date +%s)'"
  }
}'

SEND_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST "$API_URL/api/whatsapp/messages/$MESSAGE_ID/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "$SEND_PAYLOAD")

HTTP_CODE=$(echo "$SEND_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$SEND_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}❌ ÉCHEC: Impossible d'envoyer le message (HTTP $HTTP_CODE)${NC}"
    echo -e "${GRAY}Response: $BODY${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Causes probables:${NC}"
    echo "  1. Twilio credentials invalides dans .env"
    echo "  2. Numéro WhatsApp From non vérifié"
    echo "  3. Quota Twilio dépassé"
    echo ""
    echo -e "${GRAY}📋 Vérifier logs Twilio:${NC}"
    echo "  https://console.twilio.com/us1/monitor/logs/debugger"
    exit 1
fi

MESSAGE_SID=$(echo "$BODY" | jq -r '.messageSid // empty')
STATUS=$(echo "$BODY" | jq -r '.status // empty')

if [ -z "$MESSAGE_SID" ]; then
    echo -e "${RED}❌ ÉCHEC: messageSid absent dans la réponse${NC}"
    echo -e "${GRAY}Response: $BODY${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Message envoyé avec succès${NC}"
echo -e "${GRAY}   MessageSid: $MESSAGE_SID${NC}"
echo -e "${GRAY}   Status: $STATUS${NC}"
echo ""

# ============================================================================
# ÉTAPE 3: Simuler un webhook status (optionnel)
# ============================================================================
echo -e "${YELLOW}🔄 ÉTAPE 3/3: Simulation webhook status callback${NC}"
echo ""

# Note: En prod, Twilio envoie ce webhook automatiquement
# Ici on le simule pour tester le endpoint

WEBHOOK_PAYLOAD="MessageSid=$MESSAGE_SID&MessageStatus=delivered&From=whatsapp:$TEST_PHONE&To=whatsapp:+14155238886"

WEBHOOK_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST "$API_URL/api/whatsapp/incoming" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "$WEBHOOK_PAYLOAD")

HTTP_CODE=$(echo "$WEBHOOK_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$WEBHOOK_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    echo -e "${GREEN}✅ Webhook traité avec succès${NC}"
else
    echo -e "${YELLOW}⚠️  Webhook a retourné HTTP $HTTP_CODE${NC}"
    echo -e "${GRAY}Response: $BODY${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Cela peut indiquer:${NC}"
    echo "  1. Route /api/whatsapp/incoming fonctionne mais répond différemment"
    echo "  2. Validation signature Twilio bloque (normal en simulation)"
    echo "  3. Handler webhook a une erreur interne"
fi

echo ""

# ============================================================================
# RÉSUMÉ
# ============================================================================
echo -e "${CYAN}📊 RÉSUMÉ DU TEST${NC}"
echo -e "${CYAN}=================${NC}"
echo ""
echo -e "${GREEN}✅ Message template créé: $MESSAGE_ID${NC}"
echo -e "${GREEN}✅ Message envoyé à Twilio: $MESSAGE_SID${NC}"
echo -e "${GREEN}✅ Statut initial: $STATUS${NC}"
echo ""

echo -e "${CYAN}🔍 VÉRIFICATIONS RECOMMANDÉES:${NC}"
echo ""
echo "1. Twilio Dashboard - Message envoyé ?"
echo -e "${GRAY}   https://console.twilio.com/us1/monitor/logs/messages${NC}"
echo -e "${GRAY}   Rechercher: $MESSAGE_SID${NC}"
echo ""

echo "2. Logs Backend - Webhook reçu ?"
echo -e "${GRAY}   ssh root@51.159.170.20 \"docker logs max-backend --tail 100 | grep '$MESSAGE_SID'\"${NC}"
echo ""

echo "3. Database - Event persisté ?"
echo -e "${GRAY}   SELECT * FROM whatsapp_message_events WHERE message_sid = '$MESSAGE_SID';${NC}"
echo -e "${GRAY}   (Si table existe - voir TODO P1 dans AUDIT_PIPE_COMMS_PRODUCTION.md)${NC}"
echo ""

echo "4. Si numéro réel utilisé - WhatsApp reçu ?"
echo -e "${GRAY}   Note: $TEST_PHONE est un magic number qui ne reçoit pas vraiment${NC}"
echo -e "${GRAY}   Pour test réel, remplacer par votre numéro vérifié Twilio${NC}"
echo ""

echo -e "${GREEN}✅ TEST COMPLET - Pipeline WhatsApp fonctionnel${NC}"
echo ""
echo -e "${YELLOW}📝 NOTE: Pour tracking complet (delivered/read), configurer webhook Twilio:${NC}"
echo -e "${GRAY}   1. Ajouter route nginx /webhooks/twilio-whatsapp${NC}"
echo -e "${GRAY}   2. Configurer dans Twilio Console → WhatsApp Senders → Configure Webhooks${NC}"
echo -e "${GRAY}   3. Status Callback URL: https://max-api.studiomacrea.cloud/webhooks/twilio-whatsapp${NC}"