# M.A.X. CRM - Assistant IA Multi-Tenant

**M.A.X.** (Macrea Assistant eXpert) est un assistant IA conversationnel multi-tenant intégré à EspoCRM, permettant d'automatiser les tâches CRM, créer des opportunités, tickets, contacts et bien plus via langage naturel.

## 🎯 Fonctionnalités Principales

- **Chat IA conversationnel** avec mémoire de contexte
- **Action Layer** - Exécution d'actions CRM standardisées
- **Multi-tenant** - Support de plusieurs clients/tenants
- **Dashboard temps réel** - Visibilité sur toutes les activités M.A.X.
- **Intégration EspoCRM complète** - Leads, Opportunities, Contacts, Cases, KB Articles
- **Authentification JWT** - Sécurité multi-utilisateur
- **WhatsApp ready** (Twilio) - Support messaging temps réel

## 📁 Structure du Projet

```
d:\Macrea\CRM\
├── max_backend/          # Backend Node.js Express
│   ├── actions/          # Action Layer (CRM actions)
│   ├── routes/           # API Routes
│   ├── middleware/       # Auth, ACL, Headers
│   ├── lib/              # Utilities (espoClient, memory, etc.)
│   ├── services/         # Business logic
│   └── .env.example      # Template de configuration
│
├── max_frontend/         # Frontend React + Vite
│   ├── src/
│   │   ├── pages/        # Pages (Dashboard, Chat, CRM, etc.)
│   │   ├── components/   # Composants React
│   │   ├── stores/       # Zustand stores
│   │   ├── hooks/        # Custom hooks
│   │   └── api/          # API client
│   └── .env.example      # Template de configuration
│
├── clients/              # Instances EspoCRM multi-tenant (non versionné)
└── docs/                 # Documentation technique
```

## 🚀 Quick Start

### 1. Installation Backend

```bash
cd max_backend
npm install
cp .env.example .env
# Éditer .env avec vos credentials
npm start
```

**Backend disponible sur**: `http://localhost:3005`

### 2. Installation Frontend

```bash
cd max_frontend
npm install
cp .env.example .env
# Éditer .env si nécessaire
npm run dev
```

**Frontend disponible sur**: `http://localhost:5173`

### 3. Configuration EspoCRM

1. Installer EspoCRM (XAMPP ou Docker)
2. Créer un utilisateur API dédié "MAX_BOT"
3. Générer une API Key dans Admin > API Users
4. Ajouter la clé dans `max_backend/.env` → `ESPO_API_KEY`

## 🔐 Sécurité

### Variables d'environnement sensibles

**❌ NE JAMAIS committer**:
- `.env` (backend et frontend)
- Fichiers API keys, tokens, credentials
- Données clients dans `/clients/`

**✅ Templates disponibles**:
- `max_backend/.env.example`
- `max_frontend/.env.example`

### Authentification

- **JWT** pour auth utilisateur frontend
- **API Keys** pour communication backend ↔ EspoCRM
- **Multi-tenant** via header `X-Tenant`

## 📊 Architecture

### Backend (Node.js + Express)

```
Client → API Routes → Middleware (Auth + ACL) → Action Layer → EspoCRM API
                                              ↓
                                        ActionLogger
                                              ↓
                                      Dashboard Stats
```

### Action Layer

Toutes les actions CRM passent par un point d'entrée unifié:

```javascript
import { executeAction } from './actions/index.js';

const result = await executeAction('create_opportunity', {
  tenantId: 'macrea',
  name: 'Opportunité Test',
  amount: 25000,
  closeDate: '2025-12-31'
});
```

**Actions disponibles**:
- `create_opportunity` - Créer opportunité
- `create_contact` - Créer contact
- `create_ticket` - Créer ticket support (Case)
- `create_knowledge_article` - Créer article KB
- `write_crm_note` - Ajouter note CRM
- `send_email` - Envoyer email
- `create_calendar_event` - Créer événement
- `update_crm_field` - Mettre à jour lead/contact

### Frontend (React + Vite)

- **Zustand** pour state management
- **Axios** avec intercepteurs JWT
- **TailwindCSS** pour styling
- **React Router** pour navigation

## 🧪 Tests

### Backend

```bash
cd max_backend

# Tester les nouvelles entités CRM
node test-new-entities.js

# Tester le dashboard
node test-dashboard-activities.js

# Test décisif (nécessite JWT token)
.\test-decisif.ps1 "VOTRE_JWT_TOKEN"
```

### API Endpoints

```bash
# Health check
curl http://localhost:3005/api/ping

# Logs d'actions
curl http://localhost:3005/api/action-layer/logs?limit=10

# Stats
curl http://localhost:3005/api/action-layer/stats
```

## 📈 Dashboard & Activités

Le dashboard affiche en temps réel toutes les actions M.A.X.:

**Quick Fix appliqué** (23 déc 2025):
- ✅ Données mockées supprimées
- ✅ Connexion à `actionLogger` pour vraies activités CRM
- ✅ Filtrage par tenant
- ✅ Affichage des 20 dernières actions

**Voir**: [RAPPORT_AUDIT_COCKPIT_ACTIVITES.md](./RAPPORT_AUDIT_COCKPIT_ACTIVITES.md)

## 🔌 Intégrations

### EspoCRM
- **API REST** complète
- Support entités: Lead, Contact, Opportunity, Case, Email, Note, Meeting, KnowledgeBaseArticle
- Permissions par rôle (ACL)
- Duplicate detection

### N8N (Optionnel)
- Workflows d'automatisation
- Webhooks M.A.X. → n8n
- Triggers personnalisés

### WhatsApp (Twilio)
- Support messaging temps réel
- Webhooks Twilio
- Conversations persistées

## 🛠️ Technologies

### Backend
- **Node.js** 18+
- **Express** 4.x
- **Anthropic Claude** (Haiku, Sonnet, Opus)
- **JWT** pour auth
- **Axios** pour requêtes HTTP

### Frontend
- **React** 18+
- **Vite** 5+
- **Zustand** pour state
- **TailwindCSS** pour styling
- **Axios** avec intercepteurs

### CRM
- **EspoCRM** 8.x
- **MySQL/MariaDB**
- **PHP** 8.1+

## 📝 Documentation

- [Rapport Audit Cockpit](./RAPPORT_AUDIT_COCKPIT_ACTIVITES.md) - Analyse complète frontend/backend
- [Quick Fix Validation](./QUICK_FIX_VALIDATION.md) - Guide de test du patch dashboard
- [Patch Résumé](./PATCH_QUICK_FIX_RESUME.md) - Résumé des modifications Quick Fix A
- [Commande Test Décisif](./COMMANDE_TEST_DECISIF.md) - Tests en 10 secondes

## 🚧 Roadmap

### Phase 1 (Terminée) ✅
- Action Layer fonctionnel
- 4 nouvelles entités CRM (Opportunity, Contact, Case, KB)
- Dashboard connecté aux vraies actions
- Auth JWT multi-tenant

### Phase 2 (En cours)
- Persistence Supabase des logs
- Polling automatique dashboard (15s)
- Sécurisation `/api/action-layer/*`
- Stats EspoCRM réelles

### Phase 3 (Q1 2025)
- Supabase Realtime (WebSocket)
- Dashboard avancé avec filtres
- Métriques temps réel
- Notifications push

## 🤝 Contribution

1. Cloner le repo
2. Créer une branche feature: `git checkout -b feature/ma-feature`
3. Committer: `git commit -m "Add: ma feature"`
4. Push: `git push origin feature/ma-feature`
5. Créer une Pull Request

## 📄 Licence

Propriétaire - Macrea © 2025

## 🆘 Support

Pour toute question ou problème:
- Voir la [documentation technique](./docs/)
- Vérifier les [rapports d'audit](./RAPPORT_AUDIT_COCKPIT_ACTIVITES.md)
- Contacter l'équipe Macrea

---

**Développé avec ❤️ par Macrea & Claude Sonnet 4.5**
