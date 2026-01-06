# 🔧 HARDCODES RESTANTS - Correctifs par Lots

**Date**: 26 décembre 2025
**Post**: Phase 1 Sécurité terminée
**Focus**: Chemins Windows + IDs fixes + Multi-tenant

---

## 📊 RÉSUMÉ HARDCODES RESTANTS

| Catégorie | Occurrences | Criticité | Impact Docker |
|-----------|-------------|-----------|---------------|
| **Chemins Windows `D:\`** | 10 fichiers | 🔴 CRITIQUE | ❌ Bloquant |
| **User IDs fixes** | 4 locations | 🔴 CRITIQUE | ❌ Multi-tenant cassé |
| **localhost fallbacks** | 8 fichiers | ⚠️ IMPORTANT | ⚠️ Prod cassé si .env manquant |
| **Ports hardcodés** | 3 fichiers | ⚠️ MODÉRÉ | ⚠️ Multi-tenant cassé |

---

## 🔴 LOT 1: CHEMINS WINDOWS (BLOQUANT DOCKER)

### Fichiers à corriger:

#### 1.1 `lib/layoutManager.js` (LIGNE 12)

**Avant**:
```javascript
const LAYOUTS_LEGACY_DIR = 'D:\\Macrea\\xampp\\htdocs\\espocrm\\custom\\Espo\\Custom\\Resources\\layouts';
```

**Après**:
```javascript
const ESPOCRM_ROOT = process.env.ESPOCRM_ROOT;
if (!ESPOCRM_ROOT) {
  throw new Error('ESPOCRM_ROOT manquant dans .env (ex: /var/www/html/espocrm)');
}
const LAYOUTS_LEGACY_DIR = path.join(ESPOCRM_ROOT, 'custom/Espo/Custom/Resources/layouts');
```

#### 1.2 `lib/phpExecutor.js` (LIGNE 15, 18)

**État actuel**: Utilise PHP CLI Windows + chemins absolus

**Recommandation**: ❌ **DÉSACTIVER COMPLÈTEMENT**

**Raison**:
- `D:\Macrea\xampp\php\php.exe` n'existe pas en Docker
- `/Admin/rebuild` et `/Admin/clearCache` API fonctionnent ✅

**Action**:
```javascript
// lib/phpExecutor.js - DÉSACTIVER
export async function espoRebuild() {
  console.warn('[phpExecutor] DEPRECATED - Utiliser espoAdminFetch("/Admin/rebuild") à la place');
  throw new Error('phpExecutor.espoRebuild() est désactivé en production Docker. Utiliser API /Admin/rebuild');
}

export async function espoClearCache() {
  console.warn('[phpExecutor] DEPRECATED - Utiliser espoAdminFetch("/Admin/clearCache") à la place');
  throw new Error('phpExecutor.espoClearCache() est désactivé en production Docker. Utiliser API /Admin/clearCache');
}
```

#### 1.3 Scripts maintenance (10+ fichiers)

**Fichiers concernés**:
- `add_tasks_panel.js`
- `delete_duplicate_tags_fields.js`
- `fix_segments_to_free_tags.js`
- `find_budget_in_layout.js`
- `inspect_lead_layout.js`
- etc.

**Action**: ⚠️ **MARQUER DEPRECATED**

```javascript
// En haut de chaque script
console.warn('⚠️ DEPRECATED: Ce script utilise des chemins Windows hardcodés');
console.warn('Pour Docker: Utiliser les endpoints API /Admin/* ou le plugin MaxLayoutManager');
process.exit(1);
```

---

## 🔴 LOT 2: USER IDS FIXES (MULTI-TENANT CASSÉ)

### Fichier: `routes/chat.js`

#### 2.1 Ligne 2420 - Admin User ID

**Avant**:
```javascript
const userIdToUse = userId || '690f3d658c09dda31'; // ID admin par défaut
```

**Après**:
```javascript
const userIdToUse = userId || req.user?.id;
if (!userIdToUse) {
  throw new Error('User ID requis pour récupérer les dashlets. Vérifier authentification.');
}
```

#### 2.2 Lignes 2461, 2520, 2584 - Dashlets

**Avant**:
```javascript
const userId = '690f3d658c09dda31'; // Hardcodé
const dashlets = await getDashletsForUser(userId);
```

**Après**:
```javascript
// Récupérer l'admin du tenant dynamiquement
async function getTenantAdminUserId(tenantId) {
  const config = getTenantEspoConfig(tenantId);
  const users = await espoFetch('/User?where[0][type]=admin&maxSize=1', config);

  if (!users.list || users.list.length === 0) {
    throw new Error(`Aucun admin trouvé pour tenant ${tenantId}`);
  }

  return users.list[0].id;
}

// Dans la fonction
const adminUserId = await getTenantAdminUserId(req.ctx.tenant);
const dashlets = await getDashletsForUser(adminUserId);
```

---

## ⚠️ LOT 3: LOCALHOST FALLBACKS (PROD CASSÉ)

### Fichiers à corriger:

#### 3.1 `lib/espoClient.js` (LIGNE 12)

**Avant**:
```javascript
const ESPO_BASE_URL = process.env.ESPO_BASE_URL?.replace(/\/+$/, '') || 'http://127.0.0.1:8081/api/v1';
```

**Après**:
```javascript
const ESPO_BASE_URL = process.env.ESPO_BASE_URL?.replace(/\/+$/, '');
if (!ESPO_BASE_URL) {
  throw new Error('ESPO_BASE_URL manquant dans .env (ex: http://espocrm:80/api/v1 pour Docker)');
}
```

#### 3.2 `lib/espoCampaignService.js` (LIGNE 7)

**Avant**:
```javascript
const ESPO_BASE = process.env.ESPO_BASE?.replace(/\/+$/, '') || 'http://127.0.0.1:8081/espocrm';
```

**Après**:
```javascript
const ESPO_BASE = process.env.ESPO_BASE_URL?.replace(/\/+$/, '');
if (!ESPO_BASE) {
  throw new Error('ESPO_BASE_URL manquant dans .env');
}
```

#### 3.3 `lib/espoImporter.js` (LIGNE 12)

**Même correctif que 3.2**

#### 3.4 `ia_admin_api/lib/espoClient.js` (duplication)

**Action**: ❌ **SUPPRIMER LE DOSSIER `ia_admin_api/`**

**Raison**: Code dupliqué avec `lib/` et `routes/`, maintenance impossible

```bash
# Vérifier qu'aucune route n'importe depuis ia_admin_api/
grep -r "from.*ia_admin_api" max_backend/

# Si aucune référence: SUPPRIMER
rm -rf max_backend/ia_admin_api/
```

---

## ⚠️ LOT 4: PORTS HARDCODÉS (MULTI-TENANT N8N)

### Fichier: `routes/tags.js` + `ia_admin_api/routes/tags.js`

#### Ligne 33-34 - N8N Multi-Ports

**Avant**:
```javascript
function n8nConfigFor(tenant) {
  const map = {
    "damath": { base: "http://127.0.0.1:5678" },
    "coach-vero": { base: "http://127.0.0.1:5679" },
    "michele-care": { base: "http://127.0.0.1:5680" },
    "macrea-admin": { base: "http://127.0.0.1:5678" }
  };
  return map[tenant.id];
}
```

**Après**:
```javascript
function n8nConfigFor(tenant) {
  // Pour MVP: Single N8N instance
  const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';

  return { base: N8N_BASE_URL };

  // TODO Phase 3: Charger depuis Supabase tenant_integrations.n8n_webhook_url
}
```

---

## 📋 CHECKLIST TESTS DOCKER PARITY

### Test 1: Backend démarre sans .env (doit FAIL)

```bash
# Local
cd max_backend
mv .env .env.backup
npm start
# ATTENDU: ❌ "Variables .env manquantes: ESPO_BASE_URL, ..."

# Production
ssh root@51.159.170.20
cd /opt/max-infrastructure
docker compose exec max-backend sh -c "unset ESPO_BASE_URL && node server.js"
# ATTENDU: ❌ Même erreur
```

### Test 2: Création champ custom (API uniquement)

```bash
curl -X POST https://max-api.studiomacrea.cloud/api/chat \
  -H "X-Tenant: macrea-admin" \
  -d '{"message":"Crée un champ test_docker de type text pour Lead"}'

# ATTENDU:
# - ✅ Champ créé via API /Admin/fieldManager
# - ✅ Rebuild via API /Admin/rebuild
# - ❌ AUCUN accès filesystem
```

### Test 3: User ID dynamique (pas hardcodé)

```bash
# Logs backend pendant requête dashlets
docker compose logs max-backend -f

# ATTENDU:
# - ❌ PAS de "690f3d658c09dda31" dans les logs
# - ✅ "Fetching admin user for tenant macrea-admin"
```

### Test 4: Multi-environnement (dev/docker/prod)

**.env.development** (Windows):
```bash
ESPO_BASE_URL=http://localhost:8081/api/v1
ESPOCRM_ROOT=D:\Macrea\xampp\htdocs\espocrm
```

**.env.docker** (Docker local):
```bash
ESPO_BASE_URL=http://espocrm:80/api/v1
ESPOCRM_ROOT=/var/www/html/espocrm
```

**.env.production** (Scaleway):
```bash
ESPO_BASE_URL=http://espocrm:80/api/v1
ESPOCRM_ROOT=/var/www/html/espocrm
```

---

## 🔧 PR DE CORRECTION PAR LOTS

### PR #1: Retirer Chemins Windows (CRITIQUE)

**Fichiers modifiés**:
- `lib/layoutManager.js` - Utiliser ESPOCRM_ROOT
- `lib/phpExecutor.js` - Désactiver complètement
- Scripts `*.js` (root) - Marquer DEPRECATED

**Tests**:
- ✅ Backend démarre en Docker
- ✅ Création champ via API (pas filesystem)

**Diff résumé**:
```diff
# lib/layoutManager.js
- const LAYOUTS_DIR = 'D:\\Macrea\\xampp\\...';
+ const ESPOCRM_ROOT = process.env.ESPOCRM_ROOT;
+ if (!ESPOCRM_ROOT) throw new Error('ESPOCRM_ROOT requis');
+ const LAYOUTS_DIR = path.join(ESPOCRM_ROOT, 'custom/Espo/...');

# lib/phpExecutor.js
- const PHP_EXECUTABLE = 'D:\\Macrea\\xampp\\php\\php.exe';
+ throw new Error('phpExecutor désactivé - utiliser API /Admin/rebuild');
```

### PR #2: Retirer User IDs Hardcodés (CRITIQUE)

**Fichiers modifiés**:
- `routes/chat.js` - Fonction `getTenantAdminUserId()`

**Tests**:
- ✅ Dashlets récupérés avec admin du tenant
- ✅ Multi-tenant fonctionne (chaque tenant a son admin)

**Diff résumé**:
```diff
# routes/chat.js
- const userId = '690f3d658c09dda31';
+ const userId = await getTenantAdminUserId(req.ctx.tenant);
```

### PR #3: Retirer Localhost Fallbacks (IMPORTANT)

**Fichiers modifiés**:
- `lib/espoClient.js`
- `lib/espoCampaignService.js`
- `lib/espoImporter.js`

**Tests**:
- ✅ Backend ne démarre PAS sans ESPO_BASE_URL
- ✅ Erreur explicite si .env manquant

**Diff résumé**:
```diff
- const ESPO_BASE_URL = process.env.ESPO_BASE_URL || 'http://127.0.0.1:8081';
+ const ESPO_BASE_URL = process.env.ESPO_BASE_URL;
+ if (!ESPO_BASE_URL) throw new Error('ESPO_BASE_URL manquant');
```

### PR #4: Supprimer Code Dupliqué (MAINTENANCE)

**Action**:
```bash
rm -rf max_backend/ia_admin_api/
```

**Raison**:
- Code dupliqué avec `routes/` et `lib/`
- Hardcodes identiques (déjà corrigés dans routes/)
- Maintenance impossible

**Tests**:
- ✅ Backend démarre sans erreur
- ✅ Toutes routes fonctionnent

### PR #5: N8N Multi-Tenant Config (MODÉRÉ)

**Fichiers modifiés**:
- `routes/tags.js` - N8N_BASE_URL depuis .env

**Tests**:
- ✅ N8N webhooks fonctionnent
- ⏳ Phase 3: Config N8N par tenant depuis Supabase

---

## 📊 TABLEAU RÉCAPITULATIF CORRECTIFS

| Lot | Fichiers | Criticité | Temps | Bloquant Docker |
|-----|----------|-----------|-------|-----------------|
| **#1 Chemins Windows** | 12 fichiers | 🔴 CRITIQUE | 2h | ✅ OUI |
| **#2 User IDs fixes** | 1 fichier (4 locations) | 🔴 CRITIQUE | 1h | ❌ NON (mais casse multi-tenant) |
| **#3 Localhost fallbacks** | 3 fichiers | ⚠️ IMPORTANT | 30min | ⚠️ OUI (si .env manquant) |
| **#4 Code dupliqué** | 1 dossier | ⚠️ IMPORTANT | 15min | ❌ NON |
| **#5 N8N ports** | 1 fichier | ⚠️ MODÉRÉ | 15min | ❌ NON |

**TOTAL ESTIMÉ**: 4 heures

---

## 🚀 ORDRE D'EXÉCUTION RECOMMANDÉ

### Aujourd'hui (URGENT):
1. **PR #1**: Chemins Windows (2h) - BLOQUANT DOCKER
2. **PR #3**: Localhost fallbacks (30min) - FAIL-FAST

### Cette semaine:
3. **PR #2**: User IDs (1h) - MULTI-TENANT
4. **PR #4**: Code dupliqué (15min) - MAINTENANCE
5. **PR #5**: N8N config (15min) - NICE-TO-HAVE

### Tests Docker Parity (après chaque PR):
```bash
# Build image
docker compose build max-backend

# Démarrer
docker compose up -d max-backend

# Logs
docker compose logs max-backend -f

# Tests
curl https://max-api.studiomacrea.cloud/api/health
```

---

## ✅ CRITÈRES DE SUCCÈS

### Phase 1 (Chemins Windows):
- [ ] ✅ `grep -r 'D:\\\\' max_backend/` → AUCUN résultat
- [ ] ✅ Backend démarre en Docker sans erreurs
- [ ] ✅ Création champ fonctionne (API uniquement)

### Phase 2 (User IDs):
- [ ] ✅ `grep -r '690f3d658c09dda31' max_backend/` → AUCUN résultat
- [ ] ✅ Dashlets récupérés dynamiquement par tenant

### Phase 3 (Localhost):
- [ ] ✅ `grep -r '127\.0\.0\.1:8081' max_backend/` → AUCUN résultat
- [ ] ✅ Backend ne démarre PAS sans ESPO_BASE_URL

### Phase 4 (Nettoyage):
- [ ] ✅ `ia_admin_api/` supprimé
- [ ] ✅ Aucune référence à `ia_admin_api/` dans le code

---

## 📝 NOTES IMPORTANTES

### Lib/layoutManager.js - Stratégie

**Option actuelle**: Désactiver et forcer plugin
```javascript
export async function writeLayout() {
  throw new Error('layoutManager.writeLayout() désactivé - utiliser plugin MaxLayoutManager');
}
```

**Option migration**: Volumes Docker (si plugin impossible)
```javascript
const ESPOCRM_ROOT = process.env.ESPOCRM_ROOT || '/espocrm_custom';
// Requiert volume monté dans docker-compose.yml
```

### Lib/phpExecutor.js - Désactivation Complète

**Justification**:
- `/Admin/rebuild` API fonctionne ✅
- `/Admin/clearCache` API fonctionne ✅
- PHP CLI Windows introuvable en Docker ❌
- Aucun use case requis phpExecutor

**Action**: Remplacer tous appels par API

```javascript
// Avant
await espoRebuild();

// Après
await espoAdminFetch('/Admin/rebuild', { method: 'POST' });
```

---

**Prêt à exécuter PR #1 (Chemins Windows) maintenant?**
