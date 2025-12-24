# 📡 État des Endpoints Backend - M.A.X.

**Date** : 2025-12-10
**Objectif** : Cartographie complète des endpoints backend (implémentés vs manquants)

---

## 📊 RÉSUMÉ EXÉCUTIF

| Catégorie | Implémentés | Manquants | Statut |
|-----------|-------------|-----------|--------|
| **CRM** | 3/6 | 3 | 🟡 50% |
| **Chat** | 2/2 | 0 | ✅ 100% |
| **Dashboard** | 1/3 | 2 | 🟡 33% |
| **Automation** | 3/3 | 0 | ✅ 100% |
| **Analytics** | 0/1 | 1 | 🔴 0% |
| **Activity Feed** | 0/2 | 2 | 🔴 0% |
| **User/Settings** | 0/3 | 3 | 🔴 0% |
| **TOTAL** | **9/20** | **11** | 🟡 **45%** |

---

## ✅ ENDPOINTS IMPLÉMENTÉS

### 1. CRM (routes/crmPublic.js) ✅

#### `GET /api/crm-public/leads`
**Usage** : [useCrmStore.ts:70](max_frontend/src/stores/useCrmStore.ts#L70)
```typescript
apiClient.get('/crm-public/leads', {
  params: { page, pageSize, status, search }
})
```
**Retour** :
```json
{
  "ok": true,
  "leads": [
    {
      "id": "69272eee2a489f7a6",
      "firstName": "Macrea",
      "lastName": "AI Studio",
      "name": "Macrea AI Studio",
      "email": "tce1_tce2@yahoo.fr",
      "phone": "+33648662734",
      "company": "",
      "status": "Assigned",
      "source": "",
      "assignedTo": "",
      "createdAt": "2025-11-26 16:46:38",
      "updatedAt": "2025-12-10 10:57:18",
      "notes": "...",
      "tags": ["IA", "Technologie"],
      "score": 85
    }
  ],
  "total": 38,
  "page": 1,
  "pageSize": 20
}
```
**Source** : EspoCRM API
**Status** : ✅ Fonctionnel (38 leads testés)

---

#### `GET /api/crm-public/leads/:id`
**Implémenté** : ✅ OUI (ligne 136-168 de crmPublic.js)
**Retour** :
```json
{
  "ok": true,
  "lead": { /* même format que ci-dessus */ }
}
```
**Status** : ✅ Prêt mais pas encore utilisé par le frontend

---

#### `GET /api/crm-public/health`
**Implémenté** : ✅ OUI (ligne 174-190)
**Usage** : Test connexion EspoCRM
**Retour** :
```json
{
  "ok": true,
  "message": "EspoCRM connecté",
  "totalLeads": 38
}
```
**Status** : ✅ Fonctionnel

---

### 2. Chat (routes/chat.js ou chatMvp1.js) ✅

#### `POST /api/chat`
**Usage** : [useChatStore.ts:196](max_frontend/src/stores/useChatStore.ts#L196)
```typescript
apiClient.post('/chat', {
  sessionId: string,
  message: string,
  mode: 'auto' | 'assist' | 'conseil'
})
```
**Status** : ✅ Fonctionnel

---

#### `POST /api/chat/upload`
**Usage** : [useChatStore.ts:238](max_frontend/src/stores/useChatStore.ts#L238)
```typescript
apiClient.post('/chat/upload', formData)
```
**Status** : ✅ Fonctionnel

---

### 3. Dashboard (routes/dashboardMvp1.js) ✅

#### `GET /api/dashboard-mvp1/stats`
**Usage** : [useDashboardStore.ts:41](max_frontend/src/stores/useDashboardStore.ts#L41)
```typescript
apiClient.get('/dashboard-mvp1/stats')
```
**Retour** :
```json
{
  "stats": {
    "totalLeads": 247,
    "newLeadsToday": 12,
    "conversionRate": 15.3,
    "activeWorkflows": 8,
    "pendingTasks": 23,
    "maxInteractions": 156
  },
  "leadsTrend": [ /* données tendance */ ],
  "recentActivity": [ /* activités récentes */ ],
  "leadsByStatus": [ /* répartition statuts */ ]
}
```
**Status** : ✅ Fonctionnel

---

### 4. Automation (routes/automationMvp1.js) ✅

#### `GET /api/automation-mvp1/workflows`
**Usage** : [useAutomationStore.ts](max_frontend/src/stores/useAutomationStore.ts)
**Status** : ✅ Fonctionnel

---

#### `GET /api/automation-mvp1/workflows/:id`
**Status** : ✅ Fonctionnel

---

#### `POST /api/automation-mvp1/workflows/:id/toggle`
**Status** : ✅ Fonctionnel

---

## 🔴 ENDPOINTS MANQUANTS

### 1. CRM - Opérations avancées ❌

#### `GET /api/crm/leads/:id` (avec auth)
**Usage frontend** : [useCrmStore.ts:97](max_frontend/src/stores/useCrmStore.ts#L97)
```typescript
apiClient.get(`/crm/leads/${leadId}`)
```
**Attendu** :
```json
{
  "ok": true,
  "lead": { /* lead complet */ },
  "notes": [
    {
      "id": "uuid",
      "leadId": "xxx",
      "content": "Note de suivi",
      "createdBy": "John Doe",
      "createdAt": "2024-..."
    }
  ],
  "activities": [
    {
      "id": "uuid",
      "leadId": "xxx",
      "type": "status_change" | "note_added" | "email_sent",
      "description": "Statut changé : New → Assigned",
      "createdBy": "John Doe",
      "createdAt": "2024-..."
    }
  ]
}
```
**Impact** : 🔴 **CRITIQUE** - LeadDetail ne peut pas s'afficher
**Priorité** : **P0**
**Estimation** : 0.5 jour

---

#### `PATCH /api/crm/leads/:id/status`
**Usage frontend** : [useCrmStore.ts:117](max_frontend/src/stores/useCrmStore.ts#L117)
```typescript
apiClient.patch(`/crm/leads/${leadId}/status`, { status: 'Assigned' })
```
**Attendu** :
```json
{
  "ok": true,
  "lead": { /* lead mis à jour */ }
}
```
**Impact** : 🔴 **CRITIQUE** - Impossible de changer le statut d'un lead
**Priorité** : **P0**
**Estimation** : 0.5 jour

---

#### `POST /api/crm/leads/:id/notes`
**Usage frontend** : [useCrmStore.ts:145](max_frontend/src/stores/useCrmStore.ts#L145)
```typescript
apiClient.post(`/crm/leads/${leadId}/notes`, { content: 'Note...' })
```
**Attendu** :
```json
{
  "ok": true,
  "note": {
    "id": "uuid",
    "leadId": "xxx",
    "content": "Note...",
    "createdBy": "John Doe",
    "createdAt": "2024-..."
  }
}
```
**Impact** : 🟡 **HAUTE** - Impossible d'ajouter des notes
**Priorité** : **P1**
**Estimation** : 0.5 jour

---

#### `GET /api/crm-public/metadata/lead-statuses`
**Usage frontend** : [useCrmStore.ts:204](max_frontend/src/stores/useCrmStore.ts#L204) (désactivé)
```typescript
apiClient.get('/crm-public/metadata/lead-statuses')
```
**Attendu** :
```json
{
  "ok": true,
  "options": ["New", "Assigned", "In Process", "Converted", "Recycled", "Dead"],
  "default": "New"
}
```
**Impact** : 🟢 **BASSE** - Fallback hardcodé fonctionne
**Priorité** : **P2**
**Estimation** : 0.25 jour

---

### 2. Dashboard - Stats enrichies ❌

#### `GET /api/stats/overview`
**Usage Demoboard** : DemoBoardStats.tsx
**Pas utilisé** : Frontend réel utilise `/dashboard-mvp1/stats` (OK)
**Attendu** :
```json
{
  "leads_imported": {
    "value": 247,
    "change": 18,
    "changePercent": "+18%",
    "period": "month"
  },
  "fields_corrected": {
    "value": 1842,
    "source": "self_healing"
  },
  "whatsapp_sent": {
    "value": 532,
    "period": "month"
  },
  "workflows_active": {
    "value": 12
  }
}
```
**Impact** : 🟢 **BASSE** - Endpoint MVP1 suffit pour l'instant
**Priorité** : **P3**
**Estimation** : 0.5 jour

---

### 3. Activity Feed ❌

#### `GET /api/activity/recent`
**Usage Demoboard** : DemoBoardLayout.tsx
**Pas implémenté** : ❌
**Attendu** :
```json
{
  "ok": true,
  "activities": [
    {
      "id": "uuid",
      "type": "import" | "self-healing" | "integration" | "campaign" | "workflow",
      "icon": "icon-name",
      "title": "Analyse CSV",
      "description": "20 000 lignes analysées",
      "time": "Il y a 2h",
      "timestamp": "2024-..."
    }
  ]
}
```
**Impact** : 🟡 **HAUTE** - Demoboard a une timeline d'activité
**Priorité** : **P1**
**Estimation** : 1 jour

---

#### `WebSocket /api/feed/live`
**Usage Demoboard** : Real-time feed
**Pas implémenté** : ❌
**Impact** : 🟢 **BASSE** - Nice-to-have (polling suffit)
**Priorité** : **P3**
**Estimation** : 2 jours

---

### 4. Analytics ❌

#### `GET /api/analytics/overview`
**Usage Demoboard** : DemoBoardReports.tsx
**Pas implémenté** : ❌
**Attendu** :
```json
{
  "metrics": {
    "open_rate": { "value": 68.4, "change": 12.3, "trend": "up" },
    "ctr": { "value": 24.7, "change": 8.5, "trend": "up" },
    "response_rate": { "value": 15.2, "change": 3.1, "trend": "up" },
    "conversion_rate": { "value": 9.8, "change": -1.2, "trend": "down" }
  },
  "channels": [
    {
      "name": "Email",
      "sent": 2450,
      "opened": 1680,
      "clicked": 605,
      "responded": 372,
      "converted": 241
    }
  ]
}
```
**Impact** : 🟡 **HAUTE** - Page Reporting ne fonctionne pas
**Priorité** : **P1**
**Estimation** : 1.5 jour

---

### 5. User & Settings ❌

#### `GET /api/user/profile`
**Usage Demoboard** : DemoBoardSidebar.tsx
**Pas implémenté** : ❌
**Attendu** :
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "url",
  "role": "admin"
}
```
**Impact** : 🟢 **BASSE** - Frontend utilise auth store
**Priorité** : **P3**
**Estimation** : 0.25 jour

---

#### `GET /api/user/tokens`
**Usage Demoboard** : DemoBoardHeader.tsx (token counter)
**Pas implémenté** : ❌
**Attendu** :
```json
{
  "used": 14200,
  "limit": 20000,
  "percentage": 71,
  "resetDate": "2024-..."
}
```
**Impact** : 🟡 **HAUTE** - Header ne peut pas afficher token usage
**Priorité** : **P1**
**Estimation** : 0.5 jour

---

#### `GET /api/integrations/status`
**Usage Demoboard** : DemoBoardHeader.tsx (CRM badge)
**Pas implémenté** : ❌
**Attendu** :
```json
{
  "crm": {
    "connected": true,
    "lastSync": "2024-...",
    "provider": "EspoCRM"
  },
  "email": {
    "connected": true,
    "provider": "SendGrid"
  },
  "whatsapp": {
    "connected": true,
    "provider": "Twilio"
  }
}
```
**Impact** : 🟢 **BASSE** - Nice-to-have
**Priorité** : **P3**
**Estimation** : 0.5 jour

---

## 🎯 PLAN D'ACTION - ENDPOINTS

### Phase 1 : CRM Core (P0 - CRITIQUE) 🔴

**Durée** : 1.5 jour
**Impact** : Débloquer fonctionnalités critiques CRM

1. **`GET /api/crm-public/leads/:id` (détail + notes + activities)** (0.5j)
   - Récupérer lead depuis EspoCRM
   - Récupérer notes associées (table custom ou champ EspoCRM)
   - Générer historique d'activités (via Stream EspoCRM)

2. **`PATCH /api/crm-public/leads/:id/status`** (0.5j)
   - Mettre à jour statut via EspoCRM API
   - Créer entrée d'activité "status_change"
   - Retourner lead mis à jour

3. **`POST /api/crm-public/leads/:id/notes`** (0.5j)
   - Créer note via EspoCRM (champ Notes ou entité Note)
   - Créer entrée d'activité "note_added"
   - Retourner note créée

**Fichier** : Ajouter dans [routes/crmPublic.js](max_backend/routes/crmPublic.js)

---

### Phase 2 : Dashboard & Analytics (P1 - HAUTE) 🟡

**Durée** : 2 jours
**Impact** : Enrichir Dashboard et activer page Reporting

4. **`GET /api/activity/recent`** (1j)
   - Créer table `activities` (PostgreSQL)
   - Récupérer 20 dernières activités
   - Format : icon, title, description, time

5. **`GET /api/analytics/overview`** (1j)
   - Agréger données depuis CRM/campaigns
   - Calculer métriques (open rate, CTR, conversion)
   - Grouper par canal (Email, WhatsApp, SMS)

**Fichiers** :
- [routes/activity.js](max_backend/routes/activity.js) (nouveau)
- [routes/analytics.js](max_backend/routes/analytics.js) (nouveau)

---

### Phase 3 : User & Metadata (P1 - HAUTE) 🟡

**Durée** : 1 jour
**Impact** : Afficher token usage + metadata statuts

6. **`GET /api/user/tokens`** (0.5j)
   - Comptabiliser tokens utilisés (via logs ou table)
   - Retourner usage + limite

7. **`GET /api/crm-public/metadata/lead-statuses`** (0.25j)
   - Récupérer statuts depuis EspoCRM metadata
   - Retourner liste + statut par défaut

**Fichiers** :
- [routes/user.js](max_backend/routes/user.js) (nouveau)
- Ajouter dans [routes/crmPublic.js](max_backend/routes/crmPublic.js)

---

### Phase 4 : Polish & Nice-to-have (P2-P3) 🟢

**Durée** : 3 jours (optionnel)
**Impact** : Améliorer UX mais pas bloquant

8. **`GET /api/stats/overview`** (0.5j)
9. **`GET /api/user/profile`** (0.25j)
10. **`GET /api/integrations/status`** (0.5j)
11. **WebSocket `/api/feed/live`** (2j)

---

## 📋 ESTIMATION TOTALE

| Phase | Durée | Priorité | Endpoints |
|-------|-------|----------|-----------|
| **Phase 1 - CRM Core** | 1.5 jour | 🔴 P0 | 3 endpoints |
| **Phase 2 - Dashboard** | 2 jours | 🟡 P1 | 2 endpoints |
| **Phase 3 - User/Meta** | 1 jour | 🟡 P1 | 2 endpoints |
| **Phase 4 - Polish** | 3 jours | 🟢 P2-P3 | 4 endpoints |
| **TOTAL** | **7.5 jours** | - | **11 endpoints** |

**Recommandation** : Commencer par **Phase 1** (1.5j) pour débloquer le CRM immédiatement.

---

## 🚀 PROCHAINE ÉTAPE

### Option 1 : Backend first (recommandé)
Créer les 3 endpoints CRM critiques (Phase 1) → 1.5 jour
**Bénéfice** : Débloquer LeadDetail, changement statut, ajout notes

### Option 2 : Frontend first
Améliorer le CSS du CRM (cards, animations) → 1 jour
**Bénéfice** : Impact visuel immédiat, endpoints peuvent attendre

### Option 3 : Parallèle
- CSS frontend (toi ou dev frontend) + Backend endpoints (moi) en parallèle
**Bénéfice** : Gain de temps max

**Que préfères-tu prioriser ?** 🎯
