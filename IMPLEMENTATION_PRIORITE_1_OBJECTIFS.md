# ✅ PRIORITÉ 1 - OBJECTIFS - IMPLÉMENTATION COMPLÉTÉE

**Date** : 2025-12-10
**Statut** : ✅ COMPLÉTÉ - Prêt pour test

---

## 📦 Ce qui a été implémenté

### 1. Base de données (Supabase)

**Fichier** : [`migrations/001_create_tenant_goals.sql`](max_backend/migrations/001_create_tenant_goals.sql)

✅ Table `tenant_goals` créée avec :
- Champs : `id`, `tenant_id`, `goal_text`, `goal_category`, `target_value`, `current_value`, `unit`, `deadline`, `status`, `priority`, `archived`, `metadata`
- Index sur `tenant_id`, `status`, `archived`, `priority`, `deadline`
- Trigger auto-update `updated_at`
- Soft delete via `archived` booléen

### 2. Fonctions backend

**Fichier** : [`lib/tenantGoals.js`](max_backend/lib/tenantGoals.js)

✅ Fonctions créées :
- `createTenantGoal(goalData)` - Créer un objectif
- `getTenantGoals(tenantId, filters)` - Récupérer objectifs avec filtres
- `updateTenantGoal(goalId, tenantId, updates)` - Mettre à jour
- `archiveTenantGoal(goalId, tenantId, reason)` - Archiver (soft delete)
- `getTenantGoalById(goalId, tenantId)` - Récupérer un objectif spécifique
- `calculateGoalProgress(goal)` - Calculer % progression
- `isGoalDeadlineNear(goal, daysThreshold)` - Détecter deadline proche
- `formatGoalForDisplay(goal)` - Formater pour affichage

### 3. Routes API REST

**Fichier** : [`routes/tenantGoals.js`](max_backend/routes/tenantGoals.js)

✅ Routes créées :
- `POST /api/tenant/goals` - Créer objectif
- `GET /api/tenant/goals` - Liste objectifs (avec filtres)
- `GET /api/tenant/goals/:goalId` - Objectif spécifique
- `PATCH /api/tenant/goals/:goalId` - Modifier objectif
- `DELETE /api/tenant/goals/:goalId` - Archiver objectif
- `POST /api/tenant/goals/:goalId/progress` - Mettre à jour progression

Toutes les routes utilisent `authMiddleware` et extraient `tenant_id` depuis JWT.

### 4. Tools M.A.X. (Function Calling)

**Fichier** : [`lib/maxTools.js`](max_backend/lib/maxTools.js:911-1141)

✅ Tools ajoutés :
- `store_tenant_goal` - M.A.X. enregistre un objectif
- `update_tenant_goal` - M.A.X. met à jour progression/deadline
- `archive_tenant_goal` - M.A.X. archive un objectif
- `get_tenant_context` - M.A.X. charge objectifs + profil + notes silencieusement

### 5. Handlers des tools

**Fichier** : [`routes/chat.js`](max_backend/routes/chat.js:2942-3127)

✅ Cases ajoutés dans `executeToolCall()` :
- `case 'store_tenant_goal'` - Créer objectif via tool
- `case 'update_tenant_goal'` - Mettre à jour via tool
- `case 'archive_tenant_goal'` - Archiver via tool
- `case 'get_tenant_context'` - Charger contexte complet

Tous les handlers utilisent `conversation.tenantId || 'macrea'` pour multi-tenant.

### 6. RÈGLE #8 dans ULTRA_PRIORITY_RULES

**Fichier** : [`prompts/ULTRA_PRIORITY_RULES.txt`](max_backend/prompts/ULTRA_PRIORITY_RULES.txt:332-461)

✅ RÈGLE #8 ajoutée :
- Détection intention (lexicale + sémantique)
- Classification automatique (objectif vs profil vs note)
- Confirmation obligatoire après mémorisation
- Gestion oubli (soft delete)
- Utilisation automatique pour questions stratégiques
- Règles anti-hallucination strictes

### 7. Intégration server.js

**Fichier** : [`server.js`](max_backend/server.js:52,100)

✅ Routes montées :
- Import du router : `import tenantGoalsRouter from './routes/tenantGoals.js'`
- Montage : `app.use('/api/tenant/goals', tenantGoalsRouter)`

---

## 🧪 Tests à effectuer

### Test 1 : Créer table Supabase

```sql
-- Exécuter dans Supabase SQL Editor
\i max_backend/migrations/001_create_tenant_goals.sql

-- Vérifier que la table existe
SELECT * FROM tenant_goals LIMIT 1;
```

### Test 2 : API REST - Créer un objectif

```bash
curl -X POST http://localhost:3005/api/tenant/goals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "goal_text": "Atteindre 5000 clients actifs",
    "goal_category": "acquisition",
    "target_value": 5000,
    "unit": "clients",
    "deadline": "2025-03-31T23:59:59Z",
    "priority": 90
  }'
```

**Réponse attendue** :

```json
{
  "ok": true,
  "goal_id": "uuid-de-lobjectif",
  "goal": { ... },
  "message": "Objectif créé avec succès"
}
```

### Test 3 : API REST - Récupérer objectifs

```bash
curl -X GET "http://localhost:3005/api/tenant/goals?status=actif" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Réponse attendue** :

```json
{
  "ok": true,
  "goals": [
    {
      "id": "uuid",
      "goal_text": "Atteindre 5000 clients actifs",
      "target_value": 5000,
      "current_value": 0,
      "unit": "clients",
      "status": "actif",
      "priority": 90,
      "progress_percentage": 0,
      "formatted_text": "Atteindre 5000 clients actifs (0/5000 clients - 0%) - échéance dans 111j"
    }
  ],
  "count": 1
}
```

### Test 4 : M.A.X. - Détecter et enregistrer objectif

**Message utilisateur** :

```
"Note que mon objectif est d'atteindre 5000 clients avant mars 2025."
```

**Comportement attendu de M.A.X.** :

1. Détection : "Note que mon objectif" → déclencheur explicite
2. Classification : "atteindre 5000 clients" → OBJECTIF (mesurable, métrique, deadline)
3. Appel tool : `store_tenant_goal`
   ```json
   {
     "goal_text": "Atteindre 5000 clients",
     "goal_category": "acquisition",
     "target_value": 5000,
     "unit": "clients",
     "deadline": "2025-03-31T23:59:59Z"
   }
   ```
4. Confirmation :
   ```
   ✅ Objectif enregistré :

   📝 Atteindre 5000 clients avant mars 2025

   Je vais maintenant suivre ta progression et adapter mes recommandations pour t'aider à atteindre cet objectif.
   ```

### Test 5 : M.A.X. - Utilisation automatique des objectifs

**Message utilisateur** :

```
"Comment améliorer mes ventes ?"
```

**Comportement attendu de M.A.X.** :

1. Appel silencieux : `get_tenant_context()`
   - Charge objectifs actifs
   - Charge profil
   - Charge événements récents 72h
2. Réponse adaptée mentionnant l'objectif :
   ```
   Pour atteindre tes 5000 clients, voici ce que je recommande :

   1️⃣ Segmenter tes leads par potentiel
   2️⃣ Automatiser les relances via n8n
   3️⃣ Suivre la progression chaque semaine

   Tu es actuellement à 0/5000 (0%). Si tu convertis 50 leads par semaine, tu atteindras ton objectif en temps.
   ```

### Test 6 : M.A.X. - Mise à jour progression

**Message utilisateur** :

```
"J'ai maintenant 3200 clients."
```

**Comportement attendu de M.A.X.** :

1. Détection : mise à jour de progression
2. Appel tool : `update_tenant_goal`
   ```json
   {
     "goal_id": "uuid-de-lobjectif",
     "current_value": 3200
   }
   ```
3. Confirmation :
   ```
   ✅ Progression mise à jour !

   📊 Atteindre 5000 clients : 3200/5000 (64%)

   Tu as progressé de 64% vers ton objectif. Plus que 1800 clients à atteindre avant mars 2025 !
   ```

### Test 7 : M.A.X. - Archiver objectif

**Message utilisateur** :

```
"Supprime mon objectif de 5000 clients."
```

**Comportement attendu de M.A.X.** :

1. Détection : "Supprime mon objectif" → déclencheur d'oubli
2. Appel tool : `archive_tenant_goal`
   ```json
   {
     "goal_id": "uuid-de-lobjectif",
     "reason": "Demande utilisateur"
   }
   ```
3. Confirmation :
   ```
   ✅ J'ai archivé ton objectif 'Atteindre 5000 clients'.

   Je ne le prendrai plus en compte dans mes recommandations.
   ```

### Test 8 : Edge case - Objectif ambigu

**Message utilisateur** :

```
"Je veux automatiser mes relances."
```

**Comportement attendu de M.A.X.** :

Demande clarification :

```
Je peux enregistrer ceci de deux façons :

1️⃣ Comme un **objectif** : "Automatiser les relances clients"
   → Suivi de progression, deadline possible

2️⃣ Comme une **préférence stratégique** : "Privilégier l'automatisation"
   → Appliqué à toutes les recommandations futures

Comment veux-tu que je le classe ?
```

### Test 9 : Edge case - Objectif contradictoire

**Prérequis** : Objectif existant "Atteindre 3000 clients"

**Message utilisateur** :

```
"Mon objectif est d'atteindre 5000 clients."
```

**Comportement attendu de M.A.X.** :

Demande confirmation :

```
📊 Ton objectif actuel est : "Atteindre 3000 clients" (progression : 65%)

Tu viens de mentionner un nouvel objectif : "Atteindre 5000 clients"

Options :
1️⃣ **Remplacer** l'objectif actuel (3000 → 5000)
2️⃣ **Ajouter** un nouvel objectif distinct (garder les deux)
3️⃣ **Archiver** l'ancien et créer le nouveau

Quelle option préfères-tu ?
```

---

## 📊 Vérifications Supabase

Après les tests, vérifier dans Supabase :

```sql
-- Voir tous les objectifs du tenant
SELECT
  id,
  goal_text,
  target_value,
  current_value,
  unit,
  status,
  priority,
  deadline,
  archived,
  created_at
FROM tenant_goals
WHERE tenant_id = 'macrea'
ORDER BY priority DESC, created_at DESC;

-- Compter objectifs actifs
SELECT COUNT(*) as objectifs_actifs
FROM tenant_goals
WHERE tenant_id = 'macrea'
  AND archived = FALSE
  AND status = 'actif';

-- Voir objectifs archivés
SELECT goal_text, archived_at, metadata->>'archive_reason' as reason
FROM tenant_goals
WHERE tenant_id = 'macrea'
  AND archived = TRUE
ORDER BY archived_at DESC;
```

---

## 🚀 Prochaines étapes

### PRIORITÉ 2 : PROFIL (Préférences, contraintes, style)

Utiliser `tenant_memory` avec `memory_type = 'profile'`

**Tools à créer** :
- `store_tenant_profile` - Enregistrer préférence
- `update_tenant_profile` - Modifier préférence
- `archive_tenant_profile` - Supprimer préférence

### PRIORITÉ 3 : NOTES LONGUES (Contexte, réflexions, nuances)

Utiliser `tenant_memory` avec `memory_type = 'note'`

**Tools à créer** :
- `store_long_term_note` - Enregistrer note
- `archive_long_term_note` - Supprimer note

---

## ✅ Checklist de validation

- [x] Table `tenant_goals` créée dans Supabase
- [x] Fonctions backend créées (`tenantGoals.js`)
- [x] Routes API REST créées et montées
- [x] Tools M.A.X. ajoutés (`maxTools.js`)
- [x] Handlers tools implémentés (`chat.js`)
- [x] RÈGLE #8 ajoutée (`ULTRA_PRIORITY_RULES.txt`)
- [ ] Migration SQL exécutée dans Supabase
- [ ] Tests API REST effectués
- [ ] Tests M.A.X. effectués (détection, enregistrement, utilisation)
- [ ] Vérifications Supabase effectuées

---

**Date de complétion implémentation** : 2025-12-10
**Status** : ✅ PRIORITÉ 1 COMPLÉTÉE - Prêt pour tests
