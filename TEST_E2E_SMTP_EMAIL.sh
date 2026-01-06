#!/bin/bash
################################################################################
# TEST E2E: SMTP Email OVH - Pipe Complet
################################################################################
#
# Objectif: Tester le pipe complet Email SMTP depuis internet
#   1. Envoi email via action sendEmail
#   2. MessageId provider retourné
#   3. Email CRM créé (traçabilité)
#   4. Réception effective vérifiable
#
# Prérequis: JWT token utilisateur
# Durée: ~10 secondes
#
# NOTE: SMTP OVH ne fournit PAS de webhooks delivery/open/click
#       → Test limité à l'envoi uniquement (send-only)
#
################################################################################

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m'

echo -e "${CYAN}🧪 TEST E2E: SMTP Email OVH (Stack Court Terme - Send Only)${NC}"
echo -e "${CYAN}===========================================================${NC}"
echo ""

# Configuration
API_URL="https://max-api.studiomacrea.cloud"

# ⚠️ CONFIGURATION À PERSONNALISER
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # Token d'authentification
TEST_EMAIL="test-recipient@example.com"  # Email destinataire de test

if [ "$JWT_TOKEN" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." ]; then
    echo -e "${YELLOW}⚠️  WARNING: JWT_TOKEN par défaut détecté${NC}"
    echo ""
    echo -e "${GRAY}Obtenir un token:${NC}"
    echo -e "${GRAY}curl -X POST $API_URL/api/auth/login \\${NC}"
    echo -e "${GRAY}  -H \"Content-Type: application/json\" \\${NC}"
    echo -e "${GRAY}  -d '{\"username\":\"admin\",\"password\":\"xxx\"}' \\${NC}"
    echo -e "${GRAY}  | jq -r '.token'${NC}"
    echo ""
    read -p "Appuyez sur Entrée pour continuer avec les valeurs par défaut..."
fi

echo -e "${GRAY}📍 API URL: $API_URL${NC}"
echo -e "${GRAY}📧 Destinataire: $TEST_EMAIL${NC}"
echo ""

# ============================================================================
# ÉTAPE 1: Tester endpoint action sendEmail
# ============================================================================
echo -e "${YELLOW}📋 ÉTAPE 1/3: Test accessibilité endpoint${NC}"
echo ""

# Payload action sendEmail
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
TEST_ID=$(date +%s)

SEND_PAYLOAD=$(cat <<EOF
{
  "action": "sendEmail",
  "params": {
    "tenantId": "macrea",
    "to": "$TEST_EMAIL",
    "subject": "✅ Test E2E SMTP Production - $TIMESTAMP",
    "body": "<html><body style=\"font-family: Arial, sans-serif; padding: 20px;\"><h2 style=\"color: #2563eb;\">✅ Email Test E2E - Production Server</h2><p>Cet email a été envoyé depuis le serveur de production lors d'un test E2E.</p><h3>Informations de test:</h3><ul><li><strong>Test ID:</strong> $TEST_ID</li><li><strong>Timestamp:</strong> $TIMESTAMP</li><li><strong>Provider:</strong> SMTP OVH (ssl0.ovh.net:587)</li><li><strong>From:</strong> contact@malalacrea.fr</li></ul><h3>⚠️  Limitation SMTP OVH:</h3><p><strong>Send-Only</strong> - Pas de webhooks pour:</p><ul><li>❌ Delivery confirmation</li><li>❌ Open tracking</li><li>❌ Click tracking</li><li>❌ Bounce notifications</li></ul><p style=\"color: #666; font-size: 12px; margin-top: 30px;\">Si vous recevez cet email, le pipe SMTP send-only est fonctionnel.</p></body></html>",
    "from": "contact@malalacrea.fr"
  }
}
EOF
)

echo -e "${YELLOW}📤 Envoi de l'email...${NC}"

SEND_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST "$API_URL/api/max/actions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "$SEND_PAYLOAD")

HTTP_CODE=$(echo "$SEND_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$SEND_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    SUCCESS=$(echo "$BODY" | grep -o '"success":[^,]*' | cut -d: -f2)

    if [ "$SUCCESS" = "true" ]; then
        MESSAGE_ID=$(echo "$BODY" | grep -o '"entityId":"[^"]*"' | cut -d'"' -f4)
        PROVIDER=$(echo "$BODY" | grep -o '"provider":"[^"]*"' | cut -d'"' -f4)

        echo -e "${GREEN}✅ Email envoyé avec succès${NC}"
        echo -e "${GRAY}   Provider: $PROVIDER${NC}"
        echo -e "${GRAY}   Message ID: $MESSAGE_ID${NC}"
        echo -e "${GRAY}   Destinataire: $TEST_EMAIL${NC}"
    else
        ERROR=$(echo "$BODY" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
        echo -e "${RED}❌ Échec envoi email${NC}"
        echo -e "${GRAY}Error: $ERROR${NC}"
        echo -e "${GRAY}Response: $BODY${NC}"
        echo ""
        echo -e "${YELLOW}🔧 CAUSES PROBABLES:${NC}"
        echo "1. Credentials SMTP OVH invalides dans .env"
        echo "2. Compte OVH suspendu ou quota dépassé"
        echo "3. Email destinataire blacklisté"
        exit 1
    fi
else
    echo -e "${RED}❌ Erreur HTTP (Code: $HTTP_CODE)${NC}"
    echo -e "${GRAY}Response: $BODY${NC}"
    echo ""
    echo -e "${YELLOW}🔧 CAUSES PROBABLES:${NC}"
    echo "1. JWT token invalide/expiré (401)"
    echo "2. Endpoint /api/max/actions introuvable (404)"
    echo "3. Erreur serveur (500)"
    exit 1
fi

echo ""

# ============================================================================
# ÉTAPE 2: Vérification réception manuelle
# ============================================================================
echo -e "${YELLOW}📬 ÉTAPE 2/3: Vérification réception${NC}"
echo ""

echo -e "${CYAN}🔍 VÉRIFICATIONS MANUELLES REQUISES:${NC}"
echo ""

echo "1. Ouvrir boîte email: $TEST_EMAIL"
echo "   → Délai: 1-2 minutes maximum"
echo ""

echo "2. Vérifier FROM: contact@malalacrea.fr"
echo "   → Doit correspondre exactement"
echo ""

echo "3. Vérifier SPAM:"
echo "   → Email doit être dans INBOX (pas spam)"
echo ""

echo "4. Headers email → Vérifier SPF/DKIM:"
echo "   → SPF: PASS (ssl0.ovh.net autorisé)"
echo "   → DKIM: Probablement absent (OVH ne signe pas par défaut)"
echo ""

# ============================================================================
# ÉTAPE 3: Logs backend
# ============================================================================
echo -e "${YELLOW}📊 ÉTAPE 3/3: Vérification logs backend${NC}"
echo ""

echo -e "${CYAN}Commandes de vérification:${NC}"
echo ""

echo "1. Logs SMTP backend:"
echo -e "${GRAY}   ssh root@51.159.170.20 \"docker logs max-backend --tail 100 | grep -i smtp\"${NC}"
echo ""

echo "2. Chercher confirmation envoi:"
echo -e "${GRAY}   Rechercher: \"✅ [SMTP] Email envoyé: $MESSAGE_ID\"${NC}"
echo ""

echo "3. Vérifier tracking CRM (si parentType/parentId fournis):"
echo -e "${GRAY}   SELECT * FROM Email WHERE status = 'Sent' AND dateSent::date = CURRENT_DATE;${NC}"
echo ""

# ============================================================================
# RÉSUMÉ
# ============================================================================
echo -e "${CYAN}📊 RÉSUMÉ DU TEST${NC}"
echo -e "${CYAN}=================${NC}"
echo ""
echo -e "${GREEN}✅ Endpoint accessible: $API_URL/api/max/actions${NC}"
echo -e "${GREEN}✅ Email envoyé: $MESSAGE_ID (provider: smtp)${NC}"
echo ""

echo -e "${YELLOW}📝 CRITÈRES DE SUCCÈS:${NC}"
echo ""
echo "Pour considérer le test RÉUSSI, vérifier:"
echo "  1. ✅ HTTP 200 + success: true"
echo "  2. ✅ MessageId provider retourné"
echo "  3. ✅ Email reçu dans boîte $TEST_EMAIL (délai < 2 min)"
echo "  4. ✅ From = contact@malalacrea.fr"
echo "  5. ✅ Pas dans spam"
echo ""

echo -e "${YELLOW}⚠️  LIMITATION SMTP OVH (Send-Only):${NC}"
echo ""
echo "SMTP OVH ne fournit PAS de webhooks:"
echo "  ❌ Delivery confirmation: Inconnu"
echo "  ❌ Open tracking: Impossible"
echo "  ❌ Click tracking: Impossible"
echo "  ❌ Bounce notifications: Pas de feedback"
echo ""

echo -e "${CYAN}💡 RECOMMANDATION:${NC}"
echo ""
echo "Pour tracking complet (delivered/open/click/bounce):"
echo "  → Migrer vers SendGrid ou Resend"
echo "  → Voir AUDIT_PIPE_COMMS_PRODUCTION.md section EMAIL"
echo ""

echo -e "${GREEN}✅ TEST E2E SMTP EMAIL TERMINÉ${NC}"
echo ""
echo -e "${GRAY}Note: Le statut restera \"Sent\" définitivement (pas de mise à jour delivery)${NC}"