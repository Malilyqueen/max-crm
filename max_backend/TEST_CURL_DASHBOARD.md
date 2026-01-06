# Tests CURL - Dashboard Activités

## Test 1: Vérifier que actionLogger contient des logs

```bash
curl -s "http://localhost:3005/api/action-layer/logs?limit=10&tenantId=macrea" | python -m json.tool
```

**Résultat attendu**: Liste des actions avec métadonnées complètes

---

## Test 2: Créer une action de test

```bash
curl -X POST "http://localhost:3005/api/action-layer/run" \
  -H "Content-Type: application/json" \
  -d '{
    "actionType": "create_opportunity",
    "params": {
      "tenantId": "macrea",
      "name": "Test CURL - Opportunité",
      "amount": 10000,
      "closeDate": "2025-08-01",
      "stage": "Qualification"
    }
  }'
```

**Résultat attendu**:
```json
{
  "success": true,
  "result": {
    "success": true,
    "provider": "espocrm",
    "entityId": "...",
    "preview": "Opportunité \"Test CURL - Opportunité\" créée (10000 €, stage: Qualification)"
  }
}
```

---

## Test 3: Vérifier /dashboard-mvp1/stats (nécessite JWT)

### Option A: Sans Token (échoue - normal)

```bash
curl -s "http://localhost:3005/api/dashboard-mvp1/stats" \
  -H "X-Tenant: macrea"
```

**Résultat**: `401 Unauthorized` (protection auth fonctionne)

---

### Option B: Avec Token (via Frontend)

**Méthode**:

1. Ouvrir DevTools dans le frontend (F12)
2. Onglet Application > Local Storage
3. Chercher `auth-storage`
4. Copier le token depuis `state.token`

**Commande**:
```bash
curl -s "http://localhost:3005/api/dashboard-mvp1/stats" \
  -H "Authorization: Bearer <VOTRE_TOKEN_ICI>" \
  -H "X-Tenant: macrea" \
  | python -m json.tool
```

**Résultat attendu**:
```json
{
  "stats": {
    "totalLeads": 25,
    "maxInteractions": 4
  },
  "recentActivity": [
    {
      "id": "log_...",
      "type": "max_interaction",
      "title": "Opportunité créée",
      "description": "Opportunité \"Test CURL - Opportunité\" créée (10000 €, stage: Qualification)",
      "timestamp": "2025-12-23T20:30:00.000Z"
    }
  ]
}
```

---

## Test 4: Vérifier les stats actionLogger

```bash
curl -s "http://localhost:3005/api/action-layer/stats?tenantId=macrea" | python -m json.tool
```

**Résultat attendu**:
```json
{
  "success": true,
  "stats": {
    "totalActions": 4,
    "successfulActions": 3,
    "failedActions": 1,
    "byActionType": {
      "create_opportunity": {
        "total": 2,
        "successful": 2,
        "failed": 0
      },
      "create_ticket": {
        "total": 1,
        "successful": 1,
        "failed": 0
      }
    }
  }
}
```

---

## Validation Complète

**Workflow de test complet**:

```bash
# 1. Créer 3 actions
node test-dashboard-activities.js

# 2. Vérifier les logs
curl -s "http://localhost:3005/api/action-layer/logs?limit=20&tenantId=macrea" \
  | python -m json.tool > logs_output.json

# 3. Vérifier les stats
curl -s "http://localhost:3005/api/action-layer/stats?tenantId=macrea" \
  | python -m json.tool

# 4. Frontend: Ouvrir le dashboard et actualiser
# 5. DevTools: Vérifier Network tab pour /dashboard-mvp1/stats
```

**✅ Succès si**:
- `action-layer/logs` retourne les 3 actions créées
- `action-layer/stats` montre le bon compteur
- Dashboard frontend affiche les vraies actions au lieu de "Jean Dupont", "Marie Martin"