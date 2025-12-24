# 📋 PHASE 3 - HARMONISATION FRONTEND + BACKEND

**Date de début** : 2025-12-10
**Objectif principal** : Connecter le backend M.A.X. fonctionnel avec le frontend, en s'inspirant du Demoboard pour garantir la cohérence

---

## 🎯 Objectif de la Phase 3

**Problème actuel** :
- ✅ Backend M.A.X. fonctionnel (port 3005)
- ✅ Demoboard démo fonctionnel (avec données mockées)
- ❌ Frontend production plante sur l'onglet CRM
- ❌ Données réelles ne s'affichent pas correctement
- ❌ Décalage entre démo et frontend réel

**Solution** :
Harmoniser le frontend réel avec l'architecture du Demoboard tout en connectant les vraies données du backend M.A.X.

---

## 📊 État des lieux

### ✅ Ce qui fonctionne (Backend)

| Composant | Statut | Endpoints disponibles |
|-----------|--------|----------------------|
| **M.A.X. Chat** | ✅ | `POST /api/chat` - conversation avec GPT-4o-mini |
| **CRM EspoCRM** | ✅ | `GET /api/crm/leads`, `POST /api/crm/create-lead`, `PATCH /api/crm/update-lead/:id` |
| **Mémoire longue** | ✅ | Objectifs (tenant_goals), Profil (tenant_memory), Notes |
| **Upload CSV** | ✅ | `POST /api/upload/analyze`, `POST /api/upload/enrich`, `POST /api/upload/import` |
| **WhatsApp** | ✅ | `POST /api/whatsapp/send` |
| **n8n Workflows** | ✅ | Webhook relance J+3 |
| **Stats & Analytics** | ❌ | **MANQUANT** - à créer |
| **Activity Feed** | ❌ | **MANQUANT** - à créer |
| **Real-time (WebSocket)** | ❌ | **MANQUANT** - à créer |

### ✅ Ce qui fonctionne (Demoboard)

| Composant | Statut | Données |
|-----------|--------|---------|
| **DemoBoardLayout** | ✅ | Orchestrateur avec 5 tabs |
| **DemoBoardChat** | ✅ | Interface conversationnelle (mockée) |
| **DemoBoardCrm** | ✅ | Table leads (10 leads mockés) |
| **DemoBoardStats** | ✅ | 4 KPI cards (données mockées) |
| **DemoBoardAutomations** | ✅ | 8 templates workflow (mockés) |
| **DemoBoardReports** | ✅ | Analytics (données mockées) |
| **useMaxStateMachine** | ✅ | State machine 4 états |

---

## 🚀 Plan d'action - 6 phases

### 📅 PHASE 3.1 - Diagnostic & Architecture (Jour 1)

#### Objectifs :
1. Identifier l'emplacement exact du frontend réel
2. Comprendre pourquoi l'onglet CRM plante
3. Documenter l'architecture actuelle

#### Actions :
- [ ] **Trouver le code frontend réel**
  - Chercher dossiers : `frontend/`, `client/`, `ui/`, `src/`, `app/`
  - Identifier si React, Vue, ou autre framework
  - Localiser les composants CRM existants

- [ ] **Analyser les logs d'erreur**
  - Ouvrir la console navigateur
  - Identifier erreurs JavaScript lors du clic sur CRM
  - Vérifier erreurs réseau (appels API échoués)

- [ ] **Documenter l'état actuel**
  - Capturer screenshots des onglets fonctionnels
  - Capturer screenshots des erreurs CRM
  - Lister les composants React existants

#### Livrables :
- 📄 Document `FRONTEND_AUDIT_2025-12-10.md`
- 📸 Screenshots des erreurs
- 🗺️ Map de l'architecture frontend actuelle

---

### 📅 PHASE 3.2 - Correction Crashs CRM (Jours 2-3)

#### Objectifs :
1. Corriger les crashes de l'onglet CRM
2. Afficher les leads réels depuis EspoCRM
3. Implémenter error boundaries

#### Actions :

##### **A. Diagnostic précis du crash**
- [ ] Analyser la stack trace d'erreur
- [ ] Identifier si c'est :
  - Erreur de fetch API (URL incorrecte, CORS)
  - Erreur de render (données undefined)
  - Erreur de state management

##### **B. Correction selon le type d'erreur**

**Si erreur API :**
```typescript
// Vérifier que l'URL API est correcte
const API_BASE = process.env.VITE_API_URL || 'http://127.0.0.1:3005'

// Ajouter error handling
try {
  const response = await fetch(`${API_BASE}/api/crm/leads`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  setLeads(data.list || [])
} catch (error) {
  console.error('Erreur chargement leads:', error)
  setError(error.message)
}
```

**Si erreur de render :**
```typescript
// Ajouter guards null-safety
{leads?.map(lead => (
  <LeadRow key={lead.id} lead={lead} />
)) ?? <EmptyState />}
```

**Si erreur state :**
```typescript
// Initialiser correctement le state
const [leads, setLeads] = useState<Lead[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
```

##### **C. Implémenter Error Boundary**
```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}

// Wrap CRM tab
<ErrorBoundary>
  <CrmTab />
</ErrorBoundary>
```

#### Livrables :
- ✅ Onglet CRM ne plante plus
- ✅ Leads réels EspoCRM affichés
- ✅ Error boundaries implémentés

---

### 📅 PHASE 3.3 - Migration State Management (Jours 4-5)

#### Objectifs :
1. Remplacer props drilling par Zustand
2. Centraliser le state global
3. Harmoniser avec l'architecture Demoboard

#### Actions :

##### **A. Installer Zustand**
```bash
npm install zustand
```

##### **B. Créer store global**
```typescript
// stores/useMaxStore.ts
import create from 'zustand'
import { MaxState, AutomationAction, Activity, Lead } from './types'

interface MaxStore {
  // State
  maxState: MaxState
  activeTab: string
  leads: Lead[]
  automations: AutomationAction[]
  activities: Activity[]
  stats: Stats

  // Actions
  setMaxState: (state: MaxState) => void
  setActiveTab: (tab: string) => void
  setLeads: (leads: Lead[]) => void
  addAutomation: (automation: AutomationAction) => void
  addActivity: (activity: Activity) => void
  fetchLeads: () => Promise<void>
  fetchStats: () => Promise<void>
}

export const useMaxStore = create<MaxStore>((set, get) => ({
  // Initial state
  maxState: 'ACCUEIL',
  activeTab: 'dashboard',
  leads: [],
  automations: [],
  activities: [],
  stats: {},

  // Actions
  setMaxState: (state) => set({ maxState: state }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setLeads: (leads) => set({ leads }),
  addAutomation: (automation) => set(state => ({
    automations: [...state.automations, automation]
  })),
  addActivity: (activity) => set(state => ({
    activities: [activity, ...state.activities].slice(0, 50) // Max 50
  })),

  // Async actions
  fetchLeads: async () => {
    try {
      const response = await fetch('http://127.0.0.1:3005/api/crm/leads')
      const data = await response.json()
      set({ leads: data.list || [] })
    } catch (error) {
      console.error('Error fetching leads:', error)
    }
  },

  fetchStats: async () => {
    try {
      const response = await fetch('http://127.0.0.1:3005/api/stats/overview')
      const data = await response.json()
      set({ stats: data })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }
}))
```

##### **C. Migrer composants**
```typescript
// Avant (props drilling)
<DemoBoardChat
  onAutomationTriggered={handleAutomationTriggered}
  onMessageSent={handleMaxStateChange}
/>

// Après (Zustand)
import { useMaxStore } from '@/stores/useMaxStore'

function DemoBoardChat() {
  const addAutomation = useMaxStore(state => state.addAutomation)
  const setMaxState = useMaxStore(state => state.setMaxState)

  // Use directly
  handleAutomation(() => {
    addAutomation({ type: 'email', message: '...' })
    setMaxState('EXECUTION')
  })
}
```

#### Livrables :
- ✅ Store Zustand implémenté
- ✅ Props drilling éliminé
- ✅ State centralisé et persistant

---

### 📅 PHASE 3.4 - Création APIs Manquantes (Jours 6-9)

#### Objectifs :
1. Créer les APIs pour Stats, Analytics, Activity Feed
2. Connecter le frontend aux vraies données
3. Harmoniser avec les besoins du Demoboard

#### Actions :

##### **A. API Stats Overview** (0.5 jour)

**Backend** : `max_backend/routes/stats.js`
```javascript
const express = require('express');
const router = express.Router();
const { getSupabaseClient } = require('../lib/supabaseClient');
const espoClient = require('../lib/espoClient');

// GET /api/stats/overview?period=30d
router.get('/overview', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const tenantId = req.headers['x-tenant-id'] || 'macrea';

    // Calculer date début
    const days = parseInt(period.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Nombre de leads importés (depuis EspoCRM)
    const leadsResult = await espoClient.getLeads({ limit: 1 });
    const totalLeads = leadsResult.total || 0;

    // Champs corrigés (depuis max_logs)
    const supabase = getSupabaseClient();
    const { data: selfHealingLogs } = await supabase
      .from('max_logs')
      .select('metadata')
      .eq('tenant_id', tenantId)
      .eq('action_type', 'self_healing_applied')
      .gte('created_at', startDate.toISOString());

    const fieldsCorrected = selfHealingLogs?.reduce((sum, log) => {
      return sum + (log.metadata?.fields_corrected || 0);
    }, 0) || 0;

    // WhatsApp envoyés (depuis max_logs)
    const { count: whatsappCount } = await supabase
      .from('max_logs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('action_type', 'whatsapp_sent')
      .gte('created_at', startDate.toISOString());

    // Workflows actifs (depuis automations si table existe)
    const workflowsActive = 0; // TODO: implémenter quand table automations créée

    res.json({
      leads_imported: {
        value: totalLeads,
        change: 18, // TODO: calculer % changement vs période précédente
        period: 'month'
      },
      fields_corrected: {
        value: fieldsCorrected,
        source: 'self_healing'
      },
      whatsapp_sent: {
        value: whatsappCount || 0,
        period: 'month'
      },
      workflows_active: {
        value: workflowsActive
      }
    });
  } catch (error) {
    console.error('[Stats] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**Monter dans** `server.js` :
```javascript
const statsRouter = require('./routes/stats');
app.use('/api/stats', statsRouter);
```

##### **B. API Activity Feed** (1 jour)

**Backend** : `max_backend/routes/activity.js`
```javascript
const express = require('express');
const router = express.Router();
const { getSupabaseClient } = require('../lib/supabaseClient');

// GET /api/activity/recent?limit=50
router.get('/recent', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const tenantId = req.headers['x-tenant-id'] || 'macrea';
    const supabase = getSupabaseClient();

    // Récupérer logs récents
    const { data: logs, error } = await supabase
      .from('max_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    // Transformer en format Activity
    const activities = logs.map(log => ({
      id: log.id,
      type: log.action_type,
      icon: getIconForActionType(log.action_type),
      title: formatTitle(log.action_type),
      description: log.metadata?.description || formatDescription(log),
      time: formatTimeAgo(log.created_at),
      timestamp: log.created_at
    }));

    res.json({
      activities,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Activity] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

function getIconForActionType(type) {
  const icons = {
    'csv_analyzed': '📊',
    'self_healing_applied': '🔧',
    'leads_imported': '📥',
    'whatsapp_sent': '📱',
    'workflow_activated': '⚙️',
    'ai_chat_interaction': '💬'
  };
  return icons[type] || '📝';
}

function formatTitle(type) {
  const titles = {
    'csv_analyzed': 'Analyse CSV',
    'self_healing_applied': 'Self-Healing',
    'leads_imported': 'Intégration CRM',
    'whatsapp_sent': 'Campagne WhatsApp',
    'workflow_activated': 'Activation workflow'
  };
  return titles[type] || type;
}

function formatDescription(log) {
  if (log.action_type === 'csv_analyzed') {
    return `${log.metadata?.rows || '?'} lignes analysées`;
  }
  if (log.action_type === 'self_healing_applied') {
    return `${log.metadata?.fields_corrected || '?'} champs corrigés`;
  }
  if (log.action_type === 'leads_imported') {
    return `${log.metadata?.count || '?'} leads`;
  }
  if (log.action_type === 'whatsapp_sent') {
    return `${log.metadata?.count || 1} messages`;
  }
  return log.metadata?.message || '';
}

function formatTimeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins}min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Il y a ${diffDays}j`;
}

module.exports = router;
```

**Monter dans** `server.js` :
```javascript
const activityRouter = require('./routes/activity');
app.use('/api/activity', activityRouter);
```

##### **C. API Analytics (Reports)** (1 jour)

**Backend** : `max_backend/routes/analytics.js`
```javascript
const express = require('express');
const router = express.Router();
const { getSupabaseClient } = require('../lib/supabaseClient');

// GET /api/analytics/overview?period=30d
router.get('/overview', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const tenantId = req.headers['x-tenant-id'] || 'macrea';

    // TODO: Pour l'instant, retourner données mockées
    // À remplacer par vraies stats quand tracking campaigns implémenté

    res.json({
      metrics: {
        open_rate: { value: 68.4, change: 12.3, trend: 'up' },
        ctr: { value: 24.7, change: 8.5, trend: 'up' },
        response_rate: { value: 15.2, change: 3.1, trend: 'up' },
        conversion_rate: { value: 9.8, change: -1.2, trend: 'down' }
      },
      channels: [
        { name: 'Email', sent: 0, opened: 0, clicked: 0, responded: 0, converted: 0 },
        { name: 'WhatsApp', sent: 0, opened: 0, clicked: 0, responded: 0, converted: 0 },
        { name: 'SMS', sent: 0, opened: 0, clicked: 0, responded: 0, converted: 0 },
        { name: 'Appels', sent: 0, opened: 0, clicked: 0, responded: 0, converted: 0 }
      ]
    });
  } catch (error) {
    console.error('[Analytics] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

#### Livrables :
- ✅ API Stats fonctionnelle
- ✅ API Activity Feed fonctionnelle
- ✅ API Analytics (mockée pour l'instant)
- ✅ Frontend connecté aux vraies données

---

### 📅 PHASE 3.5 - Harmonisation UI avec Demoboard (Jours 10-13)

#### Objectifs :
1. Copier l'architecture du Demoboard dans le frontend réel
2. Réutiliser les composants fonctionnels du Demoboard
3. Garantir cohérence visuelle démo ↔ prod

#### Actions :

##### **A. Copier composants Demoboard → Frontend prod**

```bash
# Structure cible
src/
├── components/
│   ├── demoboard/
│   │   ├── DemoBoardLayout.tsx       # Orchestrateur principal
│   │   ├── DemoBoardHeader.tsx       # Header avec token counter
│   │   ├── DemoBoardSidebar.tsx      # Navigation
│   │   ├── DemoBoardStats.tsx        # KPI cards
│   │   ├── DemoBoardChat.tsx         # Interface chat
│   │   ├── DemoAutomationsFeed.tsx   # Feed actions
│   │   ├── DemoBoardCrm.tsx          # Table leads
│   │   ├── DemoBoardAutomations.tsx  # Gestion workflows
│   │   └── DemoBoardReports.tsx      # Analytics
│   └── ui/
│       ├── Button.tsx
│       ├── Badge.tsx
│       └── ... (autres composants UI)
├── hooks/
│   └── useMaxStateMachine.ts         # State machine
└── stores/
    └── useMaxStore.ts                # Zustand store
```

##### **B. Adapter fetch API dans chaque composant**

**Exemple pour `DemoBoardStats.tsx` :**
```typescript
// Avant (données mockées)
const stats = [
  { label: 'Leads importés', value: '247', change: '+18%' },
  // ...
]

// Après (fetch API réelle)
import { useMaxStore } from '@/stores/useMaxStore'

function DemoBoardStats() {
  const stats = useMaxStore(state => state.stats)
  const fetchStats = useMaxStore(state => state.fetchStats)

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <div className="grid grid-cols-4 gap-6">
      <StatCard
        label="Leads importés"
        value={stats.leads_imported?.value || 0}
        change={`+${stats.leads_imported?.change}%`}
      />
      // ...
    </div>
  )
}
```

##### **C. Connecter DemoBoardChat au vrai M.A.X.**

**Remplacer** :
```typescript
// Ancien (réponses mockées)
const getMaxResponse = (userMessage: string) => {
  if (lowerMsg.includes('email')) return '📧 Email programmé...'
  // ...
}
```

**Par** :
```typescript
// Nouveau (vrai LLM via backend)
async function sendMessage(text: string) {
  setIsThinking(true)

  try {
    const response = await fetch('http://127.0.0.1:3005/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        conversationId: sessionId,
        tenantId: 'macrea'
      })
    })

    const data = await response.json()

    setMessages(prev => [...prev, {
      from: 'max',
      text: data.response,
      timestamp: new Date()
    }])

    // Détecter si M.A.X. a déclenché une action
    if (data.action) {
      addAutomation({
        type: data.action.type,
        message: data.action.message,
        timestamp: new Date()
      })
    }
  } catch (error) {
    console.error('Error sending message:', error)
    setMessages(prev => [...prev, {
      from: 'max',
      text: 'Désolé, j\'ai rencontré une erreur. Peux-tu réessayer ?',
      timestamp: new Date()
    }])
  } finally {
    setIsThinking(false)
  }
}
```

##### **D. Connecter DemoBoardCrm aux leads réels**

```typescript
function DemoBoardCrm() {
  const leads = useMaxStore(state => state.leads)
  const fetchLeads = useMaxStore(state => state.fetchLeads)

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Reste du composant identique
  // ...
}
```

#### Livrables :
- ✅ Composants Demoboard copiés et adaptés
- ✅ Chat connecté au vrai M.A.X.
- ✅ CRM affiche les leads réels EspoCRM
- ✅ Stats affichent les vraies métriques
- ✅ Cohérence visuelle démo ↔ prod

---

### 📅 PHASE 3.6 - Polish & Tests (Jours 14-15)

#### Objectifs :
1. Tester tous les onglets
2. Corriger bugs restants
3. Optimiser performances
4. Documentation finale

#### Actions :

##### **A. Tests par onglet**

| Onglet | Tests à effectuer | Critères de succès |
|--------|-------------------|-------------------|
| **Dashboard** | • Affichage KPI<br>• Refresh stats | • Chiffres réels<br>• Pas d'erreur console |
| **Chat M.A.X.** | • Envoyer message<br>• Recevoir réponse<br>• Déclencher action | • Réponse cohérente<br>• Action logguée |
| **CRM** | • Charger leads<br>• Filtrer leads<br>• Voir détails lead | • Leads EspoCRM affichés<br>• Aucun crash |
| **Automatisations** | • Lister workflows<br>• Activer/désactiver | • Liste workflows<br>• Changement état |
| **Rapports** | • Afficher métriques<br>• Sélectionner période | • Données affichées<br>• Période change |

##### **B. Optimisations performances**

- [ ] **Lazy loading images**
  ```typescript
  <img
    src={leadAvatar}
    loading="lazy"
    alt="Lead avatar"
  />
  ```

- [ ] **React.memo sur composants lourds**
  ```typescript
  export default React.memo(DemoBoardCrm)
  ```

- [ ] **Virtualisation liste leads** (si > 100 leads)
  ```bash
  npm install @tanstack/react-virtual
  ```

- [ ] **Code splitting par route**
  ```typescript
  const DemoBoardLayout = lazy(() => import('./components/demoboard/DemoBoardLayout'))
  ```

##### **C. Documentation**

- [ ] Créer `FRONTEND_ARCHITECTURE.md`
  - Map des composants
  - Flow de données (Zustand)
  - APIs utilisées

- [ ] Créer `TROUBLESHOOTING.md`
  - Erreurs communes
  - Solutions

- [ ] Mettre à jour `README.md`
  - Nouvelles instructions setup
  - Variables d'environnement
  - Commandes dev

#### Livrables :
- ✅ Tous les onglets fonctionnels
- ✅ Performances optimisées
- ✅ Documentation complète
- ✅ PHASE 3 terminée ! 🎉

---

## 📋 Checklist globale Phase 3

### Backend
- [ ] API Stats créée (`/api/stats/overview`)
- [ ] API Activity Feed créée (`/api/activity/recent`)
- [ ] API Analytics créée (`/api/analytics/overview`)
- [ ] Routes montées dans `server.js`
- [ ] CORS configuré pour frontend

### Frontend
- [ ] Crash CRM corrigé
- [ ] Leads réels affichés
- [ ] Store Zustand implémenté
- [ ] Props drilling éliminé
- [ ] Composants Demoboard adaptés
- [ ] Chat connecté au vrai M.A.X.
- [ ] Stats connectées à API
- [ ] Activity feed connecté
- [ ] Error boundaries implémentés
- [ ] Loading states partout

### Tests
- [ ] Dashboard fonctionne
- [ ] Chat M.A.X. fonctionne
- [ ] CRM fonctionne (sans crash)
- [ ] Automatisations fonctionne
- [ ] Rapports fonctionne
- [ ] Navigation entre onglets fluide
- [ ] Aucune erreur console

### Documentation
- [ ] `FRONTEND_AUDIT_2025-12-10.md` créé
- [ ] `FRONTEND_ARCHITECTURE.md` créé
- [ ] `TROUBLESHOOTING.md` créé
- [ ] `README.md` mis à jour

---

## 🚨 Risques identifiés & Mitigations

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| **Demoboard incompatible avec frontend réel** | 🔴 Élevé | 🟡 Moyen | Adapter architecture progressivement, tester à chaque étape |
| **Crash CRM non reproductible** | 🟡 Moyen | 🟢 Faible | Ajouter logs détaillés, error boundaries |
| **Performance dégradée** | 🟡 Moyen | 🟡 Moyen | Virtualisation, lazy loading, React.memo |
| **Décalage UX démo ↔ prod** | 🟢 Faible | 🟡 Moyen | Réutiliser composants Demoboard à l'identique |

---

## 💰 Estimation effort

| Phase | Durée | Complexité |
|-------|-------|------------|
| 3.1 - Diagnostic | 1 jour | 🟢 Faible |
| 3.2 - Correction crashes | 2 jours | 🟡 Moyenne |
| 3.3 - State management | 2 jours | 🟡 Moyenne |
| 3.4 - APIs manquantes | 4 jours | 🟡 Moyenne |
| 3.5 - Harmonisation UI | 4 jours | 🔴 Élevée |
| 3.6 - Polish & Tests | 2 jours | 🟢 Faible |

**Total estimé : 15 jours** (3 semaines à temps plein)

---

## 📊 Indicateurs de succès

✅ **Phase 3 réussie si** :
1. Tous les onglets (Dashboard, Chat, CRM, Automatisations, Rapports) fonctionnent sans crash
2. Données réelles affichées (leads EspoCRM, stats, activity feed)
3. Cohérence visuelle démo ↔ production
4. Aucune erreur console en navigation normale
5. Temps de chargement < 2s par onglet

---

## 🎯 Prochaines étapes (Phase 4 - optionnelle)

Après Phase 3, possibilité d'améliorer avec :
- WebSocket pour real-time feed
- Streaming responses pour chat (SSE)
- Charts analytics (Recharts)
- Notifications push
- Mode hors-ligne (PWA)
- Export PDF reports

---

**Prêt à démarrer la Phase 3 ?** 🚀

On commence par la **Phase 3.1 - Diagnostic** pour identifier exactement où se trouve le frontend réel et pourquoi le CRM plante.
