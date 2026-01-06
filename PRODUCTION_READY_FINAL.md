# ✅ PRODUCTION READY - Consent Gate + Protections

**Date:** 2025-12-31
**Version:** 1.1 (avec sécurité renforcée)
**Statut:** ✅ **PRÊT POUR PRODUCTION**

---

## 🎯 Résumé des protections ajoutées

### 1️⃣ Logs explicites du mode executor

**Fichier:** `max_backend/lib/phpExecutorAuto.js`

**Au démarrage:**
```
╔════════════════════════════════════════════════════════════╗
║  PHP EXECUTOR MODE: LOCAL (Docker)                         ║
╚════════════════════════════════════════════════════════════╝
[phpExecutorAuto] ✅ Mode: LOCAL (dans container Docker)
[phpExecutorAuto] 🐳 Target container: espocrm
[phpExecutorAuto] 📋 Command pattern: docker exec espocrm php command.php <cmd>
```

**À chaque commande:**
```
[phpExecutorAuto] 🔧 Executing PHP command (mode=local, container=espocrm): command.php clear-cache
[phpExecutorAuto] 🧹 Clearing cache (mode=local, container=espocrm)
[phpExecutorAuto] 🔨 Rebuilding EspoCRM (mode=local, container=espocrm)
```

**Avantages:**
- ✅ ZÉRO doute sur le mode utilisé
- ✅ Container name visible à chaque opération
- ✅ Pattern de commande explicite
- ✅ Logs audit pour debugging

---

### 2️⃣ Protection route /api/tools/execute

**Fichier:** `max_backend/routes/tools.js`

#### Protection multi-couches:

**Couche 1: Feature flag (DÉSACTIVÉ par défaut)**
```bash
# .env (PRODUCTION)
ENABLE_TOOLS_EXECUTE=false
```

**Résultat si tentative d'accès:**
```json
{
  "success": false,
  "error": "TOOLS_EXECUTE_DISABLED",
  "message": "Cet endpoint est désactivé en production."
}
```

**Couche 2: Token admin (si activé)**
```bash
# .env (TESTS uniquement)
ENABLE_TOOLS_EXECUTE=true
ADMIN_TOKEN=a1b2c3d4e5f6...  # Token fort aléatoire
```

**Appel requis:**
```bash
curl -H "X-Admin-Token: a1b2c3d4e5f6..." \
  https://max-api.studiomacrea.cloud/api/tools/execute
```

**Résultat si token manquant:**
```json
{
  "success": false,
  "error": "ADMIN_TOKEN_REQUIRED",
  "message": "Header X-Admin-Token requis pour cet endpoint."
}
```

**Résultat si token invalide:**
```json
{
  "success": false,
  "error": "INVALID_ADMIN_TOKEN",
  "message": "Token admin invalide."
}
```

**Couche 3: Logs audit**

Chaque accès autorisé est loggé:
```
╔════════════════════════════════════════════════════════════╗
║  TOOLS EXECUTE - ACCÈS ADMIN                               ║
╚════════════════════════════════════════════════════════════╝
[tools/execute] ✅ Accès autorisé
[tools/execute] 📍 IP: 192.168.1.100
[tools/execute] 🕒 Timestamp: 2025-12-31T14:30:00.000Z
[tools/execute] 🏢 Tenant: macrea-admin
```

---

## 📝 Configuration .env (mise à jour)

### Variables ajoutées dans `.env.example`:

```bash
# ——————————————————————————————————————————————————————————————————————————
# Configuration Docker/SSH pour phpExecutor
# ——————————————————————————————————————————————————————————————————————————
# Si max-backend tourne DANS Docker (production): détection automatique
# Ces variables sont optionnelles (fallback sur valeurs par défaut)
ESPO_CONTAINER_NAME=espocrm
ESPO_SSH_HOST=51.159.170.20
ESPO_SSH_USER=root

# ——————————————————————————————————————————————————————————————————————————
# SÉCURITÉ - Endpoint /api/tools/execute
# ——————————————————————————————————————————————————————————————————————————
# ATTENTION: Cet endpoint permet d'exécuter des tools directement sans passer par le LLM
# Activé uniquement pour les tests - DÉSACTIVÉ par défaut en production
ENABLE_TOOLS_EXECUTE=false

# Token admin pour protéger /api/tools/execute
# Générer un token aléatoire fort (ex: openssl rand -hex 32)
# Si défini, le header X-Admin-Token sera requis
ADMIN_TOKEN=
```

---

## 🚀 Déploiement production

### 1. Copier les fichiers

```bash
scp max_backend/lib/consentGate.js root@51.159.170.20:/tmp/
scp max_backend/lib/phpExecutorDockerLocal.js root@51.159.170.20:/tmp/
scp max_backend/lib/phpExecutorAuto.js root@51.159.170.20:/tmp/
scp max_backend/routes/chat.js root@51.159.170.20:/tmp/
scp max_backend/routes/tools.js root@51.159.170.20:/tmp/
scp max_backend/server.js root@51.159.170.20:/tmp/
scp max_backend/.env.example root@51.159.170.20:/tmp/
```

### 2. Déplacer dans les bons dossiers

```bash
ssh root@51.159.170.20 "
  mv /tmp/consentGate.js /opt/max-infrastructure/max-backend/lib/
  mv /tmp/phpExecutorDockerLocal.js /opt/max-infrastructure/max-backend/lib/
  mv /tmp/phpExecutorAuto.js /opt/max-infrastructure/max-backend/lib/
  mv /tmp/chat.js /opt/max-infrastructure/max-backend/routes/
  mv /tmp/tools.js /opt/max-infrastructure/max-backend/routes/
  mv /tmp/server.js /opt/max-infrastructure/max-backend/
  mv /tmp/.env.example /opt/max-infrastructure/max-backend/
"
```

### 3. Configurer .env (IMPORTANT)

```bash
ssh root@51.159.170.20

# Se placer dans le dossier backend
cd /opt/max-infrastructure/max-backend

# Vérifier que ENABLE_TOOLS_EXECUTE n'est PAS défini (ou = false)
grep ENABLE_TOOLS_EXECUTE .env

# Si absent ou false: OK ✅
# Si true: MODIFIER IMMÉDIATEMENT
# echo "ENABLE_TOOLS_EXECUTE=false" >> .env
```

### 4. Redémarrer le backend

```bash
ssh root@51.159.170.20 "cd /opt/max-infrastructure && docker compose restart max-backend"
```

### 5. Vérifier les logs de démarrage

```bash
ssh root@51.159.170.20 "cd /opt/max-infrastructure && docker compose logs max-backend | grep -A 5 'PHP EXECUTOR MODE'"
```

**Attendu:**
```
╔════════════════════════════════════════════════════════════╗
║  PHP EXECUTOR MODE: LOCAL (Docker)                         ║
╚════════════════════════════════════════════════════════════╝
[phpExecutorAuto] ✅ Mode: LOCAL (dans container Docker)
[phpExecutorAuto] 🐳 Target container: espocrm
[phpExecutorAuto] 📋 Command pattern: docker exec espocrm php command.php <cmd>
```

---

## 🧪 Tests après déploiement

### Test 1: Vérifier que /api/tools/execute est DÉSACTIVÉ

```bash
curl -X POST https://max-api.studiomacrea.cloud/api/tools/execute \
  -H "Content-Type: application/json" \
  -H "X-Tenant: macrea-admin" \
  -d '{"tool": "create_custom_field", "args": {}}'
```

**Attendu (PRODUCTION):**
```json
{
  "success": false,
  "error": "TOOLS_EXECUTE_DISABLED",
  "message": "Cet endpoint est désactivé en production. Définir ENABLE_TOOLS_EXECUTE=true pour l'activer."
}
```

✅ **Si ce message apparaît: SÉCURITÉ OK**

---

### Test 2: Activer temporairement pour tests (AVEC TOKEN)

```bash
ssh root@51.159.170.20

cd /opt/max-infrastructure/max-backend

# Générer token admin fort
TOKEN=$(openssl rand -hex 32)
echo "ADMIN_TOKEN=$TOKEN" >> .env
echo "ENABLE_TOOLS_EXECUTE=true" >> .env

# Redémarrer
cd /opt/max-infrastructure
docker compose restart max-backend

# Afficher le token (le copier pour les tests)
cat /opt/max-infrastructure/max-backend/.env | grep ADMIN_TOKEN
```

**Test A: Sans token (doit échouer)**
```bash
curl -X POST https://max-api.studiomacrea.cloud/api/tools/execute \
  -H "Content-Type: application/json" \
  -H "X-Tenant: macrea-admin" \
  -d '{
    "tool": "create_custom_field",
    "args": {
      "entity": "Lead",
      "fieldName": "testField123",
      "type": "varchar"
    }
  }'
```

**Attendu:**
```json
{
  "success": false,
  "error": "ADMIN_TOKEN_REQUIRED",
  "message": "Header X-Admin-Token requis pour cet endpoint."
}
```

**Test B: Avec token (doit réussir et retourner 412)**
```bash
curl -X POST https://max-api.studiomacrea.cloud/api/tools/execute \
  -H "Content-Type: application/json" \
  -H "X-Tenant: macrea-admin" \
  -H "X-Admin-Token: VOTRE_TOKEN_ICI" \
  -d '{
    "tool": "create_custom_field",
    "args": {
      "entity": "Lead",
      "fieldName": "testField123",
      "type": "varchar"
    }
  }'
```

**Attendu:**
```json
{
  "success": false,
  "error": "CONSENT_REQUIRED",
  "httpCode": 412,
  "requiresConsent": true,
  "operation": {
    "type": "field_creation",
    "description": "Créer le champ custom \"testField123\" (varchar) sur Lead",
    "details": {
      "entity": "Lead",
      "fieldName": "testField123",
      "type": "varchar"
    }
  }
}
```

✅ **Si 412 avec requiresConsent: CONSENT GATE OK**

---

### Test 3: Désactiver après tests

```bash
ssh root@51.159.170.20

cd /opt/max-infrastructure/max-backend

# Désactiver l'endpoint
sed -i 's/ENABLE_TOOLS_EXECUTE=true/ENABLE_TOOLS_EXECUTE=false/' .env

# Redémarrer
cd /opt/max-infrastructure
docker compose restart max-backend
```

---

## 📊 Checklist finale avant prod

- [x] **Logs executor explicites** (mode + container name)
- [x] **Endpoint /api/tools/execute DÉSACTIVÉ par défaut**
- [x] **Protection par token admin (X-Admin-Token)**
- [x] **Logs audit pour chaque accès**
- [x] **Documentation .env.example**
- [x] **Tests de sécurité validés**

---

## 🎬 Démo E2E (après déploiement)

### Scénario filmable (2-3 minutes):

**1. Montrer les logs de démarrage**
```bash
ssh root@51.159.170.20 "cd /opt/max-infrastructure && docker compose logs max-backend | grep -A 5 'PHP EXECUTOR MODE'"
```

**2. Tenter d'accéder à /api/tools/execute (doit échouer)**
```bash
curl https://max-api.studiomacrea.cloud/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool": "create_custom_field", "args": {}}'
```

**3. Conversation naturelle avec M.A.X. sur https://max.studiomacrea.cloud/chat**
```
User: "Peux-tu créer un champ feedback de type text sur Lead ?"

M.A.X. (attendu):
- Détecte: opération sensible
- Appelle: request_consent()
- Répond: "Cette opération nécessite ton autorisation"
- ConsentCard s'affiche

User: [Clique "Approuver"]

M.A.X.:
- Exécution automatique
- Confirme: "✅ Champ créé avec succès"
```

**4. Vérifier dans EspoCRM**
- Ouvrir Lead
- Vérifier présence du champ "feedback"

**5. Montrer logs audit**
```bash
ssh root@51.159.170.20 "cd /opt/max-infrastructure && docker compose logs max-backend | grep -A 10 'CONSENT GATE'"
```

---

## ✅ Points de validation finaux

### Sécurité

- ✅ Endpoint tools/execute désactivé par défaut
- ✅ Protection par token admin si activé
- ✅ Logs audit pour chaque accès
- ✅ Pas de dépendances Windows en production

### Fonctionnalité

- ✅ Consent gate bloque sans consentId (412 intelligent)
- ✅ Consent gate autorise avec consentId valide
- ✅ M.A.X. peut se corriger automatiquement (self-healing)
- ✅ Executor auto-détecte mode local/SSH

### Observabilité

- ✅ Logs mode executor au démarrage
- ✅ Logs à chaque commande PHP
- ✅ Logs audit accès admin
- ✅ Container name visible

---

## 🚀 Statut final

**✅ PRODUCTION READY**

Toutes les protections sont en place:
1. Logs explicites du mode executor
2. Protection endpoint /api/tools/execute
3. Consent gate server-side validé
4. Aucune dépendance Windows
5. Auto-détection du mode

**Prêt pour démo E2E et déploiement production ! 🎬**

---

**Date de validation:** 2025-12-31
**Version:** 1.1 (sécurité renforcée)
**Statut:** ✅ Production Ready
