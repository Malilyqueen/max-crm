# Guide - Préparation Git & Premier Commit

## ✅ Préparation Complète

Tous les fichiers de configuration Git sont en place et le projet est prêt à être versionné.

---

## 📁 Fichiers de Configuration Créés

### 1. `.gitignore` (Racine)
**Emplacement**: `d:\Macrea\CRM\.gitignore`

**Protection**:
- ✅ Fichiers `.env` et credentials
- ✅ `node_modules/`
- ✅ Dossier `/clients/` (instances EspoCRM)
- ✅ Logs et conversations
- ✅ Fichiers build et dist
- ✅ Fichiers IDE et OS

### 2. `.env.example` - Backend
**Emplacement**: `d:\Macrea\CRM\max_backend\.env.example`

**Contient**: Templates pour toutes les variables d'environnement nécessaires
- Anthropic API Key
- EspoCRM credentials
- JWT Secret
- Twilio/WhatsApp config
- SMTP config
- Supabase (optionnel)

### 3. `.env.example` - Frontend
**Emplacement**: `d:\Macrea\CRM\max_frontend\.env.example`

**Contient**: Configuration frontend minimale
- VITE_API_BASE
- VITE_ESPO_BASE
- VITE_DEFAULT_TENANT

### 4. `README.md`
**Emplacement**: `d:\Macrea\CRM\README.md`

Documentation complète du projet avec quick start, architecture, et roadmap.

---

## 🔒 Vérification Sécurité

### Fichiers EXCLUS du versioning (`.gitignore`)

```
✅ .env
✅ .env.*
✅ credentials.json
✅ secrets.json
✅ *.key, *.pem, *.pfx
✅ node_modules/
✅ clients/
✅ conversations/
✅ logs/
✅ *.log
✅ temp_*.json
```

### Fichiers INCLUS dans le repo

```
✅ .env.example (backend et frontend)
✅ README.md
✅ package.json
✅ Code source (max_backend, max_frontend)
✅ Documentation (.md)
✅ Tests
✅ Configuration (.gitignore, tsconfig, etc.)
```

---

## 🚀 Initialiser Git & Premier Commit

### Étape 1: Initialiser le Repository

```bash
cd d:\Macrea\CRM
git init
```

### Étape 2: Vérifier que .env est bien ignoré

```bash
git status
```

**Résultat attendu**: `.env` ne doit PAS apparaître dans la liste des fichiers à committer.

Si `.env` apparaît, vérifier `.gitignore` et lancer:
```bash
git rm --cached max_backend/.env
git rm --cached max_frontend/.env
```

### Étape 3: Ajouter tous les fichiers

```bash
git add .
```

### Étape 4: Vérifier les fichiers ajoutés

```bash
git status
```

**Vérifier que sont inclus**:
- ✅ `README.md`
- ✅ `.gitignore`
- ✅ `max_backend/.env.example`
- ✅ `max_frontend/.env.example`
- ✅ Code source (`max_backend/`, `max_frontend/`)
- ✅ Documentation (`.md` files)

**Vérifier qu'ils sont EXCLUS**:
- ❌ `.env` (backend et frontend)
- ❌ `node_modules/`
- ❌ `/clients/`
- ❌ `/logs/`
- ❌ Credentials files

### Étape 5: Premier Commit

```bash
git commit -m "Initial commit: M.A.X. CRM - Backend + Frontend + Quick Fix Dashboard

Features:
- Backend Node.js + Express avec Action Layer
- Frontend React + Vite avec Dashboard
- Auth JWT multi-tenant
- 4 nouvelles entités CRM (Opportunity, Contact, Case, KB)
- Dashboard temps réel connecté à actionLogger
- Quick Fix A appliqué (23 déc 2025)
- Templates .env.example pour configuration
- Documentation complète

Tech Stack:
- Backend: Node.js, Express, Anthropic Claude
- Frontend: React 18, Vite 5, Zustand, TailwindCSS
- CRM: EspoCRM 8.x avec API REST

Security:
- .gitignore complet
- Aucun secret committé
- Templates .env.example fournis
"
```

---

## 🌐 Pousser sur GitHub (Optionnel)

### Créer un repo GitHub

1. Aller sur https://github.com/new
2. Nom du repo: `max-crm` (ou autre)
3. **Privé** (recommandé pour code propriétaire)
4. Ne PAS initialiser avec README (déjà créé localement)

### Connecter et push

```bash
# Ajouter remote
git remote add origin https://github.com/VOTRE_USERNAME/max-crm.git

# Renommer branche en main
git branch -M main

# Push initial
git push -u origin main
```

---

## 🔍 Checklist Avant Push

Avant de push sur un repo distant, vérifier:

- [ ] Aucun fichier `.env` dans le repo
- [ ] Pas de secrets/credentials dans le code
- [ ] `.env.example` fournis avec placeholders
- [ ] `node_modules/` exclu
- [ ] `/clients/` exclu (données privées)
- [ ] README.md à jour
- [ ] .gitignore complet

**Commande de vérification**:
```bash
git log --oneline -1
git show HEAD --name-only | grep -E "\\.env$|credentials|secrets"
```

Si aucune ligne n'est retournée = ✅ OK

---

## 📦 Commandes Git Utiles

### Vérifier statut
```bash
git status
```

### Voir fichiers ignorés
```bash
git status --ignored
```

### Voir l'historique
```bash
git log --oneline
```

### Voir les fichiers d'un commit
```bash
git show --name-only
```

### Annuler dernier commit (AVANT push)
```bash
git reset --soft HEAD~1
```

---

## ⚠️ ATTENTION - Secrets Déjà Committés

Si vous avez déjà committé des secrets par erreur:

### Option 1: Reset local (SI PAS ENCORE POUSSÉ)
```bash
git reset --hard HEAD~1
```

### Option 2: Supprimer fichier de l'historique (DANGEREUX)
```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch max_backend/.env" \
  --prune-empty --tag-name-filter cat -- --all
```

### Option 3: Utiliser BFG Repo-Cleaner
```bash
# Installer BFG
# https://rtyley.github.io/bfg-repo-cleaner/

bfg --delete-files .env
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**⚠️ Dans tous les cas**:
1. Révoquer IMMÉDIATEMENT les credentials exposés
2. Générer de nouvelles clés/tokens
3. Mettre à jour `.env` avec nouveaux secrets

---

## 🎯 Prochaines Étapes

Après le premier commit:

1. **Tester le clone**:
   ```bash
   cd ..
   git clone d:\Macrea\CRM test-clone
   cd test-clone
   cp max_backend/.env.example max_backend/.env
   cp max_frontend/.env.example max_frontend/.env
   # Éditer les .env
   cd max_backend && npm install && npm start
   ```

2. **Créer branches de développement**:
   ```bash
   git checkout -b develop
   git checkout -b feature/whatsapp-integration
   ```

3. **Configurer .gitattributes** (optionnel):
   ```bash
   echo "*.md linguist-detectable" > .gitattributes
   echo "*.js linguist-language=JavaScript" >> .gitattributes
   ```

---

## 📊 Structure Git Recommandée

### Workflow Git

```
main (production)
├── develop (intégration)
│   ├── feature/nouvelle-action-crm
│   ├── feature/whatsapp-bundle
│   ├── feature/dashboard-filters
│   └── fix/bug-permission-tenant
│
└── hotfix/critical-security-fix
```

### Commits Conventionnels

```bash
# Nouvelles features
git commit -m "feat: Ajouter action create_meeting"

# Corrections
git commit -m "fix: Corriger filtrage tenant dashboard"

# Documentation
git commit -m "docs: Mettre à jour README avec WhatsApp setup"

# Refactoring
git commit -m "refactor: Simplifier actionLogger interface"

# Tests
git commit -m "test: Ajouter tests unitaires action layer"

# Chores
git commit -m "chore: Mettre à jour dépendances npm"
```

---

## ✅ Résumé

**Statut actuel**: ✅ PRÊT POUR GIT

- ✅ `.gitignore` complet et testé
- ✅ `.env.example` templates créés
- ✅ README.md documentation complète
- ✅ Aucun secret dans le code
- ✅ Structure claire et documentée

**Commande unique pour init + commit**:
```bash
cd d:\Macrea\CRM
git init
git add .
git commit -m "Initial commit: M.A.X. CRM - Full Stack Application"
```

**Durée**: < 2 minutes

---

**Guide créé le**: 23 décembre 2025
**Projet**: M.A.X. CRM - Macrea
**Par**: Claude Sonnet 4.5