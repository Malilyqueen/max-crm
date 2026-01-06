# 🚀 GUIDE DÉMARRAGE RAPIDE - Alertes Vivantes M.A.X.

**Temps estimé**: 5 minutes
**Objectif**: Voir le système en action avec des alertes de test

---

## ÉTAPE 1: Vérifier services running

### Backend (déjà running)
```bash
# Vérifier port 3005
curl http://localhost:3005/api/alerts/active -H "X-Tenant: macrea"
```

**Attendu**:
```json
{"success":true,"stats":{"total":0,"by_severity":{"high":0,"med":0,"low":0}},"alerts":[]}
```

✅ Si ça répond → Backend OK
❌ Si erreur → `cd max_backend && npm start`

---

### Frontend (déjà running)

Ouvrir navigateur:
```
http://localhost:5175/dashboard
```

✅ Si widget "Alertes M.A.X." visible avec message vert → Frontend OK
❌ Si page blanche → `cd max_frontend && npm run dev`

---

## ÉTAPE 2: Créer alertes de test

### Option A: Via Supabase Dashboard (RECOMMANDÉ)

1. Aller sur https://supabase.com
2. Ouvrir ton projet
3. Menu **SQL Editor**
4. Copier/coller le contenu de **[create-test-alert.sql](create-test-alert.sql)**
5. Cliquer **Run**

✅ Devrait retourner: "Success. 3 rows affected"

---

### Option B: Via API (alternative)

```bash
# Créer alerte high
curl -X POST "http://localhost:3005/api/alerts/test/create" \
  -H "X-Tenant: macrea" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "694d0bed15df5b9e1",
    "type": "NoContact7d",
    "severity": "high"
  }'
```

---

## ÉTAPE 3: Voir les alertes dans le widget

1. Retourner sur `http://localhost:5175/dashboard`
2. Cliquer sur **"Actualiser"** dans le widget "Alertes M.A.X."

**Tu devrais voir**:

```
┌─────────────────────────────────────────┐
│ Alertes M.A.X.                     [3]  │
│ [Actualiser]                            │
├─────────────────────────────────────────┤
│ [Haute: 1]  [Moyenne: 1]  [Basse: 1]   │
├─────────────────────────────────────────┤
│ ┃ AUCUN CONTACT DEPUIS 7 JOURS         │
│ ┃ Sophie Martin                         │
│ ┃ Aucun contact depuis 8 jours.        │
│ ┃ Lead à risque de perte.              │
│ ┃ sophie.martin@example.com            │
│ ┃ Créée le 20 décembre                 │
│ ┃ [Résoudre] [Relancer par WhatsApp]  │
│ └─────────────────────────────────────  │
│                                          │
│ ┃ PAS DE RÉPONSE DEPUIS 3 JOURS        │
│ ┃ Jean Dupont                          │
│ ┃ Aucune réponse depuis 4 jours...    │
│ ┃ [Résoudre] [Voir conversation]      │
│ └─────────────────────────────────────  │
│                                          │
│ ┃ AUCUN CONTACT DEPUIS 7 JOURS         │
│ ┃ Marie Dubois                         │
│ ┃ Relance suggérée.                    │
│ ┃ [Résoudre] [Envoyer email]          │
│ └─────────────────────────────────────  │
└─────────────────────────────────────────┘
```

---

## ÉTAPE 4: Tester résolution

1. **Cliquer sur "Résoudre"** sur la première alerte (haute sévérité)

**Comportement attendu**:
- ✅ Alerte disparaît **immédiatement** de la liste
- ✅ Compteur passe de **[3]** à **[2]**
- ✅ Badge "Haute: 1" disparaît

2. **Attendre 60 secondes** (auto-refresh)

**Comportement attendu**:
- ✅ Widget se rafraîchit automatiquement
- ✅ Alertes restent (2 alertes)

3. **Vérifier dans Supabase**

SQL Editor:
```sql
SELECT * FROM max_alerts
WHERE tenant_id = 'macrea'
ORDER BY created_at DESC;
```

**Attendu**:
- Alerte résolue a `resolved_at = NOW()`
- Alerte résolue a `resolved_by = 'user_manual'`

---

## ÉTAPE 5: Tester logging activité

### Logger une activité OUT (message envoyé)

```bash
cd max_backend
.\test-alerts-phase-a.ps1
```

**Résultat attendu**:
```
[2/4] STEP: Logger activite OUT (message envoye)

OK Activite OUT loggee:
   ID: 007d1212-7b63-4f02-876e-155e9afb6c9b
   Lead: 694d0bed15df5b9e1
   Channel: whatsapp (out)
```

### Vérifier dans Supabase

```sql
SELECT * FROM lead_activities
WHERE lead_id = '694d0bed15df5b9e1'
ORDER BY created_at DESC
LIMIT 5;
```

**Devrait montrer**:
- Nouvelles activités loggées
- `channel = 'whatsapp'`
- `direction = 'out'`
- `status = 'sent'`

---

## RÉSUMÉ VALIDATION

### ✅ Checklist rapide

- [ ] Backend répond sur port 3005
- [ ] Frontend affiche dashboard sur port 5175
- [ ] Widget "Alertes M.A.X." visible
- [ ] État empty affiche message "R.A.S. aujourd'hui..."
- [ ] 3 alertes test créées via SQL
- [ ] Widget affiche les 3 alertes après actualisation
- [ ] Badges sévérité affichés (rouge/jaune/bleu)
- [ ] Bouton "Résoudre" fonctionne (alerte disparaît)
- [ ] Compteur total décrémente
- [ ] Auto-refresh fonctionne (60s)
- [ ] Logging activité via test-alerts-phase-a.ps1 fonctionne
- [ ] Activités visibles dans Supabase

---

## TROUBLESHOOTING RAPIDE

### Widget affiche "Impossible de charger les alertes"

**Cause**: Backend down ou CORS

**Fix**:
```bash
# Redémarrer backend
cd max_backend
npm start
```

---

### Alertes test pas créées

**Cause**: Script SQL pas exécuté correctement

**Fix**:
1. Vérifier connexion Supabase
2. Copier EXACTEMENT le contenu de create-test-alert.sql
3. Vérifier résultat: "Success. 3 rows affected"

---

### Port 5173/5174 déjà utilisé

**Cause**: Processus Node zombies

**Fix**:
```bash
# Utiliser le port suggéré par Vite
# Si Vite dit "Port 5175", utiliser http://localhost:5175
```

---

### Widget ne rafraîchit pas automatiquement

**Cause**: Intervalle pas démarré

**Fix**:
- Rafraîchir page navigateur (F5)
- Vérifier console erreurs (F12)

---

## PROCHAINES ACTIONS

Maintenant que le système fonctionne:

1. **Tester en situation réelle**:
   - Envoyer vrai message WhatsApp via Chat M.A.X.
   - Vérifier activité loggée dans Supabase
   - Attendre création alerte naturelle (7 jours)

2. **Déployer en production**:
   - Suivre guide [SYSTEME_ALERTES_VIVANTES_COMPLET.md](SYSTEME_ALERTES_VIVANTES_COMPLET.md)
   - Section "Déploiement"

3. **Implémenter cron job**:
   - Génération alertes quotidienne
   - Voir roadmap Phase F

---

## RESSOURCES

**Documentation**:
- [SYSTEME_ALERTES_VIVANTES_COMPLET.md](SYSTEME_ALERTES_VIVANTES_COMPLET.md) - Doc technique complète
- [RECAP_FINAL_ALERTES.md](RECAP_FINAL_ALERTES.md) - Récapitulatif condensé

**Scripts tests**:
- `max_backend/test-alerts-phase-a.ps1` - Test WhatsApp
- `max_backend/test-alerts-phase-b.ps1` - Test Chat M.A.X.
- `create-test-alert.sql` - Alertes test Supabase

**Code source**:
- Widget: [max_frontend/src/components/dashboard/AlertsWidget.tsx](max_frontend/src/components/dashboard/AlertsWidget.tsx)
- API: [max_backend/routes/activities.js](max_backend/routes/activities.js)
- Logger: [max_backend/lib/activityLogger.js](max_backend/lib/activityLogger.js)

---

🎉 **Système opérationnel - Profite de tes alertes vivantes!**
