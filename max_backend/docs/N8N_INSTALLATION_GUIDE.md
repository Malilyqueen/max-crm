# Guide d'Installation n8n pour M.A.X.

**Workflow cible:** `wf-relance-j3` (relance automatique J+3)

---

## 1️⃣ Installation n8n

### Option A: Installation locale (Recommandé pour dev)

```bash
# Installation globale
npm install -g n8n

# Démarrage
n8n start

# Ou avec tunneling pour webhooks externes
n8n start --tunnel
```

**Accès:** http://localhost:5678

### Option B: Docker

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### Option C: Utiliser n8n existant

Si vous avez déjà n8n installé:
1. Vérifier qu'il tourne sur `http://127.0.0.1:5678`
2. Passer directement à l'étape 2

---

## 2️⃣ Configuration EspoCRM dans n8n

### Créer les Credentials EspoCRM

1. Aller dans n8n → **Credentials** → **New Credential**
2. Chercher **"HTTP Header Auth"** ou **"Generic Credential"**
3. Nom: `EspoCRM MaCrea`
4. Configuration:

**Option 1: Basic Auth**
```
Type: Basic Auth
Username: <ESPO_USERNAME>
Password: <ESPO_PASSWORD>
```

**Option 2: API Key**
```
Type: Header Auth
Name: X-Api-Key
Value: <ESPO_API_KEY>
```

**Base URL:** `http://127.0.0.1:8081/espocrm/api/v1`

---

## 3️⃣ Création du Workflow `wf-relance-j3`

### Étape 1: Créer le Workflow

1. Dans n8n, cliquer **New Workflow**
2. Nom: `wf-relance-j3`
3. Ajouter les nodes suivants:

### Node 1: Webhook (Trigger)

**Type:** Webhook
**Configuration:**
- HTTP Method: `POST`
- Path: `wf-relance-j3`
- Authentication: None (sécurisé par HMAC côté M.A.X.)
- Response Mode: `On Received`

**URL générée:** `http://127.0.0.1:5678/webhook/wf-relance-j3`

⚠️ **IMPORTANT:** Copier cette URL pour l'étape 4!

### Node 2: Wait

**Type:** Wait
**Configuration:**
- Resume: `After time interval`
- Amount: `5`
- Unit: `Minutes`

### Node 3: Test Log (temporaire)

**Type:** Set
**Configuration:**
- Mode: `Manual`
- Valeurs:
  - `leadId`: `{{ $json.data.leadId }}`
  - `message`: `{{ $json.data.messageSuggestion }}`
  - `canal`: `{{ $json.data.canal }}`
  - `status`: `ready_to_send`
  - `timestamp`: `{{ $now }}`

**Note:** Ce node sera remplacé plus tard par un vrai envoi WhatsApp/Email.

### Connexions:
```
Webhook → Wait → Test Log
```

### Sauvegarder et Activer

1. Cliquer **Save**
2. Activer le workflow (toggle en haut à droite)

---

## 4️⃣ Configuration M.A.X. Backend

### Ajouter le Webhook dans .env

Éditer `d:\Macrea\CRM\max_backend\.env`:

```bash
# n8n Configuration
N8N_BASE=http://127.0.0.1:5678
N8N_WEBHOOK_SECRET=dev-secret-change-me-in-prod
N8N_API_KEY=your-n8n-api-key-if-needed

# Webhook wf-relance-j3 (copié depuis n8n)
N8N_WEBHOOK_RELANCE_J3=http://127.0.0.1:5678/webhook/wf-relance-j3

# Autres webhooks (à configurer plus tard)
N8N_WEBHOOK_TAG_CHAUD=
N8N_WEBHOOK_NETTOYAGE=
N8N_WEBHOOK_NEWSLETTER_SEGMENT=
```

### Redémarrer M.A.X.

```bash
cd d:\Macrea\CRM\max_backend
# Arrêter le serveur actuel (Ctrl+C dans le terminal)
npm run dev
```

---

## 5️⃣ Test de l'Intégration

### Test 1: Vérifier les Workflows Disponibles

```bash
curl http://localhost:3005/api/n8n/workflows
```

**Réponse attendue:**
```json
{
  "ok": true,
  "list": ["wf-relance-j3", "wf-tag-chaud", "wf-nettoyage", "wf-newsletter-segment"]
}
```

### Test 2: Trigger Manuel (Mode Assist)

```bash
curl -X POST http://localhost:3005/api/n8n/trigger \
  -H "Content-Type: application/json" \
  -H "X-Tenant: default" \
  -H "X-Role: admin" \
  -H "X-Preview: false" \
  -d '{
    "code": "wf-relance-j3",
    "mode": "assist",
    "payload": {
      "leadId": "test-lead-123",
      "messageSuggestion": "Bonjour, je reviens vers vous concernant votre demande.",
      "canal": "whatsapp",
      "delayMinutes": 5
    }
  }'
```

**Réponse attendue:**
```json
{
  "ok": true,
  "runId": "run-abc123"
}
```

### Test 3: Vérifier dans n8n

1. Aller dans n8n → **Executions**
2. Vous devriez voir une exécution en cours (Wait 5 minutes)
3. Après 5 minutes, vérifier que le node "Test Log" a bien reçu les données

---

## 6️⃣ Intégration avec M.A.X. Chat

### Appel depuis M.A.X.

Quand M.A.X. détecte un lead à relancer, il peut appeler:

```javascript
import { trigger } from '../services/n8n.js';

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
  mode: 'assist'
});

console.log('Workflow démarré:', result.runId);
```

### Mode Preview (Sécurité)

Pour éviter les exécutions accidentelles en mode preview:

```bash
curl -X POST http://localhost:3005/api/n8n/trigger \
  -H "Content-Type: application/json" \
  -H "X-Preview: true" \
  -d '{ "code": "wf-relance-j3", "payload": {} }'
```

**Réponse:**
```json
{
  "ok": false,
  "error": "PREVIEW_ON"
}
```

---

## 7️⃣ Sécurité HMAC

### Vérification Signature côté n8n (Optionnel)

Si vous voulez vérifier la signature HMAC dans n8n:

**Node "Function" avant Wait:**
```javascript
const crypto = require('crypto');

const body = JSON.stringify($input.all());
const secret = 'dev-secret-change-me-in-prod';
const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('hex');
const receivedSig = $node["Webhook"].json.headers['x-max-signature'];

if (expectedSig !== receivedSig) {
  throw new Error('Invalid signature');
}

return $input.all();
```

---

## 8️⃣ Monitoring

### Logs M.A.X.

Les logs M.A.X. montreront:
```
[N8N] Triggering workflow: wf-relance-j3
[Task] Created: run-abc123 - Workflow wf-relance-j3
[Task] Started: run-abc123
[Task] Progress: run-abc123 - 20%
[Task] Completed: run-abc123
```

### Logs n8n

Dans n8n → Executions, vous verrez:
- Statut: Success / Running / Error
- Durée d'exécution
- Données reçues et envoyées

---

## 9️⃣ Prochaines Étapes

Une fois `wf-relance-j3` testé et validé:

1. **Remplacer le node Test Log** par un vrai envoi WhatsApp/Email
2. **Ajouter la connexion EspoCRM** dans n8n pour mettre à jour le lead
3. **Passer en mode Auto** pour relances automatiques
4. **Créer d'autres workflows** (panier abandonné, Facebook, etc.)

---

## ❓ Troubleshooting

### n8n ne démarre pas
```bash
# Vérifier si le port 5678 est occupé
netstat -ano | findstr ":5678"

# Changer le port
n8n start --port 5679
```

### Webhook n8n injoignable depuis M.A.X.
- Vérifier que n8n est bien sur `127.0.0.1:5678`
- Vérifier firewall Windows
- Tester avec `curl http://127.0.0.1:5678/webhook/wf-relance-j3`

### Erreur "N8N_BAD_GATEWAY"
- Vérifier que `N8N_WEBHOOK_RELANCE_J3` est bien rempli dans `.env`
- Vérifier que le workflow est activé dans n8n
- Vérifier les logs n8n

---

**🎯 Objectif:** Un workflow `wf-relance-j3` fonctionnel de bout en bout: M.A.X. → n8n → Wait 5 min → Log
