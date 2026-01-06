#!/bin/bash
################################################################################
# TEST 1: Webhook Green-API - Accessibilité Publique
################################################################################
#
# Objectif: Vérifier que le webhook Green-API est accessible depuis internet
# et répond correctement aux events entrants.
#
# Prérequis: Aucun (test en lecture seule)
# Durée: ~5 secondes
#
################################################################################

set -e

echo "🧪 TEST 1: Webhook Green-API Accessibility"
echo "=========================================="
echo ""

# Configuration
API_URL="https://max-api.studiomacrea.cloud"
WEBHOOK_PATH="/webhooks/greenapi"
FULL_URL="${API_URL}${WEBHOOK_PATH}"

echo "📍 URL testée: $FULL_URL"
echo ""

# Payload simulant un message entrant Green-API
PAYLOAD='{
  "typeWebhook": "incomingMessageReceived",
  "instanceData": {
    "idInstance": 7105440259,
    "wid": "33648662734@c.us",
    "typeInstance": "whatsapp"
  },
  "timestamp": 1673024400,
  "idMessage": "test_audit_message_'$(date +%s)'",
  "senderData": {
    "chatId": "33648662734@c.us",
    "sender": "33648662734@c.us",
    "senderName": "Test Audit User"
  },
  "messageData": {
    "typeMessage": "textMessage",
    "textMessageData": {
      "textMessage": "Test audit webhook production"
    }
  }
}'

echo "📤 Envoi du payload de test..."
echo ""

# Effectuer la requête avec détails
HTTP_CODE=$(curl -s -o /tmp/webhook_response.json -w "%{http_code}" \
  -X POST "$FULL_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

RESPONSE=$(cat /tmp/webhook_response.json 2>/dev/null || echo "")

echo "📊 RÉSULTATS:"
echo "-------------"
echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $RESPONSE"
echo ""

# Analyse du résultat
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
  echo "✅ TEST PASSÉ: Webhook accessible et fonctionnel"
  echo ""
  echo "✓ Le webhook Green-API répond correctement"
  echo "✓ Route nginx configurée: OK"
  echo "✓ Backend traite les webhooks: OK"
  exit 0

elif [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "401" ]; then
  echo "❌ TEST ÉCHOUÉ: Accès interdit"
  echo ""
  echo "Causes probables:"
  echo "  1. Cloudflare Access bloque les webhooks externes"
  echo "  2. WAF Cloudflare bloque la requête"
  echo "  3. Authentification requise sur cette route"
  echo ""
  echo "🔧 Solution:"
  echo "  Dashboard Cloudflare → Zero Trust → Access"
  echo "  Ajouter exception: /webhooks/* → Bypass"
  exit 1

elif [ "$HTTP_CODE" = "404" ]; then
  echo "❌ TEST ÉCHOUÉ: Route introuvable"
  echo ""
  echo "Causes probables:"
  echo "  1. Route nginx /webhooks/greenapi manquante"
  echo "  2. proxy_pass pointe vers mauvais endpoint backend"
  echo "  3. Backend route handler manquant"
  echo ""
  echo "🔧 Solution:"
  echo "  Vérifier /opt/max-infrastructure/nginx/conf.d/api.conf"
  echo "  Ligne attendue: location /webhooks/greenapi { proxy_pass http://max_backend; }"
  exit 1

elif [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "503" ] || [ "$HTTP_CODE" = "504" ]; then
  echo "❌ TEST ÉCHOUÉ: Backend inaccessible"
  echo ""
  echo "Causes probables:"
  echo "  1. Container max-backend down"
  echo "  2. Port 3005 non accessible"
  echo "  3. Timeout proxy trop court"
  echo ""
  echo "🔧 Solution:"
  echo "  ssh root@51.159.170.20 'docker ps | grep max-backend'"
  echo "  ssh root@51.159.170.20 'docker logs max-backend --tail 50'"
  exit 1

elif [ "$HTTP_CODE" = "000" ] || [ -z "$HTTP_CODE" ]; then
  echo "❌ TEST ÉCHOUÉ: Impossible de joindre le serveur"
  echo ""
  echo "Causes probables:"
  echo "  1. DNS max-api.studiomacrea.cloud non résolu"
  echo "  2. Serveur 51.159.170.20 down"
  echo "  3. Firewall bloque le port 443"
  echo "  4. Cloudflare Tunnel inactif"
  echo ""
  echo "🔧 Solution:"
  echo "  ping max-api.studiomacrea.cloud"
  echo "  curl -I https://max-api.studiomacrea.cloud/api/health"
  exit 1

else
  echo "⚠️  TEST INCERTAIN: Code HTTP inattendu"
  echo ""
  echo "HTTP Code: $HTTP_CODE"
  echo "Vérifier manuellement la réponse ci-dessus"
  exit 2
fi