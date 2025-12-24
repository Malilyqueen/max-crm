# Rapport d'Audit - Cockpit "Activités M.A.X. en temps réel"

**Date**: 23 décembre 2025
**Mission**: Audit complet FRONTEND ↔ BACKEND - Identification point de rupture activités temps réel
**Status**: ✅ DIAGNOSTIC COMPLET

---

## 🎯 RÉSUMÉ EXÉCUTIF

### Verdict Principal
**Le système d'activités est CASSÉ** - Le frontend affiche des données MOCKÉES et n'utilise PAS les vrais logs d'actions CRM.

### Problème Identifié
**AUCUNE CONNEXION** entre :
- ❌ Les vraies actions CRM (Opportunity, Contact, Ticket, etc.) loggées dans `actionLogger.js`
- ❌ L'affichage frontend du cockpit "Activités récentes"

### Impact
- L'utilisateur voit des activités **fictives hardcodées** datant de plusieurs heures
- Les **vraies actions CRM** (créées par M.A.X.) ne sont **jamais affichées** dans le cockpit
- **Perte totale de visibilité** sur l'activité réelle de M.A.X.

---

## 📊 CARTOGRAPHIE COMPLÈTE

### 1. FRONTEND - DashboardPage

**Fichier**: [`max_frontend/src/pages/DashboardPage.tsx`](d:\Macrea\CRM\max_frontend\src\pages\DashboardPage.tsx)

**Component**: `<RecentActivityList activities={recentActivity} />`
**Ligne**: 196

**Source de données**:
```typescript
const { recentActivity } = useDashboardStore();
```

---

### 2. FRONTEND - Store Dashboard

**Fichier**: [`max_frontend/src/stores/useDashboardStore.ts`](d:\Macrea\CRM\max_frontend\src\stores\useDashboardStore.ts)

**Action**: `loadDashboard()`
**Ligne**: 37-58

**Endpoint appelé**:
```typescript
const response = await apiClient.get<DashboardData>('/dashboard-mvp1/stats');
```

**URL complète**: `GET http://localhost:3005/api/dashboard-mvp1/stats`

---

### 3. BACKEND - Route Dashboard MVP1

**Fichier**: [`max_backend/routes/dashboardMvp1.js`](d:\Macrea\CRM\max_backend\routes\dashboardMvp1.js)

**Endpoint**: `GET /api/dashboard-mvp1/stats`
**Ligne**: 18-104

**Type de données**: ⚠️ **DONNÉES MOCKÉES HARDCODÉES**

**Code problématique (ligne 46-83)**:
```javascript
recentActivity: [
  {
    id: '1',
    type: 'lead_created',
    title: 'Nouveau lead créé',
    description: 'Jean Dupont - contact@example.com',
    timestamp: new Date(now - 1000 * 60 * 15).toISOString() // 15 min ago
  },
  {
    id: '2',
    type: 'max_interaction',
    title: 'Interaction M.A.X.',
    description: 'Analyse de fichier CSV (25 leads)',
    timestamp: new Date(now - 1000 * 60 * 45).toISOString() // 45 min ago
  },
  // ... 3 autres activités fictives
]
```

**❌ PROBLÈME**: Aucun appel aux vrais logs d'actions !

---

### 4. BACKEND - Les 3 Systèmes de Logging (DÉCONNECTÉS du frontend)

#### 4.1 ActionLogger (Le VRAI système - NON UTILISÉ par cockpit)

**Fichier**: [`max_backend/actions/actionLogger.js`](d:\Macrea\CRM\max_backend\actions\actionLogger.js)

**Fonctionnalités**:
- ✅ `logAction(logEntry)` - Log toutes les actions CRM réelles
- ✅ `getActionLogs(filters)` - Récupération avec filtres (tenant, type, success)
- ✅ `getActionStats(tenantId)` - Statistiques par type d'action
- ✅ Stockage: In-memory Map, limite 1000 logs
- ✅ Métadonnées complètes: tenantId, actionType, payload, result, duration, timestamp

**Appelé depuis**:
- [`actions/index.js`](d:\Macrea\CRM\max_backend\actions\index.js) ligne 86-93 (succès) et 106-113 (erreurs)
- Toutes les actions CRM (create_opportunity, create_contact, create_ticket, create_knowledge_article, etc.)

**Exposé via API**: ✅ **OUI**
- `GET /api/action-layer/logs` (route [`actions-api.js`](d:\Macrea\CRM\max_backend\routes\actions-api.js) ligne 65-82)
- `GET /api/action-layer/stats` (ligne 91-100)

**⚠️ CRITIQUE**: Ces endpoints existent mais **ne sont PAS appelés par le frontend** !

---

#### 4.2 Activity Service (Simple - Utilisé par un endpoint obsolète)

**Fichier**: [`max_backend/services/activity.js`](d:\Macrea\CRM\max_backend\services\activity.js)

**Code**:
```javascript
const activity = [];
function push (evt){ activity.push({ ...evt, ts:Date.now() }); }
function list (){ return activity.slice(-200); }
export default { push, list };
```

**Exposé via**: `GET /api/activity` (route [`actions.js`](d:\Macrea\CRM\max_backend\routes\actions.js) ligne 13)

**Usage**:
- Utilisé uniquement par `POST /api/actions/execute` (ligne 10) pour un système legacy
- ❌ **PAS utilisé par les vraies actions CRM**
- ❌ **PAS appelé par le frontend dashboard**

---

#### 4.3 Activity Logger (Fichier JSONL - Pour reporting admin)

**Fichier**: [`max_backend/lib/activityLogger.js`](d:\Macrea\CRM\max_backend\lib\activityLogger.js)

**Fonctionnalités**:
- `logMaxActivity(action)` - Écrit dans `logs/max_activity.jsonl`
- `getRecentMaxActivity(limit)` - Lecture des dernières entrées
- Format JSONL pour persistance long-terme

**Usage**: ❌ **NON utilisé actuellement** (aucun import trouvé dans la codebase)

---

## 🔍 POINT DE RUPTURE EXACT

### Flux ACTUEL (CASSÉ)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Action CRM                                              │
│    (create_opportunity, create_contact, etc.)                   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│ 2. executeAction() - actions/index.js                           │
│    ✅ Exécute l'action                                          │
│    ✅ Appelle logAction() (actionLogger.js)                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│ 3. actionLogger.js (In-Memory Map)                              │
│    ✅ Stock logs avec toutes métadonnées                        │
│    ✅ Accessible via GET /api/action-layer/logs                 │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ ❌ RUPTURE ICI - Aucun pont vers frontend
                 │
                 X  (Frontend n'appelle JAMAIS /action-layer/logs)
```

### Flux Frontend (MOCKÉES)

```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: DashboardPage.tsx                                      │
│ Component: <RecentActivityList activities={recentActivity} />   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│ Store: useDashboardStore.ts                                     │
│ Action: loadDashboard()                                         │
│ Appel: GET /api/dashboard-mvp1/stats                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│ Backend: routes/dashboardMvp1.js                                │
│ ❌ RETOURNE DES DONNÉES FICTIVES HARDCODÉES                     │
│ ❌ 5 activités mockées avec timestamps relatifs                 │
│ ❌ Aucune connexion avec actionLogger ou vraies actions         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 AUTH + MULTI-TENANT

### Authentification Dashboard

**Route**: `/api/dashboard-mvp1/stats`
**Middleware**: ✅ `authMiddleware` (ligne 12 de `dashboardMvp1.js`)

**Flux Auth**:
1. Frontend: Token JWT stocké dans `localStorage` (`auth-storage`)
2. Frontend: Intercepteur axios ajoute `Authorization: Bearer <token>` ([`api/client.ts`](d:\Macrea\CRM\max_frontend\src\api\client.ts) ligne 42)
3. Backend: `authMiddleware` vérifie le token et injecte `req.user`

**Logs auth visibles**: Oui (console logs détaillés ligne 29-67 du client.ts)

### Multi-Tenant

**Headers envoyés** (client.ts ligne 54-67):
```javascript
'X-Tenant': tenant,        // 'macrea' ou 'macrea-admin'
'X-Role': userRole,        // 'user' ou 'ADMIN'
'X-Preview': 'false'
```

**⚠️ PROBLÈME**: Le `dashboardMvp1.js` **ignore complètement** le `tenantId` !
- Ligne 20: `const userId = req.user?.id || 'unknown';`
- Ligne 21: Log de `userId` uniquement
- ❌ **Aucun filtrage par tenant** dans les données mockées

### Endpoint Action Layer

**Route**: `/api/action-layer/logs`
**Middleware**: ❌ **AUCUN AUTH** (défini AVANT le middleware headers, ligne 112 de `server.js`)

**Filtrage tenant**:
```javascript
// Query params disponibles
?tenantId=macrea&actionType=create_opportunity&success=true&limit=50
```

✅ Le `getActionLogs()` supporte le filtrage par tenantId
⚠️ Mais **pas de protection auth** sur cet endpoint !

---

## 🧪 TESTS DE VALIDATION

### Test 1: Vérifier que actionLogger reçoit bien les logs

```bash
# Créer une opportunité via test
node "d:\Macrea\CRM\max_backend\test-new-entities.js"

# Vérifier les logs via API
curl -s "http://localhost:3005/api/action-layer/logs?limit=10" | jq
```

**Résultat attendu**: Logs des 4 actions du test (opportunity, contact, ticket, article)

---

### Test 2: Vérifier ce que le frontend reçoit actuellement

```bash
# Simuler appel frontend dashboard
curl -s "http://localhost:3005/api/dashboard-mvp1/stats" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  | jq '.recentActivity'
```

**Résultat attendu**: 5 activités fictives hardcodées (Jean Dupont, Marie Martin, etc.)

---

### Test 3: Vérifier l'endpoint /activity (legacy)

```bash
curl -s "http://localhost:3005/api/activity" | jq
```

**Résultat attendu**: Tableau vide ou activités d'un ancien système

---

## ✅ SOLUTION RECOMMANDÉE

### A. Quick Fix (30 min - Production immédiate)

**Modifier**: [`routes/dashboardMvp1.js`](d:\Macrea\CRM\max_backend\routes\dashboardMvp1.js)

**Changement ligne 46-83**: Remplacer données mockées par appel à actionLogger

```javascript
import { getActionLogs } from '../actions/actionLogger.js';

router.get('/stats', async (req, res) => {
  try {
    const userId = req.user?.id || 'unknown';
    const tenantId = req.headers['x-tenant'] || 'macrea';

    console.log(`[Dashboard MVP1] Récupération stats pour user: ${userId}, tenant: ${tenantId}`);

    // Récupérer vraies activités depuis actionLogger
    const actionLogs = getActionLogs({
      tenantId,
      limit: 10
    });

    // Mapper vers format dashboard
    const recentActivity = actionLogs.map((log, index) => ({
      id: log.id,
      type: mapActionTypeToActivityType(log.actionType),
      title: generateActivityTitle(log),
      description: log.result?.preview || log.actionType,
      timestamp: log.timestamp
    }));

    const dashboardData = {
      stats: {
        totalLeads: 25, // TODO: Remplacer par vraies stats EspoCRM
        newLeadsToday: 3,
        conversionRate: 16.0,
        activeWorkflows: 5,
        pendingTasks: 12,
        maxInteractions: actionLogs.filter(l => l.success).length
      },
      leadsTrend: [ /* garder mock pour l'instant */ ],
      recentActivity, // ✅ VRAIES DONNÉES
      leadsByStatus: [ /* garder mock pour l'instant */ ]
    };

    res.json(dashboardData);

  } catch (error) {
    console.error('[Dashboard MVP1] Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

// Helper functions
function mapActionTypeToActivityType(actionType) {
  const mapping = {
    'create_opportunity': 'max_interaction',
    'create_contact': 'max_interaction',
    'create_ticket': 'max_interaction',
    'create_knowledge_article': 'max_interaction',
    'write_crm_note': 'max_interaction',
    'send_email': 'workflow_triggered',
    'update_crm_field': 'lead_converted'
  };
  return mapping[actionType] || 'max_interaction';
}

function generateActivityTitle(log) {
  const titles = {
    'create_opportunity': 'Opportunité créée',
    'create_contact': 'Contact créé',
    'create_ticket': 'Ticket créé',
    'create_knowledge_article': 'Article KB créé',
    'write_crm_note': 'Note CRM ajoutée',
    'send_email': 'Email envoyé',
    'update_crm_field': 'Lead mis à jour'
  };
  return titles[log.actionType] || 'Action M.A.X.';
}
```

**Avantages**:
- ✅ Fix immédiat sans toucher au frontend
- ✅ Utilise les vrais logs d'actions
- ✅ Garde la compatibilité avec le format dashboard existant
- ✅ Filtrage par tenant fonctionnel

**Inconvénients**:
- ⚠️ Logs en mémoire (max 1000, perdu au redémarrage)
- ⚠️ Pas de persistance long terme

---

### B. Clean Fix (2-3h - Production semaine prochaine)

**1. Activer persistence Supabase dans actionLogger**

Modifier [`actions/actionLogger.js`](d:\Macrea\CRM\max_backend\actions\actionLogger.js) ligne 47:

```javascript
// TODO: Persister dans Supabase ou EspoCRM
// → Implémenter sauvegarde dans table Supabase `action_logs`
```

**Table Supabase `action_logs`**:
```sql
CREATE TABLE action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  payload JSONB,
  result JSONB,
  success BOOLEAN NOT NULL,
  duration INTEGER,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  INDEX idx_tenant_timestamp (tenant_id, timestamp DESC),
  INDEX idx_action_type (action_type),
  INDEX idx_success (success)
);
```

**2. Ajouter endpoint dédié activités temps réel**

Créer [`routes/activities.js`](d:\Macrea\CRM\max_backend\routes\activities.js):

```javascript
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getActionLogs } from '../actions/actionLogger.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/activities/recent
 * Activités récentes filtrées par tenant
 */
router.get('/recent', async (req, res) => {
  const tenantId = req.headers['x-tenant'] || req.user?.tenantId;
  const { limit = 20, actionType, success } = req.query;

  const logs = getActionLogs({
    tenantId,
    actionType,
    success: success !== undefined ? success === 'true' : undefined,
    limit: parseInt(limit)
  });

  res.json({
    success: true,
    count: logs.length,
    activities: logs.map(formatActivity)
  });
});

function formatActivity(log) {
  return {
    id: log.id,
    type: mapActionType(log.actionType),
    title: generateTitle(log),
    description: log.result?.preview || log.actionType,
    timestamp: log.timestamp,
    success: log.success,
    duration: log.duration,
    metadata: {
      actionType: log.actionType,
      entityId: log.result?.entityId,
      provider: log.result?.provider
    }
  };
}

export default router;
```

**3. Frontend - Polling ou SSE**

Option A: **Polling classique** (simple)
```typescript
// useDashboardStore.ts
useEffect(() => {
  const interval = setInterval(() => {
    refreshActivities();
  }, 15000); // Refresh toutes les 15s

  return () => clearInterval(interval);
}, []);
```

Option B: **Server-Sent Events** (temps réel)
```javascript
// Backend: routes/activities.js
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendUpdate = () => {
    const logs = getActionLogs({ tenantId, limit: 20 });
    res.write(`data: ${JSON.stringify(logs)}\n\n`);
  };

  const interval = setInterval(sendUpdate, 5000);
  req.on('close', () => clearInterval(interval));
});
```

---

### C. Robust Fix (1-2 jours - Long terme)

**Architecture complète temps réel**:

1. **Persistence Supabase** avec Realtime subscriptions
2. **Webhook** depuis actionLogger vers Supabase
3. **Frontend** écoute Supabase Realtime Channel
4. **Filtrage** par tenant_id au niveau DB (RLS policies)
5. **Métriques** temps réel (compteurs, graphiques)
6. **Health check** `/api/activities/health` avec dernière synchro

**Avantages**:
- ✅ Temps réel natif (< 100ms latency)
- ✅ Persistence garantie
- ✅ Scalable multi-tenant
- ✅ Historique complet filtrable
- ✅ Pas de polling (économie bande passante)

**Technologies**:
- Supabase Realtime (WebSocket)
- PostgreSQL RLS (Row Level Security)
- Supabase JS Client

---

## 🎯 PLAN D'ACTION RECOMMANDÉ

### Phase 1: Quick Fix (AUJOURD'HUI)
1. ✅ Modifier `dashboardMvp1.js` pour utiliser `getActionLogs()`
2. ✅ Tester avec les 4 actions du test (opportunity, contact, ticket, KB)
3. ✅ Vérifier filtrage tenant
4. ✅ Déployer en dev

**Durée**: 1h
**Risque**: Faible (rétrocompatible)
**Impact**: Visibilité immédiate des vraies actions

---

### Phase 2: Clean Fix (SEMAINE PROCHAINE)
1. Créer table Supabase `action_logs`
2. Modifier `actionLogger.js` pour persister en DB
3. Créer route `/api/activities/recent`
4. Ajouter polling frontend (15s)
5. Migrer dashboard vers nouvel endpoint

**Durée**: 3h
**Risque**: Moyen (migration DB)
**Impact**: Persistence + historique complet

---

### Phase 3: Robust Fix (2025 Q1)
1. Implémenter Supabase Realtime
2. Remplacer polling par WebSocket
3. Dashboard avancé avec filtres
4. Métriques temps réel
5. Alertes / notifications

**Durée**: 2 jours
**Risque**: Élevé (architecture nouvelle)
**Impact**: Système production-ready scalable

---

## 📝 CHECKLIST DIAGNOSTIC

### Endpoint Backend
- ✅ `/api/dashboard-mvp1/stats` existe et retourne données mockées
- ✅ `/api/action-layer/logs` existe et contient vrais logs
- ✅ `/api/action-layer/stats` existe et calcule statistiques
- ❌ `/api/activity` existe mais NON utilisé par actions CRM
- ❌ Aucun endpoint `/api/activities/recent` dédié temps réel

### Logging Systems
- ✅ `actionLogger.js` - Système principal fonctionnel (in-memory)
- ⚠️ `activityLogger.js` - Fichier JSONL non utilisé
- ⚠️ `activity.js` - Service legacy non connecté

### Frontend
- ✅ Dashboard affiche composant `<RecentActivityList />`
- ✅ Store Zustand `useDashboardStore` gère state
- ✅ API client avec auth JWT + headers multi-tenant
- ❌ Appelle endpoint mockées au lieu de vrais logs
- ❌ Aucun polling / refresh automatique
- ❌ Aucune connexion temps réel

### Auth & Security
- ✅ JWT auth fonctionnel sur dashboard-mvp1
- ⚠️ Endpoint `/api/action-layer/*` sans auth
- ✅ Headers multi-tenant envoyés correctement
- ❌ Filtrage tenant pas appliqué dans dashboard mockées

---

## 🔗 FICHIERS CLÉS À MODIFIER

### Quick Fix (Priorité 1)
1. [`max_backend/routes/dashboardMvp1.js`](d:\Macrea\CRM\max_backend\routes\dashboardMvp1.js) - Ligne 46-83

### Clean Fix (Priorité 2)
1. [`max_backend/actions/actionLogger.js`](d:\Macrea\CRM\max_backend\actions\actionLogger.js) - Ligne 47 (TODO persistence)
2. Créer `max_backend/routes/activities.js` (nouveau fichier)
3. [`max_backend/server.js`](d:\Macrea\CRM\max_backend\server.js) - Ajouter route activities
4. [`max_frontend/src/stores/useDashboardStore.ts`](d:\Macrea\CRM\max_frontend\src\stores\useDashboardStore.ts) - Ajouter polling

### Robust Fix (Priorité 3)
1. Créer migration Supabase
2. Créer service Supabase realtime
3. Modifier frontend pour WebSocket

---

## 📊 MÉTRIQUES ACTUELLES

### Backend Logs (actionLogger)
- **Capacité**: 1000 logs en mémoire
- **Format**: Map<id, logEntry>
- **Métadonnées**: ✅ Complet (tenant, action, payload, result, duration)
- **Filtrage**: ✅ tenant, actionType, success, limit
- **Persistance**: ❌ Perdu au redémarrage

### Frontend Dashboard
- **Source**: Données mockées hardcodées
- **Rafraîchissement**: Manuel uniquement (bouton "Actualiser")
- **Filtrage**: ❌ Aucun
- **Temps réel**: ❌ Aucun
- **Historique**: ❌ 5 activités fictives max

---

## ⚠️ RISQUES IDENTIFIÉS

### Technique
1. **Perte de logs au redémarrage** (in-memory sans DB)
2. **Limite 1000 logs** (rotation automatique, anciennes données perdues)
3. **Pas d'auth** sur `/api/action-layer/*` (exposition données sensibles)
4. **Pas de filtrage tenant** dans dashboard mockées (risque cross-tenant)

### Utilisateur
1. **Confusion totale** - Utilisateur pense que M.A.X. ne fait rien
2. **Perte de confiance** - Activités affichées ne correspondent pas à la réalité
3. **Impossible de débugger** - Pas de visibilité sur vraies erreurs

### Business
1. **Impossible de monitorer** l'activité réelle de M.A.X.
2. **Pas de métriques fiables** pour KPIs
3. **Audit impossible** (logs non persistés)

---

## 🎉 CONCLUSION

### Source de Vérité
**Les "activités" ont DEUX sources de vérité déconnectées**:

1. **Vraie source** (ignorée): `actionLogger.js` - Map in-memory avec tous les logs CRM réels
2. **Fausse source** (utilisée): `dashboardMvp1.js` ligne 46-83 - Tableau hardcodé de données fictives

### Point de Rupture Exact
**Ligne 41 de `useDashboardStore.ts`**:
```typescript
const response = await apiClient.get<DashboardData>('/dashboard-mvp1/stats');
```

Cette ligne devrait appeler `/api/action-layer/logs` ou un nouveau endpoint `/api/activities/recent` connecté à `actionLogger`, mais appelle à la place un endpoint mockées.

### Next Step Immédiat
**Implémenter Quick Fix A** - Modifier `dashboardMvp1.js` pour utiliser `getActionLogs()` au lieu de données mockées.

**ETA**: 30-60 minutes
**Impact**: Cockpit fonctionnel avec vraies données
**Risque**: Minimal (changement backend uniquement, API compatible)

---

**Rapport généré par Claude Sonnet 4.5 - 23 décembre 2025**
**🔍 Audit complet terminé - Prêt pour correctifs**