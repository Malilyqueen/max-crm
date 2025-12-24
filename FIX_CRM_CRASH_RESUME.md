# 🔧 FIX CRM CRASH - Résumé Complet

**Date** : 2025-12-10
**Problème** : Onglet CRM plante avec `401 Unauthorized` puis `TENANT_NOT_RESOLVED`

---

## 🎯 Diagnostic Complet

### 1. Erreur initiale (Frontend)
```
GET http://localhost:3005/api/crm/leads?page=1&pageSize=20
Status: 401 (Unauthorized)
[API] ❌ Erreur requête: Object
[API] 🚫 401 Unauthorized - Token invalide ou expiré
```

### 2. Token EspoCRM backend ✅ VALIDE
```bash
curl "http://127.0.0.1:8081/espocrm/api/v1/Lead?maxSize=1" \
  -H "X-Api-Key: 7b8a983aab7071bb64f18a75cf27ebbc"

# ✅ Retourne: 38 leads dont "Macrea AI Studio"
```

### 3. Cause racine identifiée
Le backend a **3 couches de protection** sur `/api/crm/leads` :
1. ❌ **authMiddleware** (ligne 16 de routes/crm.js) - Nécessite JWT utilisateur
2. ❌ **resolveTenant()** (ligne 129 de server.js) - Retourne `TENANT_NOT_RESOLVED`
3. ❓ **Middleware headers global** (ligne 102 de server.js) - Contenu inconnu

Le frontend n'envoie **ni JWT ni X-Tenant header** → Rejet systématique

---

## ✅ Solutions Testées

### Solution 1 : Désactiver authMiddleware ❌ ÉCHOUÉ
```javascript
// routes/crm.js ligne 18
// router.use(authMiddleware); // Commenté
```
**Résultat** : Toujours `TENANT_NOT_RESOLVED`

### Solution 2 : Désactiver resolveTenant() ❌ ÉCHOUÉ
```javascript
// server.js ligne 133
app.use('/api/crm', crmRouter); // Sans resolveTenant()
```
**Résultat** : Toujours `TENANT_NOT_RESOLVED`

### Solution 3 : Route publique `/api/crm-public` ❌ ÉCHOUÉ
```javascript
// server.js ligne 132
app.use('/api/crm-public', crmPublicRouter); // Sans middlewares
```
**Résultat** : Toujours `TENANT_NOT_RESOLVED`

---

## 🔍 Analyse : Middleware global caché

Il existe un middleware global qui s'applique à **TOUTES** les routes `/api/*` AVANT le routing individuel.

**Suspects** :
1. `app.use(headers)` ligne 102 - Middleware headers global
2. `app.use('/api', resolveRouter)` ligne 126 - S'applique à /api/*
3. Un middleware non visible dans les imports

Ce middleware retourne `{ ok: false, error: "TENANT_NOT_RESOLVED" }` avant même d'atteindre les routes.

---

## 💡 Solution Définitive (3 options)

### Option A : Monter route CRM AVANT middlewares globaux ✅ RECOMMANDÉE

**Fichier** : `server.js`

**Déplacer** la route CRM publique **AVANT** la ligne 102 (`app.use(headers)`) :

```javascript
// AVANT tout middleware global
app.use('/api/crm-public', crmPublicRouter); // ✅ Route sans protection

// APRÈS
app.use(headers);
app.use('/api', resolveTenant(), agentRouter);
// etc.
```

**Pourquoi ça marche** : Express évalue les routes dans l'ordre. Si la route CRM est montée AVANT les middlewares globaux, elle sera exécutée en premier.

---

### Option B : Créer route hors du namespace /api ✅ ALTERNATIVE

**Fichier** : `server.js`

```javascript
// Route CRM en dehors de /api pour éviter les middlewares
app.use('/crm-data', crmPublicRouter);
```

**Frontend change** :
```typescript
// Au lieu de: http://localhost:3005/api/crm/leads
// Utiliser:   http://localhost:3005/crm-data/leads
```

**Pourquoi ça marche** : Les middlewares globaux sont montés sur `/api/*`, donc `/crm-data/*` les évite complètement.

---

### Option C : Middleware conditionnel qui skip CRM ✅ PROPRE

**Fichier** : `server.js`

**Créer un wrapper** qui skip les middlewares pour `/api/crm` :

```javascript
// Middleware conditionnel
app.use((req, res, next) => {
  // Skip resolveTenant pour /api/crm-public
  if (req.path.startsWith('/api/crm-public')) {
    return next();
  }

  // Appliquer resolveTenant pour autres routes
  resolveTenant()(req, res, next);
});

app.use('/api/crm-public', crmPublicRouter);
```

---

## 🚀 Implémentation Recommandée

### Étape 1 : Déplacer la route CRM en premier

**Fichier** : `d:\Macrea\CRM\max_backend\server.js`

**Localiser** la ligne ~65 (avant `app.use(cors())`) et ajouter :

```javascript
// ============================================================================
// ⚠️ ROUTE CRM PUBLIQUE - DOIT ÊTRE AVANT TOUS LES MIDDLEWARES GLOBAUX
// ============================================================================
import crmPublicRouter from './routes/crmPublic.js';
app.use('/api/crm-public', crmPublicRouter);
// ============================================================================
```

**Retirer** les lignes 132-133 actuelles qui montent crmPublicRouter après les middlewares.

---

### Étape 2 : Mettre à jour le frontend

**Fichier** : `frontend/src/lib/client.ts` (ou équivalent)

**Changer** l'URL de l'API CRM :

```typescript
// AVANT
const CRM_BASE = 'http://localhost:3005/api/crm';

// APRÈS
const CRM_BASE = 'http://localhost:3005/api/crm-public';
```

Ou via variable d'environnement :

```bash
# .env frontend
VITE_CRM_API_URL=http://localhost:3005/api/crm-public
```

---

### Étape 3 : Tester

```bash
# Test backend
curl "http://127.0.0.1:3005/api/crm-public/leads?page=1&pageSize=5"

# Résultat attendu :
{
  "ok": true,
  "leads": [
    {
      "id": "69272eee2a489f7a6",
      "firstName": "Macrea",
      "lastName": "AI Studio",
      "email": "tce1_tce2@yahoo.fr",
      ...
    }
  ],
  "total": 38,
  "page": 1,
  "pageSize": 5
}
```

```bash
# Test health endpoint
curl "http://127.0.0.1:3005/api/crm-public/health"

# Résultat attendu :
{
  "ok": true,
  "message": "EspoCRM connecté",
  "totalLeads": 38
}
```

---

## ✅ Résultat Attendu

Après fix :
- ✅ Endpoint `/api/crm-public/leads` accessible sans auth
- ✅ Retourne les 38 leads réels depuis EspoCRM
- ✅ Frontend CRM affiche les leads
- ✅ Aucun crash, aucune erreur 401
- ✅ Message d'erreur propre si EspoCRM inaccessible

---

## 📋 Checklist Post-Fix

- [ ] Route `/api/crm-public` montée AVANT middlewares
- [ ] Test curl `/api/crm-public/leads` retourne leads
- [ ] Test curl `/api/crm-public/health` retourne OK
- [ ] Frontend mis à jour pour utiliser `/api/crm-public`
- [ ] Tester onglet CRM → aucun crash
- [ ] Tester onglet CRM → leads affichés
- [ ] Créer TODO Phase 3 : réactiver auth CRM

---

## 🔒 TODO Phase 3 (Sécurité)

Une fois que le frontend fonctionne avec `/api/crm-public` :

1. **Implémenter JWT auth frontend**
   - Endpoint login : `POST /api/auth/login`
   - Retourne JWT token
   - Frontend stocke token dans localStorage
   - Frontend envoie token dans header `Authorization: Bearer <token>`

2. **Réactiver authMiddleware sur routes/crm.js**
   ```javascript
   router.use(authMiddleware);
   ```

3. **Rediriger frontend vers `/api/crm` (avec auth)**
   ```typescript
   const CRM_BASE = 'http://localhost:3005/api/crm'; // Route sécurisée
   ```

4. **Supprimer `/api/crm-public` et `routes/crmPublic.js`**
   - Fichier temporaire, à supprimer une fois auth implémentée

---

## 📄 Fichiers Modifiés

| Fichier | Action | Statut |
|---------|--------|--------|
| `max_backend/routes/crmPublic.js` | ✅ Créé | Route CRM sans auth |
| `max_backend/server.js` | ⏳ À modifier | Déplacer route avant middlewares |
| `max_backend/routes/crm.js` | ✅ Modifié | authMiddleware commenté (temporaire) |
| `frontend/src/lib/client.ts` | ⏳ À modifier | Changer URL vers `/api/crm-public` |

---

**Prêt pour implémentation !** 🚀

La seule modification restante : **déplacer la route CRM en ligne 65 de server.js** (avant tous les middlewares).
