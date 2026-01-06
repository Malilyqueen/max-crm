# 🚀 Processus d'Onboarding Client pour MAX

## Vue d'ensemble

Quand un nouveau client souscrit à MAX, il doit fournir **une seule fois** ses credentials EspoCRM admin pour que MAX puisse :
- ✅ Créer automatiquement les champs personnalisés dont il a besoin
- ✅ Configurer les layouts optimaux
- ✅ Faire du self-healing (rebuild, ajustements automatiques)
- ✅ Gérer son CRM de façon autonome

**Le client n'a jamais besoin de toucher à EspoCRM directement.**

---

## 📋 Checklist Onboarding Nouveau Client

### Étape 1 : Informations Client

Collecter auprès du client :
- [ ] Nom du tenant (ex: `damath`, `coach-vero`)
- [ ] Nom commercial (ex: "Damath Overseas", "Coach Vero")
- [ ] Extensions nécessaires (logistique, ecommerce, coach, b2b, etc.)
- [ ] URL EspoCRM (ex: `https://damath-crm.example.com`)
- [ ] Username admin EspoCRM (généralement `admin`)
- [ ] Password admin EspoCRM (stocké de façon sécurisée)

### Étape 2 : Générer API Key Tenant

```bash
# Générer une API key unique pour le tenant
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Exemple : `damath_5f8e2a1b9c4d3e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f`

### Étape 3 : Ajouter Configuration dans `.env`

Ajouter les variables d'environnement pour le nouveau tenant :

```bash
# Configuration EspoCRM pour Damath
DAMATH_ESPO_BASE_URL=https://damath-crm.example.com/api/v1
DAMATH_ESPO_API_KEY=<api_key_generee_dans_espocrm>
DAMATH_ESPO_USERNAME=admin
DAMATH_ESPO_PASSWORD=<mot_de_passe_fourni_par_client>
```

### Étape 4 : Créer Utilisateur API dans EspoCRM Client

Se connecter à l'EspoCRM du client et créer :

**Nouvel utilisateur API** :
- Type : **API User**
- Username : `max_api`
- Role : **admin_builder** (ou créer un rôle custom avec permissions)

Permissions requises :
- ✅ Read/Write sur toutes les entités (Leads, Contacts, Opportunities, etc.)
- ✅ Field Manager (création/modification champs)
- ✅ Layout Manager (modification layouts)
- ✅ Administration (rebuild, clear cache)

**Générer l'API Key** et la copier dans `DAMATH_ESPO_API_KEY`.

### Étape 5 : Vérifier Configuration

Tester que les credentials fonctionnent :

```bash
# Test API Key
curl -H "X-Api-Key: <DAMATH_ESPO_API_KEY>" \
  https://damath-crm.example.com/api/v1/Lead?maxSize=1

# Test Basic Auth Admin
curl -u "admin:<DAMATH_ESPO_PASSWORD>" \
  https://damath-crm.example.com/api/v1/App/user
```

### Étape 6 : Redémarrer Backend

```bash
cd /opt/max-infrastructure
docker compose up -d max-backend
```

### Étape 7 : Initialisation Automatique

MAX va automatiquement :
1. Créer les champs personnalisés standards pour le secteur du client
2. Configurer les layouts optimaux
3. Importer les données initiales si fournies
4. Configurer les workflows de base

### Étape 8 : Test Frontend

1. Se connecter au frontend MAX avec le tenant du client
2. Vérifier que MAX peut :
   - Lire les leads
   - Créer des leads
   - Enrichir les données
   - Modifier les champs custom

---

## 🔒 Sécurité des Credentials

### Stockage actuel (MVP)

Les credentials sont stockés dans `.env` :
- ✅ Fichier non commité dans Git (`.gitignore`)
- ✅ Accessible uniquement sur le serveur
- ✅ Permissions Linux restrictives (`chmod 600`)

### Évolution recommandée (Production)

Pour la production, migrer vers :

**Option A : Chiffrement dans Base de Données**
```javascript
// Stocker dans PostgreSQL/MySQL avec AES-256
const encryptedPassword = encrypt(clientPassword, MASTER_KEY);
```

**Option B : Vault Externe**
```javascript
// HashiCorp Vault, AWS Secrets Manager, Azure Key Vault
const config = await vault.getSecret(`tenant/${tenantId}/espo`);
```

**Option C : Variables d'environnement par conteneur**
```yaml
# docker-compose.yml
services:
  max-backend-damath:
    environment:
      - ESPO_BASE_URL=${DAMATH_ESPO_BASE_URL}
      - ESPO_PASSWORD=${DAMATH_ESPO_PASSWORD}
```

---

## 📊 Dashboard Admin : Gestion Tenants

**Futures fonctionnalités** :

```
┌─────────────────────────────────────────────────────┐
│ MAX Admin Dashboard                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📋 Tenants Actifs (4)                              │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ ✅ MaCréa Admin                             │   │
│ │    EspoCRM: crm.studiomacrea.cloud          │   │
│ │    Status: Healthy                          │   │
│ │    Leads: 37                                │   │
│ │    Self-Heal: Enabled                       │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ ✅ Damath Overseas                          │   │
│ │    EspoCRM: damath-crm.example.com          │   │
│ │    Status: Healthy                          │   │
│ │    Leads: 142                               │   │
│ │    Self-Heal: Enabled                       │   │
│ │    [Rotate Credentials] [View Logs]         │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ [+ Add New Tenant]                                 │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ Troubleshooting

### Erreur : 401 Unauthorized

**Cause** : Credentials admin incorrects

**Solution** :
1. Vérifier le mot de passe admin dans EspoCRM
2. Tester avec `curl -u "admin:password" <espo_url>/api/v1/App/user`
3. Mettre à jour `.env` si nécessaire
4. Redémarrer backend

### Erreur : Cannot create custom field

**Cause** : Permissions insuffisantes pour l'utilisateur API

**Solution** :
1. Vérifier le rôle de l'utilisateur API dans EspoCRM
2. S'assurer qu'il a les permissions Field Manager + Layout Manager
3. Recréer l'utilisateur avec le rôle `admin_builder` si nécessaire

### Erreur : Tenant not found

**Cause** : Tenant pas configuré dans `tenants.js`

**Solution** :
1. Ajouter la config du tenant dans `max_backend/core/tenants.js`
2. Ajouter les variables `.env`
3. Redémarrer backend

---

## 📝 Template Email Client

**Sujet** : Configuration de votre compte MAX - Informations requises

```
Bonjour [Nom Client],

Bienvenue chez MAX ! Pour finaliser la configuration de votre assistant IA,
nous avons besoin des informations suivantes concernant votre EspoCRM :

1. URL de votre EspoCRM : https://votre-crm.example.com
2. Username administrateur : admin
3. Mot de passe administrateur : [à fournir de façon sécurisée]

Ces informations sont nécessaires pour que MAX puisse :
✅ Configurer automatiquement les champs personnalisés
✅ Optimiser les layouts pour votre secteur
✅ Gérer votre CRM de façon autonome
✅ Effectuer les maintenances automatiques

🔒 Sécurité :
- Vos credentials sont stockés de façon chiffrée
- Accessible uniquement par MAX pour les opérations CRM
- Vous pouvez les révoquer à tout moment

Une fois configuré, vous n'aurez plus jamais besoin de toucher à EspoCRM
directement. MAX s'occupe de tout !

Cordialement,
L'équipe MaCréa
```

---

## ✅ Résumé

**Ce système permet** :
- ✅ Onboarding client en quelques minutes
- ✅ Configuration automatique EspoCRM
- ✅ Self-healing complet pour chaque client
- ✅ Isolation des données par tenant
- ✅ Scaling facile (ajouter des tenants = ajouter des variables .env)

**Le client n'a jamais à** :
- ❌ Créer des champs manuellement
- ❌ Configurer des layouts
- ❌ Faire des rebuilds
- ❌ Gérer EspoCRM directement

**MAX fait tout automatiquement !** 🤖
