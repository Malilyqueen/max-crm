# Implémentation Workflow `wf-relance-j3`

**Date:** 2025-11-28
**Status:** ✅ Backend Prêt - n8n à Configurer
**Objectif:** Premier workflow end-to-end M.A.X. → n8n

---

## ✅ Ce qui a été fait

### 1️⃣ Nettoyage du Code Backend

**Fichiers modifiés:**

#### `services/n8n.js`
- ✅ Unifié les noms de workflows: convention `wf-*`
- ✅ Supprimé les doublons (`relance-j3` + `wf-relance-j3` → `wf-relance-j3` uniquement)
- ✅ Mapping propre:
  ```javascript
  {
    'wf-relance-j3': process.env.N8N_WEBHOOK_RELANCE_J3,
    'wf-tag-chaud': process.env.N8N_WEBHOOK_TAG_CHAUD,
    'wf-nettoyage': process.env.N8N_WEBHOOK_NETTOYAGE,
    'wf-newsletter-segment': process.env.N8N_WEBHOOK_NEWSLETTER_SEGMENT
  }
  ```

#### `config/auto.json`
- ✅ Mis à jour avec noms unifiés:
  ```json
  {
    "allowed": ["wf-relance-j3", "wf-tag-chaud", "wf-newsletter-segment"]
  }
  ```

#### `routes/n8n.js`
- ✅ Liste des workflows nettoyée
- ✅ Endpoint `GET /api/n8n/workflows` retourne liste unifiée

---

## 📦 Fichiers Créés

### 1. Guide d'Installation Complet
**Fichier:** [docs/N8N_INSTALLATION_GUIDE.md](./N8N_INSTALLATION_GUIDE.md)

**Contenu:**
- Installation n8n (npm, Docker, ou existant)
- Configuration EspoCRM credentials
- Création du workflow `wf-relance-j3`
- Configuration M.A.X. backend (.env)
- Tests d'intégration
- Troubleshooting

### 2. Workflow n8n Prêt à Importer
**Fichier:** [n8n_workflows/wf-relance-j3.json](../n8n_workflows/wf-relance-j3.json)

**Structure:**
```
Webhook → Wait 5 Minutes → Test Log
```

**Payload attendu:**
```json
{
  "tenant": "default",
  "actor": "MAX",
  "action": "wf-relance-j3",
  "mode": "assist",
  "context": {
    "role": "admin",
    "runId": "run-abc123"
  },
  "data": {
    "leadId": "69272eee2a489f7a6",
    "messageSuggestion": "Bonjour...",
    "canal": "whatsapp",
    "delayMinutes": 5
  }
}
```

### 3. Script de Test
**Fichier:** [tools/test_n8n_workflow.js](../tools/test_n8n_workflow.js)

**Utilisation:**
```bash
cd d:\Macrea\CRM\max_backend
node tools/test_n8n_workflow.js
```

**Fonctionnalités:**
- ✅ Vérification de la configuration .env
- ✅ Test du trigger M.A.X. → n8n
- ✅ Mode mock si n8n pas configuré
- ✅ Messages d'erreur détaillés avec solutions

---

## 🔧 Configuration Requise

### Variables d'Environnement (.env)

**À ajouter dans `d:\Macrea\CRM\max_backend\.env`:**

```bash
# n8n Configuration
N8N_BASE=http://127.0.0.1:5678
N8N_WEBHOOK_SECRET=dev-secret-change-me-in-prod
N8N_API_KEY=

# Webhook wf-relance-j3
N8N_WEBHOOK_RELANCE_J3=http://127.0.0.1:5678/webhook/wf-relance-j3

# Autres webhooks (pour plus tard)
N8N_WEBHOOK_TAG_CHAUD=
N8N_WEBHOOK_NETTOYAGE=
N8N_WEBHOOK_NEWSLETTER_SEGMENT=
```

---

## 🎯 Workflow Cible: `wf-relance-j3`

### Description
Relance automatique d'un lead après 3 jours (J+3).

### Scénario
1. **M.A.X. détecte** un lead à relancer (tag IA, score élevé, etc.)
2. **M.A.X. propose** une action via `/api/n8n/trigger`
3. **Mode assist:** Attente validation humaine
4. **n8n reçoit** le webhook avec payload
5. **Wait 5 minutes** (temporaire - sera J+3 en prod)
6. **Test Log** affiche les données (sera WhatsApp/Email en prod)

### Payload Structuré
```json
{
  "code": "wf-relance-j3",
  "mode": "assist",
  "payload": {
    "leadId": "69272eee2a489f7a6",
    "messageSuggestion": "Bonjour, je reviens vers vous...",
    "canal": "whatsapp",
    "delayMinutes": 5
  }
}
```

---

## 🚀 Prochaines Étapes

### Étape 1: Installation n8n (À faire)
```bash
npm install -g n8n
n8n start
```

### Étape 2: Créer le Workflow (À faire)
1. Aller sur http://127.0.0.1:5678
2. Importer `n8n_workflows/wf-relance-j3.json`
3. Activer le workflow

### Étape 3: Configuration .env (À faire)
Copier l'URL du webhook n8n dans `.env`:
```
N8N_WEBHOOK_RELANCE_J3=http://127.0.0.1:5678/webhook/wf-relance-j3
```

### Étape 4: Test (À faire)
```bash
node tools/test_n8n_workflow.js
```

### Étape 5: Test depuis M.A.X. Chat (À faire)
Demander à M.A.X. d'analyser un lead et proposer une relance.

---

## 📊 Routes API Disponibles

### GET `/api/n8n/workflows`
Liste les workflows disponibles.

**Réponse:**
```json
{
  "ok": true,
  "list": [
    "wf-relance-j3",
    "wf-tag-chaud",
    "wf-nettoyage",
    "wf-newsletter-segment"
  ]
}
```

### POST `/api/n8n/trigger`
Déclenche un workflow n8n.

**Headers:**
- `X-Tenant`: default
- `X-Role`: admin
- `X-Preview`: false (true pour bloquer l'exécution)

**Body:**
```json
{
  "code": "wf-relance-j3",
  "mode": "assist",
  "payload": {
    "leadId": "...",
    "messageSuggestion": "...",
    "canal": "whatsapp"
  }
}
```

**Réponse succès:**
```json
{
  "ok": true,
  "runId": "run-abc123"
}
```

---

## 🛡️ Garde-fous Actifs

### 1. Rate Limiting
- **Limite:** 50 exécutions/heure par tenant
- **Fichier:** `services/auto-guard.js`

### 2. Horaires
- **Plage:** 9h-19h uniquement (configurable)
- **Config:** `config/auto.json`

### 3. Preview Mode
- **Header:** `X-Preview: true`
- **Effet:** Bloque l'exécution réelle

### 4. Signature HMAC
- **Header:** `X-MAX-Signature`
- **Secret:** `N8N_WEBHOOK_SECRET`
- **Vérification:** Optionnelle côté n8n

---

## 📝 Logs et Monitoring

### Logs M.A.X.
```
[N8N] Triggering workflow: wf-relance-j3
[Task] Created: run-abc123 - Workflow wf-relance-j3
[Task] Started: run-abc123
[Task] Progress: run-abc123 - 20%
[Task] Completed: run-abc123 - Status 200
```

### Logs n8n
- Aller dans n8n → **Executions**
- Voir statut: Running / Success / Error
- Inspecter les données reçues/envoyées

---

## ❓ Questions Fréquentes

### Q: Pourquoi "Wait 5 minutes" au lieu de J+3?
**R:** Pour tester rapidement. En production, on changera pour:
- Wait 3 days
- Ou trigger par cron n8n

### Q: Pourquoi "Test Log" au lieu d'envoyer WhatsApp?
**R:** Phase 1 = tester l'infrastructure. Phase 2 = vrai envoi.

### Q: Mode assist vs mode auto?
**R:**
- **assist:** M.A.X. propose, humain valide
- **auto:** M.A.X. exécute automatiquement (garde-fous actifs)

### Q: Que faire si n8n est déjà installé ailleurs?
**R:** Modifier `N8N_BASE` dans `.env` avec la bonne URL.

---

## ✅ Checklist de Validation

- [ ] n8n installé et démarré sur port 5678
- [ ] Workflow `wf-relance-j3` importé et activé
- [ ] Variable `N8N_WEBHOOK_RELANCE_J3` configurée dans `.env`
- [ ] Serveur M.A.X. redémarré
- [ ] Test script réussi: `node tools/test_n8n_workflow.js`
- [ ] Exécution visible dans n8n → Executions
- [ ] Données reçues correctement dans le node "Test Log"

---

## 🎯 Objectif Final

**Un workflow end-to-end fonctionnel:**

```
M.A.X. (analyse lead)
  ↓
POST /api/n8n/trigger
  ↓
services/n8n.js
  ↓
HTTP POST → n8n webhook
  ↓
n8n: Webhook → Wait → Test Log
  ↓
Succès! ✅
```

**Prochaine phase:** Remplacer "Test Log" par vrai envoi WhatsApp/Email + connexion EspoCRM pour mettre à jour le lead.
