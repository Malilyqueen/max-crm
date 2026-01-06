# Super M.A.X. - Configuration Complète

## Mode: SUPER_MAX (ADMIN Verrouillé)

### ✅ Status: Opérationnel

**Confirmation:** Super M.A.X. opérationnel (ADMIN verrouillé)

---

## 🎯 Directives Opérationnelles

### 1. Rôle par Défaut = **ADMIN** (Opérateur Complet), **Verrouillé**
- Accès total au CRM via API Admin
- Pas d'accès à l'interface graphique (UI)
- Impossible de modifier les Layouts via API

### 2. **Single-Task Mode**: 1 Intention = 1 Exécution, puis STOP
- Une seule instruction utilisateur traitée à la fois
- Évite la saturation des tokens
- Division automatique des tâches complexes
- Attente de confirmation ("ok", "continue") avant la suite

### 3. **Budget Tokens ≤ 900** par Réponse (Pas de Stream)
- Limite stricte de 900 tokens par réponse
- Pas de streaming activé
- Timeout: 45 secondes
- Retries: 3 tentatives maximum

### 4. **PATCH Partiels Autorisés**
- Sans exiger `name/email/account` pour:
  - `tags`
  - `objectifs`
  - `servicesSouhaites`
  - `statutActions`
  - `prochainesEtapes`
- Ne jamais "skipper" un enregistrement pour champs manquants

### 5. **Fallback Automatique**
- Si bouton/payload échoue (400/404):
  - Rejouer l'intention en texte automatiquement
  - Pas de redemande de confirmation
- Résolution des leads par nom/email (pas uniquement ID)
- 404 sur suppression = "succès partiel" (déjà supprimé)

### 6. **Sortie Obligatoire**: Résumé Court + **Tableau Markdown** + **JSON MACHINE**
#### Format de sortie standard:
```
## Résumé
[6 lignes max]

## Tableau
| Nom | Email | Compte | Tags | Objectifs | Services | Statut | Prochaines | Modifié le |
|-----|-------|--------|------|-----------|----------|--------|------------|------------|
| ... | ...   | ...    | ...  | ...       | ...      | ...    | ...        | ...        |

## JSON MACHINE
```json
{
  "role_actuel": "ADMIN",
  "statut": "SUCCESS",
  "tokens_utilises": 650,
  "errors": [],
  "results": [...]
}
```
```

### 7. **Layouts**: Pas via API
- Afficher procédure manuelle:
  - Admin → Entity Manager → Lead → Layouts (Detail/List)
  - Ajouter champs personnalisés
  - Rebuild
- Fournir un **snapshot** des données en attendant

### 8. **Logs par Run**
Chaque exécution log:
- `role_actuel`: ADMIN (verrouillé)
- `statut`: SUCCESS / ERROR
- `tokens_utilises`: nombre de tokens consommés
- `errors[]`: liste des erreurs rencontrées

---

## ⚙️ Configuration Technique

### Fichiers Modifiés

#### 1. [data/agent_identity.json](../data/agent_identity.json)
Configuration Super M.A.X. complète avec:
- Mode: SUPER_MAX
- Role lock: ADMIN forcé
- Operational rules
- Patch policy
- Fallback policy
- Layout policy
- Telemetry

#### 2. [.env](../.env)
Flags de configuration:
```env
MAX_DEFAULT_ROLE=ADMIN
MAX_FORCE_ADMIN=true
FEATURE_COPILOT_MODE=false
MAX_RESPONSE_TOKENS=900
MAX_STREAM=false
MAX_REQUEST_TIMEOUT_MS=45000
MAX_RETRY_ATTEMPTS=3
```

#### 3. [lib/roleGate.js](../lib/roleGate.js) ⭐ NOUVEAU
Role Gate Middleware pour bridage futur:
- `getCurrentRole()`: Retourne ADMIN ou COPILOT
- `isMethodAllowed()`: Vérifie si méthode HTTP autorisée
- `isToolAllowed()`: Vérifie si tool autorisé
- `roleGateMiddleware()`: Middleware Express
- `checkToolAccess()`: Vérification avant exécution tool
- `createTelemetry()`: Génère logs structurés

---

## 🔒 Bridage Futur (Préparé, Non Activé)

### Activation Mode COPILOT (Lecture Seule)

Pour activer le mode limité ultérieurement:

1. **Modifier `.env`:**
   ```env
   FEATURE_COPILOT_MODE=true
   ```

2. **Redémarrer le serveur**

3. **Comportement en mode COPILOT:**
   - ❌ Écritures bloquées (POST/PUT/PATCH/DELETE)
   - ❌ Tools admin bloqués (update_lead_fields, create_custom_field, etc.)
   - ✅ Lectures autorisées (GET)
   - ✅ Suggestions et analyses autorisées
   - Message d'erreur clair: "⚠️ Droits insuffisants. Mon rôle actuel est 'COPILOT'..."

### Tools Bloqués en Mode COPILOT
- `update_lead_fields`
- `update_leads_in_espo`
- `delete_leads_from_espo`
- `create_custom_field`
- `import_leads_to_crm`

---

## 🧪 Prompts de Test

### Test 1: PATCH Partiel + Snapshot
```
Ajoute #prioritaire et mets statutActions="relancer sous 7 jours" pour email=hello@boutiquemiel.ch. Affiche le snapshot.
```

**Attendu:**
- Résolution par email
- PATCH partiel (tags + statutActions uniquement)
- Tableau + JSON MACHINE

### Test 2: Résolution Nom+Compte, Sans Toucher aux Autres Champs
```
Mets objectifs="Refonte site + Ads" pour name="Moussa Sow", account="QMix Paris". Ne modifie rien d'autre. Snapshot.
```

**Attendu:**
- Résolution par nom + account
- PATCH uniquement objectifs
- Autres champs intacts
- Tableau + JSON MACHINE

### Test 3: Fallback Simulé
```
Exécute d'abord via bouton/payload; si échec 400/404, rejoue en texte. Affiche tableau + JSON MACHINE.
```

**Attendu:**
- Tentative avec payload
- Si erreur: replay automatique en texte
- Tableau + JSON MACHINE
- Pas de redemande confirmation

---

## 📊 Métriques Actuelles

**Budget Tokens (au 2025-11-11):**
- Budget Total: 1 000 000 tokens
- Tokens Utilisés: 228 924 tokens (22.9%)
- Tokens Restants: 771 076 tokens
- Coût: 0.064 USD
- Moyenne par tâche: ~6 955 tokens

**Avec limite 900 tokens:**
- Réduction estimée: **87%**
- Nouvelles tâches possibles: **~857 tâches**

---

## 🚀 Démarrage

### Redémarrer le Serveur
```bash
cd d:\Macrea\CRM\max_backend
node server.js
```

### Vérifier le Rôle Actuel
```bash
curl http://127.0.0.1:3005/api/health
```

Devrait retourner:
```json
{
  "ok": true,
  "role": "ADMIN",
  "mode": "SUPER_MAX",
  "copilot_mode": false
}
```

---

## 📚 Documentation Complémentaire

- [OPERATIONAL_RULES.md](OPERATIONAL_RULES.md) - Règles opérationnelles détaillées
- [INSTRUCTIONS_MAX.md](INSTRUCTIONS_MAX.md) - Instructions pour l'utilisateur
- [../lib/roleGate.js](../lib/roleGate.js) - Code du Role Gate

---

**Date de création:** 2025-11-11
**Version:** Super M.A.X. v1.0
**Status:** ✅ Opérationnel (ADMIN verrouillé)
