# Test Décisif - Dashboard Activités (10 secondes)

## 🎯 Objectif

Vérifier que le dashboard retourne les **vraies activités** depuis actionLogger au lieu de données mockées.

---

## 📋 Méthode 1: PowerShell (Recommandé Windows)

### Étape 1: Récupérer le token JWT

1. Ouvrir le frontend: `http://localhost:5173`
2. Se connecter
3. Ouvrir DevTools: **F12**
4. Onglet **Application** > **Local Storage** > `http://localhost:5173`
5. Chercher la clé `auth-storage`
6. Copier la valeur de `state.token` (commence par `eyJ...`)

### Étape 2: Lancer le test

```powershell
cd d:\Macrea\CRM\max_backend
.\test-decisif.ps1 "VOTRE_TOKEN_ICI"
```

**Exemple**:
```powershell
.\test-decisif.ps1 "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzEyMyIsImlhdCI6MTcwMDAwMDAwMH0.abc123def456"
```

### Résultat attendu:

```
🔍 TEST DÉCISIF - Dashboard Activités M.A.X.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 ÉTAPE 1: Créer des actions de test

   ✅ Opportunité créée
   ✅ Ticket créé

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 ÉTAPE 2: Vérifier actionLogger

   ✅ ActionLogger contient 5 logs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 ÉTAPE 3: Tester /dashboard-mvp1/stats avec JWT

   ✅ Réponse reçue (200 OK)

📊 RÉSULTATS:
   - Activités récentes: 5
   - Max Interactions: 5

🔍 Aperçu des activités:
   • Ticket support créé - Ticket "Test Décisif - Ticket" créé (High, New)
   • Opportunité créée - Opportunité "Test Décisif - Opportunité" créée (20000 €, stage: Negotiation)
   • Ticket support créé - Ticket "Test Dashboard - Ticket" créé (Normal, New)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 TEST DÉCISIF: ✅ RÉUSSI

Le dashboard retourne 5 activités réelles depuis actionLogger.
Les données mockées ont été remplacées avec succès!
```

---

## 📋 Méthode 2: CURL (Manuel)

### Étape 1: Récupérer le token (même procédure que ci-dessus)

### Étape 2: Test manuel

```bash
# Créer une action de test
curl -X POST "http://localhost:3005/api/action-layer/run" ^
  -H "Content-Type: application/json" ^
  -d "{\"actionType\":\"create_opportunity\",\"params\":{\"tenantId\":\"macrea\",\"name\":\"Test CURL\",\"amount\":15000,\"closeDate\":\"2025-08-01\",\"stage\":\"Prospecting\"}}"

# Vérifier actionLogger
curl "http://localhost:3005/api/action-layer/logs?limit=5&tenantId=macrea"

# Tester le dashboard (remplacer VOTRE_TOKEN)
curl "http://localhost:3005/api/dashboard-mvp1/stats" ^
  -H "Authorization: Bearer VOTRE_TOKEN" ^
  -H "X-Tenant: macrea"
```

---

## 📋 Méthode 3: Via Frontend (Visuel)

### Étape 1: Créer des actions

```bash
cd d:\Macrea\CRM\max_backend
node test-dashboard-activities.js
```

### Étape 2: Ouvrir le Dashboard

1. Frontend: `http://localhost:5173/dashboard`
2. Se connecter
3. Cliquer sur **"Actualiser"**

### Étape 3: Vérifier "Activité récente"

**AVANT le patch** (données mockées):
```
• Nouveau lead créé - Jean Dupont - contact@example.com
• Interaction M.A.X. - Analyse de fichier CSV (25 leads)
• Workflow déclenché - Email de bienvenue envoyé
• Lead converti - Marie Martin est devenue cliente
• Interaction M.A.X. - Proposition de stratégie de suivi
```

**APRÈS le patch** (vraies données):
```
• Ticket support créé - Ticket "Test Dashboard - Ticket" créé (Normal, New)
• Opportunité créée - Opportunité "Test Dashboard - Opportunité" créée (15000 €)
• Article KB créé - Article KB "Comment configurer SMTP" créé (Published)
• Contact créé - Contact "Sophie Martin" créé
```

---

## ✅ Critères de Validation

Le Quick Fix est **validé** si:

1. ✅ `/api/action-layer/logs` retourne des logs d'actions
2. ✅ `/api/dashboard-mvp1/stats` retourne `200 OK` avec JWT
3. ✅ `recentActivity` contient des vraies actions (pas Jean Dupont, Marie Martin)
4. ✅ `maxInteractions` correspond au nombre réel d'actions
5. ✅ Frontend affiche les vraies activités dans la section "Activité récente"

---

## ❌ Erreurs Possibles

### Erreur 401 Unauthorized

**Cause**: Token JWT invalide ou expiré

**Solution**:
1. Se reconnecter au frontend
2. Récupérer un nouveau token
3. Relancer le test

---

### Erreur "ActionLogger vide"

**Cause**: Aucune action n'a été exécutée récemment

**Solution**:
```bash
node test-dashboard-activities.js
```

Ou créer des actions via M.A.X. (chat, opportunités, tickets, etc.)

---

### Activités vides dans dashboard

**Cause**: Serveur backend pas redémarré après le patch

**Solution**:
1. Redémarrer le serveur:
   ```bash
   cd d:\Macrea\CRM\max_backend
   # Arrêter le processus Node.js actuel (Ctrl+C)
   npm start
   ```
2. Relancer le test

---

## 🎯 Validation Finale

Une fois le test PowerShell réussi:

1. ✅ Ouvrir le frontend
2. ✅ Actualiser le dashboard
3. ✅ Confirmer que les **vraies actions** s'affichent

**Durée totale**: < 10 secondes (avec token)

---

## 📊 Comparaison Avant/Après

| Métrique | AVANT | APRÈS |
|----------|-------|-------|
| Source données | Hardcodé (5 activités fictives) | actionLogger (logs réels) |
| Timestamps | Relatifs fictifs (15 min, 45 min, etc.) | Timestamps réels des actions |
| Données | Jean Dupont, Marie Martin | Opportunités, Tickets, Contacts réels |
| Max Interactions | 47 (hardcodé) | Nombre réel d'actions M.A.X. |
| Filtrage tenant | Non | Oui (via X-Tenant header) |
| Rafraîchissement | Jamais (toujours les mêmes) | Manuel (bouton "Actualiser") |

---

**Script créé**: [`test-decisif.ps1`](d:\Macrea\CRM\max_backend\test-decisif.ps1)
**Durée test**: < 10 secondes
**Prérequis**: Token JWT du frontend