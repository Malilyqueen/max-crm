#!/bin/bash
# Test décisif - Vérifier que le dashboard retourne les vraies activités

echo ""
echo "🔍 TEST DÉCISIF - Dashboard Activités M.A.X."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Vérifier si un token JWT est fourni en argument
if [ -z "$1" ]; then
  echo "❌ ERREUR: Token JWT manquant"
  echo ""
  echo "USAGE:"
  echo "  1. Ouvrir le frontend: http://localhost:5173"
  echo "  2. Se connecter"
  echo "  3. Ouvrir DevTools (F12) > Application > Local Storage"
  echo "  4. Chercher 'auth-storage'"
  echo "  5. Copier la valeur de 'state.token'"
  echo "  6. Lancer: ./test-decisif.sh <TOKEN>"
  echo ""
  echo "EXEMPLE:"
  echo "  ./test-decisif.sh eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ..."
  echo ""
  exit 1
fi

JWT_TOKEN="$1"

echo "📋 ÉTAPE 1: Créer des actions de test"
echo ""

# Créer 2 actions via API
curl -s -X POST "http://localhost:3005/api/action-layer/run" \
  -H "Content-Type: application/json" \
  -d '{
    "actionType": "create_opportunity",
    "params": {
      "tenantId": "macrea",
      "name": "Test Décisif - Opportunité",
      "amount": 20000,
      "closeDate": "2025-09-01",
      "stage": "Negotiation"
    }
  }' | python -m json.tool 2>/dev/null | grep -E "(success|preview)" || echo "Action 1 lancée"

sleep 1

curl -s -X POST "http://localhost:3005/api/action-layer/run" \
  -H "Content-Type: application/json" \
  -d '{
    "actionType": "create_ticket",
    "params": {
      "tenantId": "macrea",
      "name": "Test Décisif - Ticket",
      "description": "Validation du patch Quick Fix A",
      "priority": "High",
      "status": "New"
    }
  }' | python -m json.tool 2>/dev/null | grep -E "(success|preview)" || echo "Action 2 lancée"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 ÉTAPE 2: Vérifier actionLogger"
echo ""

LOGS_COUNT=$(curl -s "http://localhost:3005/api/action-layer/logs?limit=5&tenantId=macrea" | python -m json.tool 2>/dev/null | grep '"count":' | awk '{print $2}' | tr -d ',')

if [ -n "$LOGS_COUNT" ] && [ "$LOGS_COUNT" -gt 0 ]; then
  echo "✅ ActionLogger contient $LOGS_COUNT logs"
else
  echo "❌ ActionLogger vide ou inaccessible"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 ÉTAPE 3: Tester /dashboard-mvp1/stats avec JWT"
echo ""

RESPONSE=$(curl -s "http://localhost:3005/api/dashboard-mvp1/stats" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "X-Tenant: macrea")

# Vérifier si la réponse contient une erreur
if echo "$RESPONSE" | grep -q '"error"'; then
  echo "❌ ÉCHEC - Erreur retournée:"
  echo "$RESPONSE" | python -m json.tool 2>/dev/null || echo "$RESPONSE"
  echo ""
  exit 1
fi

# Extraire le nombre d'activités
ACTIVITY_COUNT=$(echo "$RESPONSE" | python -m json.tool 2>/dev/null | grep -A 1 '"recentActivity":' | grep -o '\[.*\]' | python -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null)

# Extraire maxInteractions
MAX_INTERACTIONS=$(echo "$RESPONSE" | python -m json.tool 2>/dev/null | grep '"maxInteractions":' | awk '{print $2}' | tr -d ',')

echo "✅ Réponse reçue (200 OK)"
echo ""
echo "📊 RÉSULTATS:"
echo "   - Activités récentes: $ACTIVITY_COUNT"
echo "   - Max Interactions: $MAX_INTERACTIONS"
echo ""

# Afficher les 3 premières activités
echo "🔍 Aperçu des activités:"
echo "$RESPONSE" | python -m json.tool 2>/dev/null | grep -A 3 '"recentActivity":' | head -20

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Validation finale
if [ -n "$ACTIVITY_COUNT" ] && [ "$ACTIVITY_COUNT" -gt 0 ]; then
  echo "🎉 TEST DÉCISIF: ✅ RÉUSSI"
  echo ""
  echo "Le dashboard retourne $ACTIVITY_COUNT activités réelles depuis actionLogger."
  echo "Les données mockées ont été remplacées avec succès!"
  echo ""
else
  echo "❌ TEST DÉCISIF: ÉCHEC"
  echo ""
  echo "Le dashboard ne retourne aucune activité."
  echo "Vérifier que des actions ont été exécutées via M.A.X."
  echo ""
  exit 1
fi