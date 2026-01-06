# 🚨 PHASE 1: URGENCE SÉCURITÉ - Plan d'Exécution (24H)

**OBJECTIF**: Retirer TOUS les secrets du code source
**PRIORITÉ**: 🔴 CRITIQUE
**DEADLINE**: 24 heures

---

## CHECKLIST GLOBALE

- [ ] 1. Créer `.env.example` avec placeholders
- [ ] 2. Migrer secrets vers `.env` (8 fichiers)
- [ ] 3. Forcer `.env` obligatoire au démarrage
- [ ] 4. Rotate clés compromises
- [ ] 5. Vérifier aucun secret dans Git
- [ ] 6. Déployer sur serveur production
- [ ] 7. Tests de validation

**TEMPS ESTIMÉ**: 4-6 heures

---

## 1. CRÉER .env.example

**Fichier**: `d:\Macrea\CRM\max_backend\.env.example`

```bash
# ============================================================
# EspoCRM Configuration
# ============================================================

# URL de base EspoCRM API (REQUIS)
# Dev:        http://localhost:8081/api/v1
# Docker:     http://espocrm:80/api/v1
# Production: https://crm.studiomacrea.cloud/api/v1
ESPO_BASE_URL=

# API Key pour opérations CRM normales (REQUIS)
# Générer dans EspoCRM: Administration > API Users > [User] > Generate API Key
ESPO_API_KEY=

# Credentials admin pour opérations /Admin/* (REQUIS)
# Utilisé pour création champs, layouts, rebuild
ESPO_USERNAME=
ESPO_PASSWORD=

# API Key admin (OPTIONNEL - futur service account)
ESPO_ADMIN_API_KEY=

# Racine EspoCRM pour scripts locaux (OPTIONNEL)
# Windows: D:\Macrea\xampp\htdocs\espocrm
# Docker:  /var/www/html/espocrm
ESPOCRM_ROOT=

# ============================================================
# Supabase Configuration
# ============================================================

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# ============================================================
# JWT Configuration
# ============================================================

# Secret pour signature JWT (REQUIS - min 32 caractères)
# Générer: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=

# ============================================================
# Backend Configuration
# ============================================================

NODE_ENV=development
PORT=3005

# CORS Origins (séparés par virgules)
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175

# ============================================================
# Green-API WhatsApp (OPTIONNEL)
# ============================================================

GREENAPI_INSTANCE_ID=
GREENAPI_API_TOKEN=

# ============================================================
# N8N Configuration (OPTIONNEL)
# ============================================================

N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=

# ============================================================
# Anthropic API
# ============================================================

ANTHROPIC_API_KEY=
```

**Action**:
```bash
cp max_backend/.env.example max_backend/.env
# Puis renseigner les valeurs réelles dans .env
```

---

## 2. MIGRER SECRETS VERS .env

### 2.1 ia_admin_api/routes/tags.js

**AVANT** (ligne 21-24):
```javascript
const headers = {
  'X-Api-Key': "c33b6ca549ff94016190bf53cfb0964c",
  'Content-Type': 'application/json'
};
```

**APRÈS**:
```javascript
const ESPO_API_KEY = process.env.ESPO_API_KEY;
if (!ESPO_API_KEY) {
  throw new Error('ESPO_API_KEY manquant dans .env');
}

const headers = {
  'X-Api-Key': ESPO_API_KEY,
  'Content-Type': 'application/json'
};
```

**Fichier à modifier**: `max_backend/ia_admin_api/routes/tags.js`

---

### 2.2 ia_admin_api/routes/lead.js

**AVANT** (ligne 10-13):
```javascript
const headers = {
  'X-Api-Key': "c33b6ca549ff94016190bf53cfb0964c",
  'Content-Type': 'application/json'
};
```

**APRÈS**:
```javascript
const ESPO_API_KEY = process.env.ESPO_API_KEY;
if (!ESPO_API_KEY) {
  throw new Error('ESPO_API_KEY manquant dans .env');
}

const headers = {
  'X-Api-Key': ESPO_API_KEY,
  'Content-Type': 'application/json'
};
```

**Fichier à modifier**: `max_backend/ia_admin_api/routes/lead.js`

---

### 2.3 routes/tags.js

**Même correctif que 2.1**

**Fichier à modifier**: `max_backend/routes/tags.js`

---

### 2.4 routes/lead.js

**Même correctif que 2.2**

**Fichier à modifier**: `max_backend/routes/lead.js`

---

### 2.5 routes/auth.js - SUPPRIMER COMMENTAIRES PASSWORDS

**AVANT** (ligne 18, 26):
```javascript
{
  username: 'admin',
  password: '$2b$10$uqTA.../ESiW...', // admin123  <-- SUPPRIMER CE COMMENTAIRE
  role: 'admin'
},
{
  username: 'user',
  password: '$2b$10$9lkb.../KuQ...', // user123  <-- SUPPRIMER CE COMMENTAIRE
  role: 'user'
}
```

**APRÈS**:
```javascript
{
  username: 'admin',
  password: process.env.ADMIN_PASSWORD_HASH,
  role: 'admin'
},
{
  username: 'user',
  password: process.env.USER_PASSWORD_HASH,
  role: 'user'
}
```

**Ajouter dans .env**:
```bash
# Hashes bcrypt des passwords
ADMIN_PASSWORD_HASH=$2b$10$uqTA.../ESiW...
USER_PASSWORD_HASH=$2b$10$9lkb.../KuQ...
```

**Fichier à modifier**: `max_backend/routes/auth.js`

---

### 2.6 middleware/authMiddleware.js - JWT SECRET

**AVANT** (ligne 8):
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production-MACREA2025';
```

**APRÈS**:
```javascript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET manquant dans .env');
  console.error('Générer avec: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}
```

**Fichier à modifier**: `max_backend/middleware/authMiddleware.js`

---

### 2.7 routes/auth.js - JWT SECRET (duplication)

**AVANT** (ligne 33):
```javascript
const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production-MACREA2025';
```

**APRÈS**:
```javascript
const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('JWT_SECRET manquant dans .env');
}
```

**Fichier à modifier**: `max_backend/routes/auth.js`

---

### 2.8 lib/tokenRecharge.js - PASSWORD PAR DÉFAUT

**AVANT** (ligne 22):
```javascript
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'default-password-change-me';
```

**APRÈS**:
```javascript
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD manquant dans .env');
}
```

**Fichier à modifier**: `max_backend/lib/tokenRecharge.js`

---

## 3. FORCER .env OBLIGATOIRE AU DÉMARRAGE

**Fichier**: `max_backend/server.js`

**Ajouter en haut du fichier** (après les imports, avant app.use):

```javascript
// ============================================================
// VALIDATION .ENV OBLIGATOIRE
// ============================================================

const REQUIRED_ENV = [
  'ESPO_BASE_URL',
  'ESPO_API_KEY',
  'ESPO_USERNAME',
  'ESPO_PASSWORD',
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY'
];

const missing = REQUIRED_ENV.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('\n❌ ERREUR: Variables .env manquantes:\n');
  missing.forEach(key => console.error(`   - ${key}`));
  console.error('\n📋 Action requise:');
  console.error('   1. Copier .env.example vers .env');
  console.error('   2. Renseigner les valeurs manquantes');
  console.error('   3. Redémarrer le backend\n');
  process.exit(1);
}

console.log('✅ Variables .env validées');
```

**Position**: Ligne ~50 (après imports, avant CORS config)

---

## 4. ROTATE CLÉS COMPROMISES

### 4.1 Générer nouveau JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Copier la sortie dans .env**:
```bash
JWT_SECRET=a8f3d2c9e1b4f7a6d3c2e9f1b8a4d7c3e2f9a1b6d4c8e3f2a9b7d1c6e4f3a2b9
```

### 4.2 Générer nouvelle API Key EspoCRM

**Méthode 1 - Via UI EspoCRM**:
1. Aller sur https://crm.studiomacrea.cloud
2. Administration > API Users
3. Ouvrir l'utilisateur `max_service_admin`
4. Cliquer "Generate API Key"
5. Copier la nouvelle clé

**Méthode 2 - Via API**:
```bash
curl -u "admin:Admin2025Secure" \
  "https://crm.studiomacrea.cloud/api/v1/User/694e7fad1454cd15f" \
  -X PUT \
  -H "Content-Type: application/json" \
  -d '{"authMethod":"ApiKey"}'

# Récupérer la nouvelle clé
curl -u "admin:Admin2025Secure" \
  "https://crm.studiomacrea.cloud/api/v1/User/694e7fad1454cd15f" | grep apiKey
```

**Mettre à jour .env**:
```bash
ESPO_API_KEY=nouvelle_cle_api_ici
```

### 4.3 Changer Admin Password (OPTIONNEL mais recommandé)

```bash
# Générer nouveau hash bcrypt
node -e "console.log(require('bcrypt').hashSync('NouveauMotDePasseSecurise2025', 10))"
```

**Mettre à jour .env**:
```bash
ADMIN_PASSWORD=NouveauMotDePasseSecurise2025
ADMIN_PASSWORD_HASH=$2b$10$nouveau_hash_ici
```

---

## 5. VÉRIFIER AUCUN SECRET DANS GIT

```bash
cd d:\Macrea\CRM

# Vérifier qu'aucun secret n'est committé
git grep -E 'c33b6ca549ff94016190bf53cfb0964c|7b8a983aab7071bb64f18a75cf27ebbc|dev-secret-change'

# Vérifier .gitignore
cat max_backend/.gitignore | grep .env

# Si .env n'est pas ignoré, l'ajouter
echo ".env" >> max_backend/.gitignore
echo ".env.local" >> max_backend/.gitignore
echo ".env.production" >> max_backend/.gitignore
```

**Si secrets trouvés dans Git history**:

```bash
# ATTENTION: Réécrire l'historique Git (destructif)
# Sauvegarder avant: git branch backup-avant-purge

# Supprimer .env de tout l'historique
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch max_backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (si repo distant)
git push origin --force --all
```

**Alternative moins destructive**: Rotate toutes les clés (déjà fait à l'étape 4)

---

## 6. DÉPLOYER SUR SERVEUR PRODUCTION

### 6.1 Préparer .env production

**Sur le serveur**:
```bash
ssh root@51.159.170.20

cd /opt/max-infrastructure

# Créer .env production
cat > max-backend/.env << 'EOF'
# EspoCRM
ESPO_BASE_URL=http://espocrm:80/api/v1
ESPO_API_KEY=nouvelle_cle_api_production
ESPO_USERNAME=admin
ESPO_PASSWORD=Admin2025Secure
ESPO_ADMIN_API_KEY=5a8925ac383fc14cf34e9ee0a81d989d

# Supabase
SUPABASE_URL=https://gxwrxlpxzmnzlqzplghv.supabase.co
SUPABASE_ANON_KEY=votre_anon_key_ici
SUPABASE_SERVICE_KEY=votre_service_key_ici

# JWT
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Backend
NODE_ENV=production
PORT=3005
CORS_ORIGINS=https://max.studiomacrea.cloud,https://crm.studiomacrea.cloud

# Anthropic
ANTHROPIC_API_KEY=votre_cle_anthropic_ici
EOF

chmod 600 max-backend/.env
```

### 6.2 Déployer les fichiers modifiés

**Depuis Windows**:
```bash
# Copier les fichiers modifiés
scp "d:\Macrea\CRM\max_backend\ia_admin_api\routes\tags.js" root@51.159.170.20:/opt/max-infrastructure/max-backend/ia_admin_api/routes/
scp "d:\Macrea\CRM\max_backend\ia_admin_api\routes\lead.js" root@51.159.170.20:/opt/max-infrastructure/max-backend/ia_admin_api/routes/
scp "d:\Macrea\CRM\max_backend\routes\tags.js" root@51.159.170.20:/opt/max-infrastructure/max-backend/routes/
scp "d:\Macrea\CRM\max_backend\routes\lead.js" root@51.159.170.20:/opt/max-infrastructure/max-backend/routes/
scp "d:\Macrea\CRM\max_backend\routes\auth.js" root@51.159.170.20:/opt/max-infrastructure/max-backend/routes/
scp "d:\Macrea\CRM\max_backend\middleware\authMiddleware.js" root@51.159.170.20:/opt/max-infrastructure/max-backend/middleware/
scp "d:\Macrea\CRM\max_backend\lib\tokenRecharge.js" root@51.159.170.20:/opt/max-infrastructure/max-backend/lib/
scp "d:\Macrea\CRM\max_backend\server.js" root@51.159.170.20:/opt/max-infrastructure/max-backend/
```

**Alternative: Rebuild image Docker** (plus propre):
```bash
ssh root@51.159.170.20
cd /opt/max-infrastructure

# Copier le code modifié dans max-backend/
# Rebuild image
docker compose build max-backend

# Redémarrer
docker compose up -d max-backend
```

---

## 7. TESTS DE VALIDATION

### 7.1 Test local (dev)

```bash
cd d:\Macrea\CRM\max_backend

# Vérifier que sans .env, ça fail
mv .env .env.backup
npm start
# ATTENDU: "❌ Variables .env manquantes: ..."

# Remettre .env
mv .env.backup .env
npm start
# ATTENDU: "✅ Variables .env validées"
```

### 7.2 Test production

```bash
# Health check
curl https://max-api.studiomacrea.cloud/api/health

# Test chat (avec nouvelle API key)
curl -X POST https://max-api.studiomacrea.cloud/api/chat \
  -H "X-Tenant: macrea-admin" \
  -H "Content-Type: application/json" \
  -d '{"message":"Test après rotation des clés"}'

# Vérifier logs backend
ssh root@51.159.170.20 "cd /opt/max-infrastructure && docker compose logs max-backend --tail 50"
```

### 7.3 Vérification secrets dans Git

```bash
cd d:\Macrea\CRM

# Aucune de ces commandes ne doit retourner de résultat
git grep -i 'c33b6ca549ff94016190bf53cfb0964c'
git grep -i '7b8a983aab7071bb64f18a75cf27ebbc'
git grep -i 'dev-secret-change-in-production'
git grep -i 'admin123'
git grep -i 'user123'

# Vérifier .gitignore
cat max_backend/.gitignore | grep -E '\.env$|\.env\.local'
```

---

## CHECKLIST FINALE

### Code
- [ ] ✅ `ia_admin_api/routes/tags.js` modifié
- [ ] ✅ `ia_admin_api/routes/lead.js` modifié
- [ ] ✅ `routes/tags.js` modifié
- [ ] ✅ `routes/lead.js` modifié
- [ ] ✅ `routes/auth.js` - commentaires passwords supprimés
- [ ] ✅ `middleware/authMiddleware.js` - JWT secret forcé
- [ ] ✅ `lib/tokenRecharge.js` - password forcé
- [ ] ✅ `server.js` - validation .env au démarrage

### Configuration
- [ ] ✅ `.env.example` créé et committé
- [ ] ✅ `.env` local avec valeurs réelles (non committé)
- [ ] ✅ `.env` production sur serveur
- [ ] ✅ `.gitignore` contient `.env`

### Sécurité
- [ ] ✅ Nouveau JWT secret généré
- [ ] ✅ Nouvelle API key EspoCRM générée
- [ ] ✅ Admin password changé (optionnel)
- [ ] ✅ Aucun secret dans `git grep`
- [ ] ✅ Anciennes clés révoquées

### Déploiement
- [ ] ✅ Code déployé sur serveur
- [ ] ✅ Backend redémarré
- [ ] ✅ Tests passent (health, chat)
- [ ] ✅ Logs backend OK

---

## ROLLBACK SI PROBLÈME

**Si le backend ne démarre pas**:

```bash
ssh root@51.159.170.20
cd /opt/max-infrastructure

# Restaurer version précédente
git checkout HEAD~1 max-backend/

# Redémarrer
docker compose restart max-backend
```

**Si les API keys ne marchent pas**:

```bash
# Vérifier variables dans container
docker compose exec max-backend printenv | grep ESPO

# Vérifier .env chargé
docker compose exec max-backend cat /app/.env
```

---

## TIMELINE

| Heure | Action | Durée |
|-------|--------|-------|
| H+0 | Créer .env.example | 15min |
| H+0.25 | Modifier 8 fichiers | 1h |
| H+1.25 | Forcer .env au démarrage | 15min |
| H+1.5 | Rotate clés compromises | 30min |
| H+2 | Tests locaux | 30min |
| H+2.5 | Déploiement production | 45min |
| H+3.25 | Tests production | 30min |
| H+4 | Vérification Git + documentation | 30min |

**TOTAL**: 4h30

---

**Prochaine étape**: Commencer maintenant avec la création de `.env.example`
