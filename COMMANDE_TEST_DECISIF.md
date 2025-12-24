# 🎯 Test Décisif - Commande à Copier-Coller

## Étape 1: Récupérer le Token JWT (30 secondes)

1. Ouvrir: `http://localhost:5173`
2. Se connecter
3. **F12** > **Application** > **Local Storage**
4. Chercher `auth-storage`
5. Copier la valeur de `state.token`

**Le token ressemble à**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOi...`

---

## Étape 2: Lancer le Test (5 secondes)

### Option A: PowerShell (Recommandé)

```powershell
cd d:\Macrea\CRM\max_backend
.\test-decisif.ps1 "COLLER_VOTRE_TOKEN_ICI"
```

---

### Option B: CMD

```cmd
cd d:\Macrea\CRM
test-decisif-curl.cmd "COLLER_VOTRE_TOKEN_ICI"
```

---

### Option C: CURL Direct (une ligne)

**Windows CMD**:
```cmd
curl -H "Authorization: Bearer COLLER_TOKEN_ICI" -H "X-Tenant: macrea" "http://localhost:3005/api/dashboard-mvp1/stats"
```

**PowerShell**:
```powershell
curl -H "Authorization: Bearer COLLER_TOKEN_ICI" -H "X-Tenant: macrea" "http://localhost:3005/api/dashboard-mvp1/stats" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

---

## ✅ Résultat Attendu

Si le patch fonctionne, vous verrez:

```json
{
  "stats": {
    "maxInteractions": 5  // Nombre réel d'actions M.A.X.
  },
  "recentActivity": [
    {
      "id": "log_...",
      "type": "max_interaction",
      "title": "Opportunité créée",
      "description": "Opportunité \"Test Dashboard\" créée (15000 €, stage: Prospecting)",
      "timestamp": "2025-12-23T20:30:00.000Z"
    },
    {
      "id": "log_...",
      "type": "max_interaction",
      "title": "Ticket support créé",
      "description": "Ticket \"Test Dashboard - Ticket\" créé (Normal, New)",
      "timestamp": "2025-12-23T20:29:30.000Z"
    }
    // ... autres VRAIES actions (pas Jean Dupont/Marie Martin)
  ]
}
```

---

## ❌ Si le test échoue

### Erreur 401 Unauthorized

**Solution**: Token expiré, récupérer un nouveau token (étape 1)

---

### `recentActivity: []` (vide)

**Solution**: Créer des actions de test:
```bash
cd d:\Macrea\CRM\max_backend
node test-dashboard-activities.js
```

Puis relancer le test.

---

### Encore les données mockées (Jean Dupont, Marie Martin)

**Solution**: Redémarrer le serveur backend:
```bash
cd d:\Macrea\CRM\max_backend
# Ctrl+C pour arrêter
npm start
```

Puis relancer le test.

---

## 🎉 Validation Finale

**Quick Fix validé** si `recentActivity` contient:
- ✅ Vraies actions M.A.X. (Opportunités, Tickets, Contacts)
- ✅ Timestamps réels (pas toujours "Il y a 15 min")
- ❌ Plus de "Jean Dupont", "Marie Martin", "Analyse CSV 25 leads"

**Durée totale**: < 1 minute