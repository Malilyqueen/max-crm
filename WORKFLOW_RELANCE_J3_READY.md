# 🎯 Workflow `wf-relance-j3` - Prêt à Déployer

**Date:** 2025-11-28
**Status:** ✅ **Backend 100% Prêt** - Infrastructure n8n à Configurer

---

## ✅ CE QUI EST FAIT

### 1️⃣ Backend M.A.X. - 100% Prêt

**Modifications effectuées:**

#### ✅ Nettoyage des Codes
- **`services/n8n.js`** - Noms unifiés (convention `wf-*`)
- **`config/auto.json`** - Liste workflows mise à jour
- **`routes/n8n.js`** - Endpoints propres

**Convention unique:** Tous les workflows utilisent `wf-*`:
- ✅ `wf-relance-j3` (au lieu de doublon `relance-j3` + `wf-relance-j3`)
- ✅ `wf-tag-chaud` (au lieu de `tag-hot`)
- ✅ `wf-nettoyage`
- ✅ `wf-newsletter-segment`

#### ✅ Infrastructure Prête
- Route `POST /api/n8n/trigger` ✅ Fonctionnelle
- Service `services/n8n.js` ✅ Prêt à appeler webhooks
- Garde-fous ✅ Actifs (rate limit, horaires, HMAC)
- Mode mock ✅ Pour tests sans n8n

### 2️⃣ Documentation Complète

**Fichiers créés:**

1. **[docs/N8N_INSTALLATION_GUIDE.md](max_backend/docs/N8N_INSTALLATION_GUIDE.md)**
   - Guide pas-à-pas installation n8n
   - Configuration EspoCRM credentials
   - Création du workflow
   - Tests et troubleshooting

2. **[docs/WF_RELANCE_J3_IMPLEMENTATION.md](max_backend/docs/WF_RELANCE_J3_IMPLEMENTATION.md)**
   - Détails techniques complets
   - Architecture du workflow
   - API endpoints
   - Checklist de validation

3. **[n8n_workflows/wf-relance-j3.json](max_backend/n8n_workflows/wf-relance-j3.json)**
   - Workflow n8n prêt à importer
   - Structure: Webhook → Wait 5 min → Test Log
   - À remplacer plus tard par WhatsApp/Email réel

4. **[tools/test_n8n_workflow.js](max_backend/tools/test_n8n_workflow.js)**
   - Script de test automatique
   - Vérification configuration
   - Mode mock si n8n pas installé

---

## 🎯 WORKFLOW: `wf-relance-j3`

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    M.A.X. (Cerveau)                         │
│  - Détecte lead à relancer                                  │
│  - Prépare payload JSON                                     │
│  - Appelle POST /api/n8n/trigger                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
            POST http://localhost:3005/api/n8n/trigger
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                services/n8n.js (M.A.X.)                     │
│  - Valide garde-fous (rate limit, horaires)                │
│  - Crée signature HMAC                                      │
│  - Envoie à n8n                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
        POST http://127.0.0.1:5678/webhook/wf-relance-j3
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    n8n Workflow                             │
│  1. Webhook (reçoit payload)                                │
│  2. Wait 5 minutes (temporaire - sera J+3 en prod)         │
│  3. Test Log (temporaire - sera WhatsApp/Email)            │
└─────────────────────────────────────────────────────────────┘
```

### Payload Structuré

**Envoyé par M.A.X.:**
```json
{
  "code": "wf-relance-j3",
  "mode": "assist",
  "payload": {
    "leadId": "69272eee2a489f7a6",
    "messageSuggestion": "Bonjour, je reviens vers vous...",
    "canal": "whatsapp",
    "delayMinutes": 5,
    "leadName": "Macrea AI Studio",
    "leadEmail": "contact@macrea.com",
    "leadPhone": "+33612345678"
  }
}
```

**Reçu par n8n:**
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
    "messageSuggestion": "...",
    "canal": "whatsapp",
    "delayMinutes": 5
  },
  "ts": 1701234567890
}
```

---

## 📋 CE QU'IL RESTE À FAIRE

### Étape 1: Installer n8n ⏳

**Option A: Installation locale (recommandé)**
```bash
npm install -g n8n
n8n start
```
Accès: http://127.0.0.1:5678

**Option B: Docker**
```bash
docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n
```

**Option C: n8n existant**
Si vous avez déjà n8n, vérifier qu'il tourne sur port 5678.

### Étape 2: Importer le Workflow ⏳

1. Aller sur http://127.0.0.1:5678
2. Cliquer **"New Workflow"**
3. Menu → **"Import from File"**
4. Sélectionner: `d:\Macrea\CRM\max_backend\n8n_workflows\wf-relance-j3.json`
5. **Activer** le workflow (toggle en haut à droite)
6. **Copier l'URL du webhook** (visible dans le node Webhook)

### Étape 3: Configurer .env ⏳

Ajouter dans `d:\Macrea\CRM\max_backend\.env`:

```bash
# Webhook wf-relance-j3 (URL copiée depuis n8n)
N8N_WEBHOOK_RELANCE_J3=http://127.0.0.1:5678/webhook/wf-relance-j3

# Optionnel: Secret pour signature HMAC
N8N_WEBHOOK_SECRET=dev-secret-change-me-in-prod
```

### Étape 4: Redémarrer M.A.X. ⏳

```bash
cd d:\Macrea\CRM\max_backend
# Arrêter le serveur actuel (Ctrl+C)
npm run dev
```

### Étape 5: Tester! ⏳

```bash
cd d:\Macrea\CRM\max_backend
node tools/test_n8n_workflow.js
```

**Résultat attendu:**
```
✅ SUCCÈS - Workflow déclenché!
Run ID: run-abc123
```

---

## 🔍 Tests Disponibles

### Test 1: Vérifier les Workflows
```bash
curl http://localhost:3005/api/n8n/workflows
```

**Réponse:**
```json
{
  "ok": true,
  "list": ["wf-relance-j3", "wf-tag-chaud", "wf-nettoyage", "wf-newsletter-segment"]
}
```

### Test 2: Trigger Manuel
```bash
curl -X POST http://localhost:3005/api/n8n/trigger \
  -H "Content-Type: application/json" \
  -H "X-Preview: false" \
  -d '{
    "code": "wf-relance-j3",
    "mode": "assist",
    "payload": {
      "leadId": "test-123",
      "messageSuggestion": "Test message",
      "canal": "whatsapp"
    }
  }'
```

### Test 3: Script Automatique
```bash
node tools/test_n8n_workflow.js
```

---

## 🛡️ Garde-fous Actifs

### Rate Limiting
- **Limite:** 50 exécutions/heure par tenant
- **Fichier:** `services/auto-guard.js`

### Horaires Business
- **Plage:** 9h-19h uniquement
- **Config:** `config/auto.json`

### Preview Mode
- **Header:** `X-Preview: true`
- **Effet:** Bloque l'exécution (pour tests)

### Signature HMAC
- **Header:** `X-MAX-Signature`
- **Algorithme:** SHA-256
- **Secret:** `N8N_WEBHOOK_SECRET`

---

## 🎓 Intégration avec M.A.X.

### Exemple: Appel depuis M.A.X. Chat

Quand M.A.X. détecte un lead à relancer:

```javascript
import { trigger } from './services/n8n.js';

// M.A.X. analyse le lead et décide de relancer
const result = await trigger({
  code: 'wf-relance-j3',
  payload: {
    leadId: lead.id,
    messageSuggestion: 'Bonjour, suite à votre demande...',
    canal: 'whatsapp',
    delayMinutes: 5
  },
  tenant: 'default',
  role: 'admin',
  mode: 'assist'  // Attend validation humaine
});

console.log(`Workflow ${result.runId} démarré`);
```

### Mode Assist vs Auto

**Mode Assist (actuel):**
- M.A.X. **propose** l'action
- Humain **valide**
- n8n **exécute**

**Mode Auto (futur):**
- M.A.X. **détecte** + **exécute** automatiquement
- Garde-fous actifs (horaires, rate limit)
- Pas de validation humaine

---

## 📊 Monitoring

### Logs M.A.X.
```
[N8N] Triggering workflow: wf-relance-j3
[Task] Created: run-abc123
[Task] Started: run-abc123
[Task] Progress: 20%
[Task] Completed: run-abc123 - Status 200
```

### n8n Executions
- Aller dans n8n → **Executions**
- Voir: Running / Success / Error
- Inspecter données reçues/envoyées

---

## 🚀 Prochaines Phases

### Phase 2: WhatsApp/Email Réel
- Remplacer "Test Log" par node WhatsApp Business API
- Ou node Email (SMTP/SendGrid)
- Connexion EspoCRM pour mettre à jour le lead

### Phase 3: Timing Production
- Changer "Wait 5 minutes" → "Wait 3 days"
- Ou trigger par cron n8n (tous les jours à 10h)

### Phase 4: Autres Workflows
- `wf-tag-chaud` → Lead score > 80 → SMS immédiat
- `wf-panier-abandonne` → Email après 30 min
- `wf-facebook-lead` → WhatsApp après 5 min

---

## ✅ Checklist

- [ ] n8n installé et démarré
- [ ] Workflow importé dans n8n
- [ ] Workflow activé
- [ ] URL webhook copiée
- [ ] `.env` mis à jour avec `N8N_WEBHOOK_RELANCE_J3`
- [ ] Serveur M.A.X. redémarré
- [ ] Test script réussi
- [ ] Exécution visible dans n8n

---

## 📚 Documentation

- **Installation:** [docs/N8N_INSTALLATION_GUIDE.md](max_backend/docs/N8N_INSTALLATION_GUIDE.md)
- **Implémentation:** [docs/WF_RELANCE_J3_IMPLEMENTATION.md](max_backend/docs/WF_RELANCE_J3_IMPLEMENTATION.md)
- **Workflow JSON:** [n8n_workflows/wf-relance-j3.json](max_backend/n8n_workflows/wf-relance-j3.json)
- **Test Script:** [tools/test_n8n_workflow.js](max_backend/tools/test_n8n_workflow.js)

---

## 🎯 RÉSUMÉ

**Backend M.A.X.: ✅ 100% PRÊT**

Tout est en place côté M.A.X.:
- Routes API configurées
- Services fonctionnels
- Garde-fous actifs
- Tests disponibles

**n8n: ⏳ À CONFIGURER**

Il vous reste juste à:
1. Installer n8n (5 min)
2. Importer le workflow (2 min)
3. Configurer `.env` (1 min)
4. Tester! (1 min)

**Total: ~10 minutes pour avoir un workflow end-to-end fonctionnel!** 🚀
