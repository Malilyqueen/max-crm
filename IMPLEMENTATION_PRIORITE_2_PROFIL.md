# ✅ PRIORITÉ 2 - PROFIL - IMPLÉMENTATION COMPLÉTÉE

**Date** : 2025-12-10
**Statut** : ✅ COMPLÉTÉ - Prêt pour test

---

## 📦 Ce qui a été implémenté

### 1. Réutilisation table existante

**Table** : `tenant_memory` (déjà existante)

✅ Utilisation avec `memory_type = 'profile'` pour distinguer des autres types de mémoire
- Pas de migration SQL nécessaire
- Réutilisation infrastructure existante
- `expires_at = null` pour permanence
- Soft delete via `archived` booléen

### 2. Tools M.A.X. (Function Calling)

**Fichier** : [`lib/maxTools.js`](max_backend/lib/maxTools.js:1140-1258)

✅ Tools ajoutés :
- `store_tenant_profile` - M.A.X. enregistre une préférence/contrainte
- `update_tenant_profile` - M.A.X. met à jour une préférence existante
- `archive_tenant_profile` - M.A.X. supprime une préférence (soft delete)

**Détails `store_tenant_profile`** :

```json
{
  "profile_key": "canal_contact_prefere",
  "profile_value": "WhatsApp",
  "category": "canal",
  "priority": 90
}
```

**Catégories supportées** :
- `canal` - Canal de communication préféré
- `style_communication` - Ton, vouvoiement/tutoiement
- `contrainte` - Interdictions, limitations métier
- `cible_client` - Type de clients visés
- `methode_travail` - Outils, processus préférés
- `secteur` - Secteur d'activité
- `other` - Autres préférences

### 3. Handlers des tools

**Fichier** : [`routes/chat.js`](max_backend/routes/chat.js:3129-3293)

✅ Cases ajoutés dans `executeToolCall()` :
- `case 'store_tenant_profile'` - Créer préférence via tool
- `case 'update_tenant_profile'` - Mettre à jour via tool (avec détection contradiction)
- `case 'archive_tenant_profile'` - Archiver via tool (soft delete)

Tous les handlers utilisent :
- `setTenantMemory()` avec `memory_type='profile'`
- `getTenantMemory()` pour vérifier existence
- `conversation.tenantId || 'macrea'` pour multi-tenant
- `expires_at: null` pour permanence
- `priority: 80` par défaut (vs 50 pour objectifs)

**Imports ajoutés** (ligne 52) :

```javascript
import { logMaxAction, upsertSession, setTenantMemory, getTenantMemory }
  from '../lib/maxLogger.js';
```

### 4. RÈGLE #8 étendue dans ULTRA_PRIORITY_RULES

**Fichier** : [`prompts/ULTRA_PRIORITY_RULES.txt`](max_backend/prompts/ULTRA_PRIORITY_RULES.txt:380-434)

✅ Section PROFIL ajoutée avec :
- Classification automatique (préférence vs objectif vs note)
- 5 exemples concrets de profil
- Différenciation claire OBJECTIF vs PROFIL
- Gestion mise à jour et suppression
- Détection contradiction

**Critères de classification PROFIL** :
- ✅ Préférence stable (pas temporaire)
- ✅ Canal de communication
- ✅ Style de communication
- ✅ Contrainte métier / interdiction
- ✅ Cible client type
- ✅ Méthode de travail
- ✅ **PAS de notion de progression ou deadline**

---

## 🧪 Tests à effectuer

### Test 1 : M.A.X. - Détecter et enregistrer préférence canal

**Message utilisateur** :

```
"Note que je préfère WhatsApp aux emails pour contacter mes clients."
```

**Comportement attendu de M.A.X.** :

1. Détection : "Note que je préfère" → déclencheur explicite
2. Classification : "WhatsApp aux emails" → PROFIL (préférence canal stable)
3. Appel tool : `store_tenant_profile`
   ```json
   {
     "profile_key": "canal_contact_prefere",
     "profile_value": "WhatsApp",
     "category": "canal",
     "priority": 90
   }
   ```
4. Confirmation :
   ```
   ✅ Préférence enregistrée :

   📝 Canal de contact préféré : WhatsApp

   Je vais maintenant privilégier WhatsApp dans toutes mes recommandations de relances et de suivi client.
   ```

### Test 2 : M.A.X. - Détecter et enregistrer contrainte métier

**Message utilisateur** :

```
"Retiens que je ne fais jamais de publicité Facebook, budget trop limité."
```

**Comportement attendu de M.A.X.** :

1. Détection : "Retiens que" → déclencheur explicite
2. Classification : "je ne fais jamais" → PROFIL (contrainte/interdiction)
3. Appel tool : `store_tenant_profile`
   ```json
   {
     "profile_key": "contrainte_marketing",
     "profile_value": {
       "interdiction": "publicité Facebook",
       "raison": "budget limité"
     },
     "category": "contrainte",
     "priority": 85
   }
   ```
4. Confirmation :
   ```
   ✅ Contrainte enregistrée :

   📝 Pas de publicité Facebook (budget limité)

   Je ne te proposerai plus d'actions marketing payantes sur Facebook.
   ```

### Test 3 : M.A.X. - Détecter et enregistrer cible client

**Message utilisateur** :

```
"Je travaille uniquement avec des PME B2B dans le secteur tech."
```

**Comportement attendu de M.A.X.** :

1. Détection : "Je travaille uniquement avec" → déclencheur implicite
2. Classification : "PME B2B secteur tech" → PROFIL (cible client stable)
3. Appel tool : `store_tenant_profile`
   ```json
   {
     "profile_key": "cible_client_type",
     "profile_value": "PME B2B secteur tech",
     "category": "cible_client",
     "priority": 80
   }
   ```
4. Confirmation :
   ```
   ✅ Cible client enregistrée :

   📝 PME B2B secteur tech

   Je vais adapter toutes mes recommandations pour ce type de client.
   ```

### Test 4 : M.A.X. - Utilisation automatique des préférences

**Prérequis** : Profil enregistré `canal_contact_prefere = "WhatsApp"`

**Message utilisateur** :

```
"Comment relancer mes prospects inactifs ?"
```

**Comportement attendu de M.A.X.** :

1. Appel silencieux : `get_tenant_context()`
   - Charge profil (canal préféré)
   - Charge objectifs actifs
   - Charge événements récents
2. Réponse adaptée mentionnant la préférence **SANS dire qu'il l'a chargée** :
   ```
   Voici ma stratégie de relance pour réactiver tes prospects :

   1️⃣ Segmenter par niveau d'engagement
   2️⃣ Relancer via WhatsApp avec message personnalisé
   3️⃣ Automatiser les relances récurrentes avec n8n
   4️⃣ Suivre les taux de réponse par segment

   Message WhatsApp type :
   "Salut [Prénom], je voulais prendre des nouvelles de ton projet [X]. Est-ce que tu as avancé sur [contexte] ?"
   ```

### Test 5 : M.A.X. - Mise à jour préférence (compatible)

**Prérequis** : Profil enregistré `canal_contact_prefere = "WhatsApp"`

**Message utilisateur** :

```
"Finalement, je préfère appeler directement mes prospects plutôt que WhatsApp."
```

**Comportement attendu de M.A.X.** :

1. Détection : changement de préférence
2. Appel tool : `update_tenant_profile`
   ```json
   {
     "profile_key": "canal_contact_prefere",
     "profile_value": "Appel téléphonique"
   }
   ```
3. Confirmation avec mention de l'ancienne valeur :
   ```
   ✅ Préférence mise à jour !

   Canal préféré : WhatsApp → Appel téléphonique

   Je vais maintenant privilégier les appels directs dans mes recommandations.
   ```

### Test 6 : M.A.X. - Archiver préférence

**Message utilisateur** :

```
"Supprime ma contrainte sur Facebook, j'ai maintenant du budget."
```

**Comportement attendu de M.A.X.** :

1. Détection : "Supprime ma contrainte" → déclencheur d'oubli
2. Appel tool : `archive_tenant_profile`
   ```json
   {
     "profile_key": "contrainte_marketing"
   }
   ```
3. Confirmation :
   ```
   ✅ J'ai supprimé ta contrainte 'contrainte_marketing'.

   Je peux maintenant te proposer des actions marketing sur Facebook.
   ```

### Test 7 : Edge case - Différenciation OBJECTIF vs PROFIL

**Message utilisateur** :

```
"Je veux automatiser mes relances clients avant mars."
```

**Comportement attendu de M.A.X.** :

Classification : **OBJECTIF** (deadline = mars)

```
✅ Objectif enregistré :

📝 Automatiser les relances clients avant mars 2025

Je vais te proposer un plan d'action pour mettre en place cette automatisation d'ici mars.
```

**VS**

**Message utilisateur** :

```
"Je préfère automatiser mes relances plutôt que de les faire manuellement."
```

**Comportement attendu de M.A.X.** :

Classification : **PROFIL** (préférence méthode de travail stable, sans deadline)

```
✅ Préférence enregistrée :

📝 Méthode de travail : Automatisation des relances

Je vais privilégier les solutions automatisées (n8n, workflows) dans toutes mes recommandations de relances.
```

### Test 8 : Edge case - Préférence contradictoire

**Prérequis** : Profil existant `style_communication = "tutoiement"`

**Message utilisateur** :

```
"En fait, je vouvoie mes clients."
```

**Comportement attendu de M.A.X.** :

Demande confirmation :

```
📊 Ta préférence actuelle : Tutoiement

Tu viens de mentionner : Vouvoiement

Options :
1️⃣ **Remplacer** par vouvoiement (appliqué partout)
2️⃣ **Nuancer** : tutoiement pour prospects, vouvoiement pour clients

Quelle option préfères-tu ?
```

### Test 9 : Edge case - Combinaison objectif + profil dans même phrase

**Message utilisateur** :

```
"Mon objectif est d'atteindre 3000 clients B2B, sachant que je travaille uniquement dans le secteur santé et que je préfère WhatsApp."
```

**Comportement attendu de M.A.X.** :

Décomposition intelligente :

1. Appel `store_tenant_goal` :
   ```json
   {
     "goal_text": "Atteindre 3000 clients B2B",
     "target_value": 3000,
     "unit": "clients",
     "goal_category": "acquisition"
   }
   ```

2. Appel `store_tenant_profile` (cible) :
   ```json
   {
     "profile_key": "cible_client_secteur",
     "profile_value": "secteur santé",
     "category": "secteur"
   }
   ```

3. Appel `store_tenant_profile` (canal) :
   ```json
   {
     "profile_key": "canal_contact_prefere",
     "profile_value": "WhatsApp",
     "category": "canal"
   }
   ```

4. Confirmation groupée :
   ```
   ✅ J'ai enregistré :

   🎯 Objectif : Atteindre 3000 clients B2B
   📝 Cible : Secteur santé
   📝 Canal préféré : WhatsApp

   Je vais adapter toutes mes recommandations pour t'aider à atteindre 3000 clients B2B dans le secteur santé, en privilégiant WhatsApp pour les relances.
   ```

---

## 📊 Vérifications Supabase

Après les tests, vérifier dans Supabase :

```sql
-- Voir toutes les préférences du tenant
SELECT
  id,
  memory_key,
  memory_value,
  memory_type,
  priority,
  created_at,
  updated_at,
  archived
FROM tenant_memory
WHERE tenant_id = 'macrea'
  AND memory_type = 'profile'
ORDER BY priority DESC, created_at DESC;

-- Compter préférences actives
SELECT COUNT(*) as preferences_actives
FROM tenant_memory
WHERE tenant_id = 'macrea'
  AND memory_type = 'profile'
  AND archived = FALSE;

-- Voir préférences archivées
SELECT
  memory_key,
  memory_value,
  archived_at,
  metadata->>'archive_reason' as reason
FROM tenant_memory
WHERE tenant_id = 'macrea'
  AND memory_type = 'profile'
  AND archived = TRUE
ORDER BY archived_at DESC;

-- Voir préférences par catégorie
SELECT
  metadata->>'category' as category,
  COUNT(*) as count
FROM tenant_memory
WHERE tenant_id = 'macrea'
  AND memory_type = 'profile'
  AND archived = FALSE
GROUP BY metadata->>'category'
ORDER BY count DESC;
```

---

## 🆚 Différences OBJECTIFS vs PROFIL

| Critère | OBJECTIF | PROFIL |
|---------|----------|--------|
| **Table** | `tenant_goals` | `tenant_memory` (type='profile') |
| **Nature** | Résultat à atteindre | Préférence stable |
| **Progression** | ✅ Oui (current_value/target_value) | ❌ Non |
| **Deadline** | ✅ Peut avoir une date | ❌ Jamais de date |
| **Priorité par défaut** | 50 | 80 |
| **Expiration** | Jamais (`archived_at` si atteint) | Jamais (`expires_at = null`) |
| **Exemples** | "Atteindre 5000 clients", "Augmenter CA de 20%" | "Préfère WhatsApp", "Travaille avec PME B2B" |

---

## 🚀 Prochaines étapes

### PRIORITÉ 3 : NOTES LONGUES (Contexte, réflexions, nuances)

Utiliser `tenant_memory` avec `memory_type = 'note'`

**Tools à créer** :
- `store_long_term_note` - Enregistrer note contextuelle
- `archive_long_term_note` - Supprimer note

**Caractéristiques** :
- Texte libre (pas de structure key/value)
- Pas d'expiration (`expires_at = null`)
- Priorité par défaut : 60
- Usage : pivots business, contraintes temporaires, réflexions stratégiques

**Exemples** :
- "Je suis en plein pivot vers le B2B"
- "Période difficile, je cherche des revenus rapides"
- "Je teste une nouvelle approche de prospection LinkedIn"

---

## ✅ Checklist de validation PRIORITÉ 2

- [x] Tools M.A.X. créés (`store_tenant_profile`, `update_tenant_profile`, `archive_tenant_profile`)
- [x] Handlers tools implémentés dans `chat.js`
- [x] RÈGLE #8 étendue avec section PROFIL dans `ULTRA_PRIORITY_RULES.txt`
- [x] Imports `setTenantMemory`, `getTenantMemory` ajoutés dans `chat.js`
- [ ] Tests M.A.X. effectués (détection, enregistrement, utilisation)
- [ ] Vérifications Supabase effectuées
- [ ] Edge cases testés (contradiction, combinaison objectif+profil)

---

**Date de complétion implémentation** : 2025-12-10
**Status** : ✅ PRIORITÉ 2 COMPLÉTÉE - Prêt pour tests
