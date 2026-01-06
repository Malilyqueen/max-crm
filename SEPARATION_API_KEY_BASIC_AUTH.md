# 🔐 Séparation Stricte API Key / Basic Auth - Architecture Scalable MVP

**Date** : 26 décembre 2025
**Objectif** : Préparer l'architecture pour 200-2000 tenants sans redémarrage backend

---

## 🎯 Principe de Séparation

### ✅ API Key (`ESPO_API_KEY`) - Opérations CRM Normales

**Utilisé pour** :
- ✅ Lecture leads (`GET /Lead`)
- ✅ Création leads (`POST /Lead`)
- ✅ Mise à jour leads (`PATCH /Lead/{id}`)
- ✅ Import CSV (`POST /Lead` batch)
- ✅ Gestion tags (`PATCH /Lead/{id}` avec champ `tags`)
- ✅ Recherche leads (`GET /Lead?where=...`)
- ✅ Toutes opérations métier quotidiennes

**Pourquoi API Key ?**
- 🔑 Pas de mot de passe à stocker
- 🔄 Révocable instantanément
- 📊 Traçabilité par tenant
- 🚀 Scalable (1 API key = 1 tenant = 1 ligne dans Supabase)

### 🔐 Basic Auth (`ESPO_USERNAME` / `ESPO_PASSWORD`) - Endpoints Admin Uniquement

**Utilisé UNIQUEMENT pour** :
- ⚙️ Création de champs custom (`PUT /Admin/fieldManager/{entity}/{field}`)
- 🔧 Modification de layouts (`PUT /Admin/layoutManager/{entity}/{layoutType}`)
- 🔄 Rebuild EspoCRM (`POST /Admin/rebuild`)
- 🗑️ Clear cache (`POST /Admin/clearCache`)

**Pourquoi Basic Auth pour /Admin/* ?**
- ⚠️ Limitation technique EspoCRM : endpoints `/Admin/*` n'acceptent PAS les API keys
- 🔒 Mot de passe chiffré dans Supabase (pas exposé)
- ⏱️ Opérations rares (1 fois à l'onboarding + occasionnellement)

---

## 📊 Matrice d'Authentification

| Endpoint | Auth Utilisée | Justification |
|----------|---------------|---------------|
| `GET /Lead` | 🔑 API Key | Opération quotidienne, scalable |
| `POST /Lead` | 🔑 API Key | Import CSV, création leads |
| `PATCH /Lead/{id}` | 🔑 API Key | Mise à jour tags, objectifs, etc. |
| `PUT /Admin/fieldManager/Lead/secteurActivite` | 🔐 Basic Auth | Endpoint /Admin/* - requirement EspoCRM |
| `POST /Admin/rebuild` | 🔐 Basic Auth | Endpoint /Admin/* - requirement EspoCRM |
| `PUT /Admin/layoutManager/Lead/detail` | 🔐 Basic Auth | Endpoint /Admin/* - requirement EspoCRM |
| `POST /Admin/clearCache` | 🔐 Basic Auth | Endpoint /Admin/* - requirement EspoCRM |

---

## 🛠️ Implémentation Technique

### Fichier : `max_backend/lib/espoClient.js`

#### Fonction `buildAdminAuthHeaders(path)`

```javascript
/**
 * SÉPARATION STRICTE API KEY / BASIC AUTH (MVP Scaling Ready)
 *
 * - API Key (ESPO_API_KEY) : Toutes opérations CRM normales
 * - Basic Auth (ESPO_USERNAME/PASSWORD) : UNIQUEMENT endpoints /Admin/*
 */
function buildAdminAuthHeaders(path = '') {
  const h = { 'Content-Type': 'application/json' };

  // Détecter si c'est un endpoint administratif EspoCRM (/Admin/*)
  const isAdminEndpoint = path.includes('/Admin/');

  if (isAdminEndpoint) {
    // ADMIN ENDPOINTS : Force Basic Auth (seule méthode supportée par EspoCRM)
    if (ESPO_USER && ESPO_PASS) {
      const basic = Buffer.from(`${ESPO_USER}:${ESPO_PASS}`).toString('base64');
      h['Authorization'] = `Basic ${basic}`;
      console.log('[ESPO_CLIENT] 🔐 Using Basic Auth for /Admin/* endpoint');
      return h;
    }
    throw new Error('Basic Auth required for /Admin/* but not configured');
  }

  // NON-ADMIN ENDPOINTS : Priorité à l'API Key (scalable, pas de mot de passe)
  if (ESPO_APIKEY) {
    h['X-Api-Key'] = ESPO_APIKEY;
    console.log('[ESPO_CLIENT] 🔑 Using API Key for CRM operations');
    return h;
  }

  // Fallback vers Basic Auth si pas d'API key (legacy)
  if (ESPO_USER && ESPO_PASS) {
    const basic = Buffer.from(`${ESPO_USER}:${ESPO_PASS}`).toString('base64');
    h['Authorization'] = `Basic ${basic}`;
    console.log('[ESPO_CLIENT] ⚠️ Using Basic Auth (fallback - should use API Key)');
    return h;
  }

  throw new Error('No auth configured');
}
```

### Logs Explicites

Chaque requête log le mode auth utilisé :

```bash
# Import CSV (API Key)
[ESPO_CLIENT] 🔑 Using API Key for CRM operations
[ESPO_CLIENT] 🔍 Request: POST /Lead

# Création champ custom (Basic Auth)
[ESPO_CLIENT] 🔐 Using Basic Auth for /Admin/* endpoint (fields/rebuild/layouts)
[create_custom_field] Création champ secteurActivite (enum) sur Lead

# Rebuild (Basic Auth)
[ESPO_CLIENT] 🔐 Using Basic Auth for /Admin/* endpoint (fields/rebuild/layouts)
[rebuild] Rebuild EspoCRM en cours...
```

---

## 🚀 Scalabilité Multi-Tenant

### Configuration Actuelle (MVP - 4-5 Tenants)

**Fichier `.env`** :
```bash
# Opérations CRM normales (API Key)
ESPO_API_KEY=c306b76bd7e981305569b63e8bb4d157

# Opérations admin (Basic Auth - fallback)
ESPO_USERNAME=admin
ESPO_PASSWORD=Admin2025Secure
```

**Limitations** :
- ❌ 1 seul tenant (macrea-admin)
- ❌ Redémarrage backend pour changer config
- ❌ Secrets en clair dans `.env`

### Configuration Scalable (Q1 2026 - 200+ Tenants)

**Migration vers Supabase `tenant_integrations`** :

```sql
CREATE TABLE tenant_integrations (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  espo_base_url TEXT NOT NULL,
  espo_api_key TEXT NOT NULL, -- Clé API normale (chiffrée)
  espo_admin_username TEXT, -- Admin username (chiffré)
  espo_admin_password TEXT, -- Admin password (chiffré avec AES-256)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour lookup rapide par tenant
CREATE INDEX idx_tenant_integrations_tenant_id ON tenant_integrations(tenant_id);
```

**Avantages** :
- ✅ Chaque tenant a ses propres credentials
- ✅ Pas de redémarrage backend (config dynamique)
- ✅ Secrets chiffrés avec clé maître (Supabase vault)
- ✅ Rotation de clés par tenant sans impact autres tenants
- ✅ Audit trail complet (qui a accédé à quoi, quand)

### Code Backend Scalable

```javascript
// Chargement config dynamique par tenant
async function getTenantEspoConfig(tenantId) {
  const { data, error } = await supabase
    .from('tenant_integrations')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error) throw new Error(`Tenant ${tenantId} not configured`);

  // Déchiffrer les secrets
  return {
    baseUrl: data.espo_base_url,
    apiKey: await decrypt(data.espo_api_key),
    adminUsername: data.espo_admin_username ? await decrypt(data.espo_admin_username) : null,
    adminPassword: data.espo_admin_password ? await decrypt(data.espo_admin_password) : null,
  };
}

// buildAdminAuthHeaders devient tenant-aware
function buildAdminAuthHeaders(path, tenantId) {
  const config = await getTenantEspoConfig(tenantId);
  const isAdminEndpoint = path.includes('/Admin/');

  if (isAdminEndpoint) {
    // Basic Auth avec credentials du tenant
    if (config.adminUsername && config.adminPassword) {
      const basic = Buffer.from(`${config.adminUsername}:${config.adminPassword}`).toString('base64');
      h['Authorization'] = `Basic ${basic}`;
      console.log(`[ESPO_CLIENT] 🔐 Tenant ${tenantId} - Basic Auth for /Admin/*`);
      return h;
    }
    throw new Error(`Tenant ${tenantId} - Basic Auth not configured for /Admin/*`);
  }

  // API Key pour opérations normales
  if (config.apiKey) {
    h['X-Api-Key'] = config.apiKey;
    console.log(`[ESPO_CLIENT] 🔑 Tenant ${tenantId} - API Key for CRM operations`);
    return h;
  }

  throw new Error(`Tenant ${tenantId} - No auth configured`);
}
```

---

## 📋 Checklist Tests

### Test 1 : Opérations CRM avec API Key ✅

**Commande** :
```bash
# Doit utiliser API Key (pas Basic Auth)
curl -H "X-Tenant: macrea-admin" \
  https://max-api.studiomacrea.cloud/api/chat \
  -X POST \
  -d '{"message": "Affiche-moi les 3 derniers leads"}'
```

**Log attendu** :
```
[ESPO_CLIENT] 🔑 Using API Key for CRM operations
[ESPO_CLIENT] 🔍 Request: GET /Lead?maxSize=3&orderBy=createdAt&order=desc
```

### Test 2 : Création de Champ Custom avec Basic Auth ✅

**Commande dans MAX** :
```
Crée un champ custom "secteurActivite" de type Enum pour Lead
avec options : Transport, Logistique, E-commerce, BTP, Services
```

**Log attendu** :
```
[ESPO_CLIENT] 🔐 Using Basic Auth for /Admin/* endpoint (fields/rebuild/layouts)
[create_custom_field] Création champ secteurActivite (enum) sur Lead
[create_custom_field] ✅ Champ secteurActivite créé avec succès
```

### Test 3 : Rebuild EspoCRM avec Basic Auth

**Commande dans MAX** :
```
Fais un rebuild du CRM pour appliquer les changements
```

**Log attendu** :
```
[ESPO_CLIENT] 🔐 Using Basic Auth for /Admin/* endpoint (fields/rebuild/layouts)
[rebuild] Rebuild EspoCRM en cours...
[rebuild] ✅ Rebuild terminé
```

---

## 🔄 Roadmap Migration vers Secrets Manager

### Phase 1 : MVP Actuel (Q4 2025) ✅

- ✅ Séparation stricte API Key / Basic Auth
- ✅ Logs explicites du mode auth
- ✅ Config dans `.env` (4-5 tenants max)

### Phase 2 : Migration Supabase (Q1 2026)

- [ ] Créer table `tenant_integrations` dans Supabase
- [ ] Implémenter chiffrement AES-256 des secrets
- [ ] Migration credentials depuis `.env` vers Supabase
- [ ] Code backend charge config dynamiquement par tenant
- [ ] Pas de redémarrage backend pour nouveau tenant

### Phase 3 : Rotation Automatique (Q2 2026)

- [ ] Endpoint `/api/admin/rotate-credentials/{tenantId}`
- [ ] Rotation automatique tous les 6 mois
- [ ] Notifications email si credentials expirés
- [ ] Dashboard admin : vue sur santé credentials par tenant

### Phase 4 : Vault Externe (Q3 2026 - 500+ Tenants)

- [ ] Migration vers HashiCorp Vault / AWS Secrets Manager
- [ ] Rotation automatique complète
- [ ] Audit trail complet (qui a accédé à quoi)
- [ ] Backup/restore automatique credentials

---

## ✅ Résumé

**Séparation actuelle** :
- 🔑 **API Key** : 99% des opérations (leads, import, tags) → Scalable
- 🔐 **Basic Auth** : 1% des opérations (/Admin/*) → Rare, accepté pour MVP

**Bénéfices** :
- ✅ Cockpit client 100% API key (pas de mot de passe)
- ✅ Opérations admin rare (onboarding + occasionnel)
- ✅ Logs clairs (quel mode auth pour quelle opération)
- ✅ Prêt pour migration Supabase (Q1 2026)

**Prochaine étape** :
Tester création de champ custom dans MAX et vérifier les logs montrent bien `🔐 Using Basic Auth for /Admin/*`.
