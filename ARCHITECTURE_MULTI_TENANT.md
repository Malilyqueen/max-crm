# 🏗️ Architecture Multi-Tenant MAX

## Vue d'ensemble

```
┌────────────────────────────────────────────────────────────────────┐
│                         CLIENTS FINAUX                             │
│                                                                    │
│  👤 MaCréa Admin    👤 Damath      👤 Coach Vero   👤 Michele Care │
│     (vous)          Overseas                                       │
└──────┬─────────────────┬────────────────┬──────────────────┬───────┘
       │                 │                │                  │
       │ X-Tenant:       │ X-Tenant:      │ X-Tenant:       │ X-Tenant:
       │ macrea-admin    │ damath         │ coach-vero      │ michele-care
       │                 │                │                  │
┌──────▼─────────────────▼────────────────▼──────────────────▼───────┐
│                                                                    │
│                    MAX FRONTEND (Vercel)                          │
│                  https://max.studiomacrea.cloud                   │
│                                                                    │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             │ HTTPS + Auth JWT
                             │
┌────────────────────────────▼───────────────────────────────────────┐
│                                                                    │
│              MAX BACKEND (Scaleway Docker)                        │
│            https://max-api.studiomacrea.cloud                     │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              Tenant Resolver Middleware                  │    │
│  │  - Détecte le tenant depuis X-Tenant header             │    │
│  │  - Charge la config EspoCRM du tenant                   │    │
│  │  - Injecte credentials admin si self-healing requis     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─────────────────┬──────────────┬──────────────┬─────────────┐  │
│  │  Tenant Config  │  Tenant      │  Tenant      │  Tenant     │  │
│  │  macrea-admin   │  damath      │  coach-vero  │  michele    │  │
│  ├─────────────────┼──────────────┼──────────────┼─────────────┤  │
│  │ EspoCRM:        │ EspoCRM:     │ EspoCRM:     │ EspoCRM:    │  │
│  │ crm.studio      │ damath-crm   │ coach-crm    │ michele-crm │  │
│  │ macrea.cloud    │ .example.com │ .example.com │ .example.com│  │
│  ├─────────────────┼──────────────┼──────────────┼─────────────┤  │
│  │ API Key: ✅     │ API Key: ✅  │ API Key: ✅  │ API Key: ✅ │  │
│  │ Admin: ✅       │ Admin: ✅    │ Admin: ✅    │ Admin: ✅   │  │
│  │ Self-Heal: ✅   │ Self-Heal: ✅│ Self-Heal: ✅│ Self-Heal:✅│  │
│  └─────────────────┴──────────────┴──────────────┴─────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
       │                 │                │                  │
       │                 │                │                  │
┌──────▼─────────┐ ┌─────▼──────┐ ┌──────▼──────┐ ┌─────────▼──────┐
│                │ │            │ │             │ │                │
│  EspoCRM       │ │ EspoCRM    │ │ EspoCRM     │ │ EspoCRM        │
│  MaCréa Admin  │ │ Damath     │ │ Coach Vero  │ │ Michele Care   │
│                │ │            │ │             │ │                │
│ crm.studio     │ │ damath-crm │ │ coach-crm   │ │ michele-crm    │
│ macrea.cloud   │ │.example.com│ │.example.com │ │.example.com    │
│                │ │            │ │             │ │                │
│ 🗄️ DB: MariaDB │ │ 🗄️ DB      │ │ 🗄️ DB       │ │ 🗄️ DB          │
│                │ │            │ │             │ │                │
└────────────────┘ └────────────┘ └─────────────┘ └────────────────┘
```

---

## 🔑 Gestion des Credentials par Tenant

### Configuration `.env` (Scaleway)

```bash
# ============================================================
# TENANT: MaCréa Admin (vous)
# ============================================================
ESPO_BASE_URL=http://espocrm:80/api/v1
ESPO_API_KEY=c306b76bd7e981305569b63e8bb4d157
ESPO_USERNAME=admin
ESPO_PASSWORD=Admin2025Secure

# ============================================================
# TENANT: Damath Overseas
# ============================================================
DAMATH_ESPO_BASE_URL=https://damath-crm.example.com/api/v1
DAMATH_ESPO_API_KEY=damath_api_key_here
DAMATH_ESPO_USERNAME=admin
DAMATH_ESPO_PASSWORD=damath_admin_password_here

# ============================================================
# TENANT: Coach Vero
# ============================================================
COACH_VERO_ESPO_BASE_URL=https://coach-vero-crm.example.com/api/v1
COACH_VERO_ESPO_API_KEY=coach_api_key_here
COACH_VERO_ESPO_USERNAME=admin
COACH_VERO_ESPO_PASSWORD=coach_admin_password_here

# ============================================================
# TENANT: Michele Care
# ============================================================
MICHELE_CARE_ESPO_BASE_URL=https://michele-care-crm.example.com/api/v1
MICHELE_CARE_ESPO_API_KEY=michele_api_key_here
MICHELE_CARE_ESPO_USERNAME=admin
MICHELE_CARE_ESPO_PASSWORD=michele_admin_password_here
```

---

## 🚀 Flow de Requête

### Exemple : Client Damath crée un Lead avec champ custom

```
1. Frontend (Client Damath)
   POST https://max.studiomacrea.cloud/api/chat
   Headers: {
     "X-Tenant": "damath",
     "Authorization": "Bearer <jwt_token>"
   }
   Body: {
     "message": "Crée un champ 'secteur_transport' pour les leads"
   }

2. MAX Backend (Tenant Resolver)
   ✅ Détecte tenant: damath
   ✅ Charge config: getTenantEspoConfig('damath')
   ✅ Credentials: {
        baseUrl: "https://damath-crm.example.com/api/v1",
        apiKey: "damath_api_key_here",
        adminUsername: "admin",
        adminPassword: "damath_admin_password_here",
        canSelfHeal: true
      }

3. MAX (Tool: create_custom_field)
   ✅ Utilise espoAdminFetch avec credentials Damath
   ✅ Crée le champ dans EspoCRM Damath
   ✅ Modifie les layouts
   ✅ Fait le rebuild

4. EspoCRM Damath
   ✅ Reçoit requête avec Basic Auth admin:damath_admin_password_here
   ✅ Crée le champ custom
   ✅ Retourne succès

5. MAX Backend
   ✅ Répond au client
   "✅ Champ 'secteur_transport' créé avec succès dans votre CRM"
```

---

## 🔒 Sécurité

### Isolation des Données

- ✅ Chaque tenant a son propre EspoCRM
- ✅ Pas de partage de données entre tenants
- ✅ Credentials stockés séparément par tenant
- ✅ Requêtes API isolées par tenant

### Stockage Credentials

**Actuel (MVP)** :
- Fichier `.env` sur serveur Scaleway
- Permissions Linux : `chmod 600`
- Non commité dans Git

**Recommandé (Production)** :
- Base de données chiffrée (AES-256)
- Ou HashiCorp Vault
- Ou AWS Secrets Manager
- Rotation automatique des credentials

### Audit Trail

Chaque action est loggée avec :
- Tenant ID
- User ID
- Action effectuée
- Timestamp
- Résultat (succès/échec)

---

## 📊 Capacité de Scaling

### Ajouter un Nouveau Client

**Temps requis** : ~10 minutes

1. Collecter infos client (URL EspoCRM, credentials)
2. Générer API key tenant
3. Ajouter config dans `tenants.js`
4. Ajouter variables `.env`
5. Redémarrer backend
6. MAX configure automatiquement le CRM du client

**Limite** : Aucune limite technique. Peut gérer 100+ tenants.

### Performance

- Chaque requête est routée vers le bon EspoCRM
- Pas d'impact sur les autres tenants
- Cache par tenant (Redis si nécessaire)

---

## 🛠️ Self-Healing par Tenant

### Ce que MAX fait automatiquement

**Pour chaque client** :

1. **Création de champs personnalisés**
   - Détecte les besoins du secteur client
   - Crée les champs appropriés
   - Configure les options (Enum, Multi-Enum)

2. **Optimisation des layouts**
   - Layouts detail, list, detailSmall
   - Positionnement optimal des champs
   - Grouping logique par panels

3. **Rebuild automatique**
   - Clear cache après modifications
   - Rebuild EspoCRM
   - Vérification santé

4. **Maintenance préventive**
   - Détection champs inutilisés
   - Nettoyage données dupliquées
   - Optimisation performances

---

## 💰 Business Model

### Pricing par Tenant

**Option 1 : Par Nombre d'Utilisateurs**
- 1-5 utilisateurs : 99€/mois
- 6-20 utilisateurs : 299€/mois
- 21+ utilisateurs : 599€/mois

**Option 2 : Par Volume Leads**
- Jusqu'à 1000 leads/mois : 149€/mois
- 1000-5000 leads/mois : 349€/mois
- 5000+ leads/mois : 699€/mois

**Option 3 : Forfait Tout Inclus**
- Utilisateurs illimités
- Leads illimités
- Self-healing complet
- Support prioritaire
- 999€/mois

---

## 🎯 Avantages pour le Client

✅ **Zéro Configuration**
- Donne ses credentials une fois
- MAX configure tout automatiquement
- Prêt à utiliser en 10 minutes

✅ **Zéro Maintenance**
- Pas besoin de gérer EspoCRM
- MAX crée les champs automatiquement
- Optimisations automatiques

✅ **Focus Business**
- Client se concentre sur ses ventes
- MAX gère le CRM en arrière-plan
- Rapports automatiques

✅ **Évolutivité**
- Ajout de champs sans toucher EspoCRM
- MAX s'adapte au secteur
- Personnalisation automatique

---

## 📈 Évolutions Futures

### Phase 1 (Actuel)
- [x] Multi-tenant avec config par tenant
- [x] Self-healing complet
- [x] Création champs auto
- [x] Layouts optimisés

### Phase 2 (Q1 2026)
- [ ] Dashboard admin tenant management
- [ ] Rotation automatique credentials
- [ ] Health monitoring par tenant
- [ ] Backup automatique par tenant

### Phase 3 (Q2 2026)
- [ ] API provisioning tenant
- [ ] Self-onboarding client (wizard)
- [ ] Billing automatique par tenant
- [ ] Analytics par tenant

### Phase 4 (Q3 2026)
- [ ] Multi-region deployment
- [ ] EspoCRM clustering
- [ ] AI predictions par tenant
- [ ] White-label pour revendeurs

---

## ✅ Résumé

Cette architecture permet de :

🎯 **Gérer plusieurs clients** avec leurs propres EspoCRM de façon isolée
🔐 **Stocker les credentials** de façon sécurisée par tenant
🤖 **Self-healing complet** pour chaque client sans intervention manuelle
📈 **Scaler facilement** en ajoutant de nouveaux tenants
💼 **Business model** flexible (par utilisateur, par volume, forfait)

**Les clients adorent** parce qu'ils n'ont **jamais** à toucher EspoCRM ! 🚀
