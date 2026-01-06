# 🔍 AUDIT ANTI-HARDCODE - Backend MAX

**DATE**: 2025-12-26
**CRITICITÉ**: 🔴 CRITIQUE
**STATUT PRODUCTION**: ❌ NON-DÉPLOYABLE

---

## RÉSUMÉ EXÉCUTIF

**HARDCODES DÉTECTÉS**: 150+ occurrences
**FICHIERS AFFECTÉS**: 50+ fichiers

**BLOQUEURS CRITIQUES**:
- ❌ Secrets committés dans Git (API keys, passwords)
- ❌ Chemins Windows absolus (`D:\Macrea\xampp\...`)
- ❌ Filesystem writes impossible en Docker
- ❌ Multi-tenant cassé (configs partagées, User IDs fixes)

---

## 1. SECRETS EN CLAIR (🔴 SÉCURITÉ CRITIQUE)

### API Keys EspoCRM hardcodées

| Fichier | Ligne | Clé Exposée | Impact |
|---------|-------|-------------|--------|
| `ia_admin_api/routes/tags.js` | 21-24 | `c33b6ca549ff94016190bf53cfb0964c` | 🔴 Tous tenants partagent |
| `ia_admin_api/routes/lead.js` | 10-13 | Idem | 🔴 Idem |
| `routes/tags.js` | 21-24 | Idem (dupliqué) | 🔴 Idem |
| `routes/lead.js` | 10-13 | Idem (dupliqué) | 🔴 Idem |
| Scripts maintenance | Divers | `7b8a983aab7071bb64f18a75cf27ebbc` | ⚠️ Scripts test |

**Correctif**:
```javascript
// ❌ AVANT
const headers = {
  'X-Api-Key': "c33b6ca549ff94016190bf53cfb0964c",
  'Content-Type': 'application/json'
};

// ✅ APRÈS
const ESPO_API_KEY = process.env.ESPO_API_KEY;
if (!ESPO_API_KEY) {
  throw new Error('ESPO_API_KEY requis dans .env');
}

const headers = {
  'X-Api-Key': ESPO_API_KEY,
  'Content-Type': 'application/json'
};
```

### Passwords en commentaire

| Fichier | Ligne | Exposition | Impact |
|---------|-------|------------|--------|
| `routes/auth.js` | 18 | `// admin123` | 🔴 Password révélé |
| `routes/auth.js` | 26 | `// user123` | 🔴 Password révélé |
| `lib/tokenRecharge.js` | 22 | `default-password-change-me` | 🔴 Fallback dangereux |

**Correctif**: SUPPRIMER ces commentaires immédiatement.

```javascript
// ❌ AVANT
password: '$2b$10$uqTA...', // admin123  <-- RÉVÈLE LE PASSWORD

// ✅ APRÈS
password: process.env.ADMIN_PASSWORD_HASH,
```

### JWT Secret hardcodé

| Fichier | Ligne | Secret | Impact |
|---------|-------|--------|--------|
| `middleware/authMiddleware.js` | 8 | `dev-secret-change-in-production-MACREA2025` | 🔴 Compromis si poussé |
| `routes/auth.js` | 33 | Idem (dupliqué) | 🔴 Idem |

**Correctif**:
```javascript
// ❌ AVANT
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production-MACREA2025';

// ✅ APRÈS
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET manquant dans .env - REQUIS pour production');
  process.exit(1);
}
```

---

## 2. CHEMINS WINDOWS (🔴 BLOQUANT DOCKER)

### Chemins XAMPP hardcodés

| Fichier | Ligne | Chemin | Usage | Impact |
|---------|-------|--------|-------|--------|
| `lib/layoutManager.js` | 12 | `D:\\Macrea\\xampp\\htdocs\\espocrm\\custom\\...\\layouts` | Écriture layouts | ❌ Introuvable en Docker |
| `lib/layoutManager_old.js` | 11 | `D:\\Macrea\\xampp\\...\\metadata\\clientDefs` | Écriture metadata | ❌ Idem |
| `lib/phpExecutor.js` | 15 | `D:\\Macrea\\xampp\\php\\php.exe` | PHP CLI | ❌ N'existe pas en Linux |
| `lib/phpExecutor.js` | 18 | `D:\\Macrea\\xampp\\htdocs\\espocrm` | Rebuild command | ❌ Idem |
| Scripts maintenance | Multiples | Divers paths Windows | Scripts locaux | ❌ Non-portables |

**Correctif Phase 1** (Quick Fix - Variables d'environnement):
```javascript
// ❌ AVANT
const LAYOUTS_DIR = 'D:\\Macrea\\xampp\\htdocs\\espocrm\\custom\\Espo\\Custom\\Resources\\layouts';

// ✅ APRÈS
const ESPOCRM_ROOT = process.env.ESPOCRM_ROOT || '/var/www/html/espocrm';
const LAYOUTS_DIR = path.join(ESPOCRM_ROOT, 'custom/Espo/Custom/Resources/layouts');
```

**.env.development** (Windows XAMPP):
```bash
ESPOCRM_ROOT=D:\Macrea\xampp\htdocs\espocrm
PHP_EXECUTABLE=D:\Macrea\xampp\php\php.exe
```

**.env.docker** (Linux Container):
```bash
ESPOCRM_ROOT=/var/www/html/espocrm
PHP_EXECUTABLE=/usr/bin/php
```

**Correctif Phase 2** (Optimal - API EspoCRM):

```javascript
// ❌ AVANT (Filesystem direct)
async function writeLayout(entityType, layoutType, layout) {
  const layoutPath = path.join(LAYOUTS_DIR, entityType, `${layoutType}.json`);
  await fs.writeFile(layoutPath, JSON.stringify(layout), 'utf-8');
}

// ✅ APRÈS (API EspoCRM)
async function writeLayout(entityType, layoutType, layout) {
  await espoAdminFetch(`/Admin/layoutManager/${entityType}/${layoutType}`, {
    method: 'PUT',
    body: JSON.stringify(layout)
  });

  // Rebuild pour appliquer
  await espoAdminFetch('/Admin/rebuild', { method: 'POST' });
}
```

**DÉCISION ARCHITECTURE**:
- ✅ **Phase 1 (MVP)**: Variables d'environnement pour chemins
- 🔥 **Phase 2 (Production)**: API EspoCRM exclusivement (pas de filesystem)
- ❌ **Jamais**: Chemins Windows hardcodés

---

## 3. URLs HARDCODÉES (⚠️ BLOQUANT PROD)

### localhost / 127.0.0.1 fallbacks

| Fichier | Ligne | Valeur | Impact |
|---------|-------|--------|--------|
| `lib/espoClient.js` | 12 | `http://127.0.0.1:8081/api/v1` | ❌ Prod cassé si .env manquant |
| `utils/espo-api.js` | 5 | `http://127.0.0.1:8081` | ❌ Idem (déjà corrigé) |
| `lib/espoCampaignService.js` | 7 | `http://127.0.0.1:8081/espocrm` | ❌ Fallback dangereux |
| **ia_admin_api/** (dupliqués) | Multiples | Idem | ❌ Duplication code |

**Correctif**:
```javascript
// ❌ AVANT (Fallback cache les erreurs)
const ESPO_BASE = process.env.ESPO_BASE_URL || 'http://127.0.0.1:8081/api/v1';

// ✅ APRÈS (Fail-fast si manquant)
const ESPO_BASE_URL = process.env.ESPO_BASE_URL;
if (!ESPO_BASE_URL) {
  throw new Error('ESPO_BASE_URL requis dans .env (ex: http://espocrm:80/api/v1)');
}
```

**Environnements**:
- **Dev Windows**: `ESPO_BASE_URL=http://localhost:8081/api/v1`
- **Docker local**: `ESPO_BASE_URL=http://espocrm:80/api/v1`
- **Production**: `ESPO_BASE_URL=https://crm.studiomacrea.cloud/api/v1`

### CORS Origins hardcodées

| Fichier | Ligne | Valeur | Impact |
|---------|-------|--------|--------|
| `server.js` | 69-73 | `localhost:5173/5174/5175/8081` | ⚠️ OK dev, manque prod |

**Correctif**:
```javascript
// ✅ BON
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://max.studiomacrea.cloud' // PROD
    ];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
```

**.env.production**:
```bash
CORS_ORIGINS=https://max.studiomacrea.cloud,https://crm.studiomacrea.cloud
```

---

## 4. IDs FIXES (❌ ANTI-PATTERN MULTI-TENANT)

### User IDs hardcodés

| Fichier | Ligne | ID Hardcodé | Usage | Impact |
|---------|-------|-------------|-------|--------|
| `routes/chat.js` | 2420 | `690f3d658c09dda31` | Admin user fallback | ❌ Dashboard cassé autres tenants |
| `routes/chat.js` | 2461 | Idem | Dashlets | ❌ Idem |
| `routes/chat.js` | 2520 | Idem | Idem | ❌ Idem |

**Correctif**:
```javascript
// ❌ AVANT (ID spécifique à l'instance dev)
const userIdToUse = userId || '690f3d658c09dda31';

// ✅ APRÈS (Multi-tenant)
const userIdToUse = userId || req.user?.id;
if (!userIdToUse) {
  return res.status(400).json({
    error: 'User ID requis',
    hint: 'Vérifier authentification'
  });
}
```

**Alternative pour operations admin**:
```javascript
// Récupérer le premier admin du tenant
async function getTenantAdminUserId(tenantId) {
  const config = getTenantEspoConfig(tenantId);
  const admins = await espoFetch('/User?where[0][type]=admin&maxSize=1', config);

  if (!admins.list?.[0]) {
    throw new Error(`Aucun admin trouvé pour tenant ${tenantId}`);
  }

  return admins.list[0].id;
}
```

---

## 5. PORTS HARDCODÉS (⚠️ MODÉRÉ)

| Fichier | Ligne | Port | Service | Impact |
|---------|-------|------|---------|--------|
| `server.js` | 235 | 3005 | Backend | ✅ OK (fallback .env.PORT) |
| `server.js` | 72 | 8081 | EspoCRM CORS | ⚠️ Devrait être configurable |
| `ia_admin_api/routes/tags.js` | 31-34 | 5678-5680 | N8N multi-instances | ❌ Multi-tenant cassé |

**Correctif N8N**:
```javascript
// ❌ AVANT (Ports hardcodés par tenant)
const N8N_URLS = {
  'macrea': 'http://localhost:5678',
  'damath': 'http://localhost:5679',
  'coach-vero': 'http://localhost:5680'
};

// ✅ APRÈS (DB-driven)
async function getN8nUrl(tenantId) {
  const { data } = await supabase
    .from('tenant_integrations')
    .select('n8n_webhook_url')
    .eq('tenant_id', tenantId)
    .single();

  return data?.n8n_webhook_url || null;
}
```

---

## 6. DUPLICATION DE CODE (ia_admin_api/)

**FICHIERS DUPLIQUÉS**:
```
lib/espoClient.js          ↔ ia_admin_api/lib/espoClient.js
utils/espoClient.js        ↔ ia_admin_api/utils/espoClient.js
utils/espo-api.js          ↔ ia_admin_api/utils/espo-api.js
routes/tags.js             ↔ ia_admin_api/routes/tags.js
routes/lead.js             ↔ ia_admin_api/routes/lead.js
```

**Impact**: Hardcodes dupliqués, maintenance impossible

**Correctif**: Supprimer `ia_admin_api/` complètement ou le fusionner.

```bash
# Option 1: Supprimer ia_admin_api
rm -rf max_backend/ia_admin_api

# Option 2: Si nécessaire, extraire en module partagé
mkdir max_backend/shared
mv max_backend/lib/espoClient.js max_backend/shared/
# Importer depuis shared/ dans les deux endroits
```

---

## 7. PLAN D'ACTION PRIORITAIRE

### 🔴 PHASE 1: URGENCE SÉCURITÉ (24H)

**Objectif**: Retirer tous les secrets du code source

**Actions**:
1. **Créer .env.example avec placeholders**:
   ```bash
   ESPO_API_KEY=your_espo_api_key_here
   ESPO_ADMIN_API_KEY=your_admin_api_key_here
   ESPO_USERNAME=admin
   ESPO_PASSWORD=your_secure_password_here
   JWT_SECRET=generate_random_secret_min_32_chars
   ```

2. **Migrer secrets vers .env**:
   - [ ] `ia_admin_api/routes/tags.js` ligne 21-24
   - [ ] `ia_admin_api/routes/lead.js` ligne 10-13
   - [ ] `routes/tags.js` ligne 21-24
   - [ ] `routes/lead.js` ligne 10-13
   - [ ] Supprimer commentaires passwords dans `routes/auth.js`

3. **Forcer .env obligatoire**:
   ```javascript
   // Ajouter en haut de server.js
   const REQUIRED_ENV = [
     'ESPO_BASE_URL',
     'ESPO_API_KEY',
     'JWT_SECRET',
     'SUPABASE_URL',
     'SUPABASE_ANON_KEY'
   ];

   const missing = REQUIRED_ENV.filter(key => !process.env[key]);
   if (missing.length > 0) {
     console.error(`❌ Variables .env manquantes: ${missing.join(', ')}`);
     console.error('Copier .env.example vers .env et renseigner les valeurs');
     process.exit(1);
   }
   ```

4. **Rotate clés compromises**:
   - [ ] Générer nouvelle API key EspoCRM
   - [ ] Générer nouveau JWT secret (32+ caractères aléatoires)
   - [ ] Mettre à jour `.env` production
   - [ ] Redéployer backend

**Checklist**:
- [ ] Aucun secret dans Git (vérifier avec `git grep -E 'c33b6ca549|7b8a983aab|dev-secret'`)
- [ ] `.env` dans `.gitignore`
- [ ] `.env.example` committé (sans valeurs réelles)
- [ ] Documentation: comment obtenir les clés pour nouveau dev

---

### ⚠️ PHASE 2: DOCKER-READY (1 SEMAINE)

**Objectif**: Backend déployable en Docker sans hardcodes

**Actions**:

1. **Remplacer chemins Windows** (`lib/layoutManager.js`, `lib/phpExecutor.js`):
   ```javascript
   const ESPOCRM_ROOT = process.env.ESPOCRM_ROOT;
   const PHP_EXECUTABLE = process.env.PHP_EXECUTABLE || '/usr/bin/php';
   ```

2. **Migrer filesystem vers API EspoCRM**:
   - [ ] Remplacer `fs.writeFile(layoutPath, ...)` par `/Admin/layoutManager` API
   - [ ] Remplacer `phpExecutor.espoRebuild()` par `/Admin/rebuild` API
   - [ ] Tester création champs + layouts via API uniquement
   - [ ] Supprimer `lib/phpExecutor.js` si plus nécessaire

3. **Retirer fallbacks localhost**:
   - [ ] `lib/espoClient.js` - forcer `ESPO_BASE_URL`
   - [ ] `lib/espoCampaignService.js` - idem
   - [ ] `lib/espoImporter.js` - idem
   - [ ] Tous les fichiers `ia_admin_api/` (ou supprimer le dossier)

4. **Configuration multi-environnement**:
   ```
   .env.development    # Windows XAMPP
   .env.docker         # Docker Compose local
   .env.production     # Scaleway production
   ```

   **docker-compose.yml**:
   ```yaml
   max-backend:
     env_file:
       - .env.docker
     environment:
       - ESPOCRM_ROOT=/var/www/html/espocrm
       - PHP_EXECUTABLE=/usr/local/bin/php
   ```

**Checklist**:
- [ ] Backend démarre en Docker sans erreurs
- [ ] Création de champs fonctionne (via API)
- [ ] Rebuild fonctionne (via API)
- [ ] Aucun chemin Windows dans le code
- [ ] Tests passent en environnement Docker

---

### 🔥 PHASE 3: MULTI-TENANT (2 SEMAINES)

**Objectif**: Credentials par tenant, scalable à 200+ clients

**Actions**:

1. **Supabase Credentials Store**:
   ```sql
   CREATE TABLE tenant_credentials (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id TEXT UNIQUE NOT NULL,
     espo_base_url TEXT NOT NULL,
     espo_api_key_encrypted TEXT NOT NULL,
     espo_admin_username TEXT,
     espo_admin_password_encrypted TEXT,
     n8n_webhook_url TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Index pour lookup rapide
   CREATE INDEX idx_tenant_creds_tenant ON tenant_credentials(tenant_id);

   -- Chiffrement avec pgcrypto (si pas fait côté app)
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   ```

2. **Dynamic Config Loading**:
   ```javascript
   // lib/tenantConfig.js
   import { createClient } from '@supabase/supabase-js';

   const supabase = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_SERVICE_KEY // Service role pour accès credentials
   );

   const MASTER_KEY = process.env.CREDENTIALS_MASTER_KEY;

   export async function getTenantEspoConfig(tenantId) {
     const { data, error } = await supabase
       .from('tenant_credentials')
       .select('*')
       .eq('tenant_id', tenantId)
       .single();

     if (error) {
       throw new Error(`Config tenant ${tenantId} introuvable: ${error.message}`);
     }

     return {
       baseUrl: data.espo_base_url,
       apiKey: decrypt(data.espo_api_key_encrypted, MASTER_KEY),
       adminUsername: data.espo_admin_username,
       adminPassword: data.espo_admin_password_encrypted
         ? decrypt(data.espo_admin_password_encrypted, MASTER_KEY)
         : null,
       n8nWebhookUrl: data.n8n_webhook_url
     };
   }

   function decrypt(encrypted, key) {
     const crypto = require('crypto');
     const decipher = crypto.createDecipher('aes-256-cbc', key);
     let decrypted = decipher.update(encrypted, 'hex', 'utf8');
     decrypted += decipher.final('utf8');
     return decrypted;
   }
   ```

3. **Refactor espoClient.js pour tenant-aware**:
   ```javascript
   // Avant: buildAdminAuthHeaders(path)
   // Après: buildAdminAuthHeaders(path, tenantId)

   function buildAdminAuthHeaders(path, tenantId) {
     const config = getTenantEspoConfig(tenantId); // Depuis DB
     const isAdminEndpoint = path.includes('/Admin/');

     if (isAdminEndpoint) {
       if (config.adminUsername && config.adminPassword) {
         const basic = Buffer.from(`${config.adminUsername}:${config.adminPassword}`).toString('base64');
         return { 'Authorization': `Basic ${basic}` };
       }
       throw new Error(`Tenant ${tenantId} - Basic Auth non configuré`);
     }

     if (config.apiKey) {
       return { 'X-Api-Key': config.apiKey };
     }

     throw new Error(`Tenant ${tenantId} - Aucune auth configurée`);
   }
   ```

4. **Retirer hardcodes tenant-specific**:
   - [ ] Supprimer `core/tenants.js` (remplacé par DB)
   - [ ] Supprimer `ia_admin_api/routes/tags.js` config map
   - [ ] Retirer User IDs hardcodés (`routes/chat.js`)
   - [ ] N8N URLs depuis DB

5. **Middleware tenant context**:
   ```javascript
   // middleware/tenantContext.js
   export async function loadTenantContext(req, res, next) {
     const tenantId = req.headers['x-tenant'] || req.ctx?.tenant;

     if (!tenantId) {
       return res.status(400).json({ error: 'X-Tenant header requis' });
     }

     try {
       req.tenantConfig = await getTenantEspoConfig(tenantId);
       next();
     } catch (error) {
       return res.status(404).json({
         error: `Tenant ${tenantId} non configuré`,
         hint: 'Vérifier tenant_credentials dans Supabase'
       });
     }
   }

   // Dans server.js
   app.use('/api', loadTenantContext);
   ```

**Checklist**:
- [ ] Table `tenant_credentials` créée dans Supabase
- [ ] Scripts de migration `.env` → Supabase
- [ ] Tous les appels EspoCRM utilisent config du tenant
- [ ] Tests avec 2+ tenants (macrea-admin + damath)
- [ ] Aucun credential hardcodé dans le code
- [ ] Dashboard admin pour gérer tenants

---

## 8. FICHIERS À MODIFIER EN PRIORITÉ

### Ordre de traitement:

#### 🔴 CRITIQUE (Phase 1):
1. `ia_admin_api/routes/tags.js` - API key en clair
2. `ia_admin_api/routes/lead.js` - API key en clair
3. `routes/tags.js` - API key en clair (dupliqué)
4. `routes/lead.js` - API key en clair (dupliqué)
5. `routes/auth.js` - Passwords en commentaire
6. `middleware/authMiddleware.js` - JWT secret fallback
7. `lib/tokenRecharge.js` - Password par défaut

#### ⚠️ IMPORTANT (Phase 2):
8. `lib/layoutManager.js` - Chemins Windows + filesystem writes
9. `lib/phpExecutor.js` - XAMPP-specific, non-portable
10. `lib/espoClient.js` - Fallback localhost
11. `utils/espo-api.js` - Fallback localhost (✅ déjà corrigé)
12. `lib/espoCampaignService.js` - Fallback localhost
13. `lib/espoImporter.js` - Fallback localhost
14. `routes/chat.js` - User IDs hardcodés (lignes 2420+)
15. `server.js` - CORS origins hardcodées

#### 🔥 OPTIMAL (Phase 3):
16. `core/tenants.js` - Migrer vers Supabase
17. Tout `ia_admin_api/` - Supprimer ou fusionner
18. Scripts maintenance - Migrer vers utils/ + .env

---

## 9. TESTS DE VALIDATION

### Phase 1: Sécurité
```bash
# Vérifier qu'aucun secret n'est dans Git
git grep -E 'c33b6ca549|7b8a983aab|dev-secret-change'

# Doit retourner: rien (ou que ce document)
```

### Phase 2: Docker
```bash
# Build et démarrage Docker
cd /opt/max-infrastructure
docker compose build max-backend
docker compose up -d max-backend

# Test création de champs
curl -X POST https://max-api.studiomacrea.cloud/api/chat \
  -H "X-Tenant: macrea-admin" \
  -d '{"message":"Crée un champ test_docker de type text pour Lead"}'

# Vérifier logs: doit utiliser API, pas filesystem
docker compose logs max-backend | grep -i "layout\|field"
```

### Phase 3: Multi-tenant
```bash
# Test avec 2 tenants
curl -X POST https://max-api.studiomacrea.cloud/api/chat \
  -H "X-Tenant: macrea-admin" \
  -d '{"message":"Liste les leads"}'

curl -X POST https://max-api.studiomacrea.cloud/api/chat \
  -H "X-Tenant: damath" \
  -d '{"message":"Liste les leads"}'

# Vérifier logs: doit charger configs différentes
docker compose logs max-backend | grep "Tenant.*config"
```

---

## 10. MÉTRIQUES DE SUCCÈS

### Phase 1 (Sécurité):
- [ ] ✅ 0 secrets dans `git log --all -p | grep -E 'API_KEY|PASSWORD'`
- [ ] ✅ Backend démarre même si .env manquant (avec erreur explicite)
- [ ] ✅ JWT secret unique par environnement

### Phase 2 (Docker):
- [ ] ✅ Backend démarre en Docker sans erreurs
- [ ] ✅ Création de champs via API (pas filesystem)
- [ ] ✅ Rebuild via API (pas PHP CLI)
- [ ] ✅ 0 chemins Windows dans `grep -r 'D:\\\\' max_backend/`

### Phase 3 (Multi-tenant):
- [ ] ✅ Config chargée depuis Supabase (pas .env)
- [ ] ✅ 2+ tenants fonctionnent simultanément
- [ ] ✅ Nouveau tenant ajouté sans redémarrer backend
- [ ] ✅ Dashboard admin pour gérer credentials

---

## CONCLUSION

**ÉTAT ACTUEL**: 🔴 NON-PRODUCTION-READY

**BLOQUEURS**:
1. Secrets en clair (sécurité)
2. Chemins Windows (Docker impossible)
3. Filesystem writes (layouts cassés)
4. Config partagée (multi-tenant cassé)

**EFFORT TOTAL**: ~3 semaines
- Phase 1: 1 jour (URGENT)
- Phase 2: 1 semaine (CRITIQUE)
- Phase 3: 2 semaines (IMPORTANT)

**RECOMMANDATION**:
- ✅ Phase 1 avant tout commit
- ✅ Phase 2 avant déploiement production
- ✅ Phase 3 avant scaling 10+ tenants

---

**Prochaine étape**: Exécuter Phase 1 maintenant (24h max)
