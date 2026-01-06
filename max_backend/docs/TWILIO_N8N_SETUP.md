# Configuration Twilio dans n8n pour WhatsApp

## Étape 1: Ajouter les credentials Twilio dans n8n

1. Ouvrir http://127.0.0.1:5678
2. Aller dans **Settings** → **Credentials** (ou cliquer sur l'icône clé en haut à droite)
3. Cliquer sur **"New Credential"**
4. Chercher et sélectionner **"Twilio API"**
5. Remplir les informations:
   - **Credential Name**: `Twilio MaCréa`
   - **Account SID**: `AC78ebc7238576304ae00fbe4df3a07f5e`
   - **Auth Token**: `12a0e364fb468ea4b00ab07f7e09f6fe`
6. Cliquer sur **"Save"**

## Étape 2: Importer le workflow WhatsApp

1. Dans n8n, aller dans **Workflows**
2. Cliquer sur **"Import from File"**
3. Sélectionner le fichier: `d:\Macrea\CRM\max_backend\n8n_workflows\wf-relance-j3-whatsapp.json`
4. Le workflow s'ouvre avec 4 nodes:
   - **Webhook** (trigger)
   - **Wait 10 Seconds** (délai de test)
   - **Envoyer WhatsApp** (Twilio)
   - **Log Résultat** (pour voir ce qui s'est passé)

## Étape 3: Vérifier la configuration du node Twilio

1. Cliquer sur le node **"Envoyer WhatsApp"**
2. Vérifier les paramètres:
   - **From**: `whatsapp:+14155238886` (numéro Twilio)
   - **To**: `={{ 'whatsapp:' + $json.data.leadPhone }}` (numéro du lead)
   - **Message**: `={{ $json.data.messageSuggestion }}` (message de M.A.X.)
   - **Credentials**: Sélectionner `Twilio MaCréa`
3. Cliquer sur **"Save"** en haut à droite

## Étape 4: Activer le workflow

1. Basculer le switch en haut à droite sur **"Active"**
2. Le webhook devient accessible sur: `http://127.0.0.1:5678/webhook/wf-relance-j3-whatsapp`

## Étape 5: Ajouter l'URL dans le .env de M.A.X.

Ajouter cette ligne dans le fichier `.env`:

```bash
N8N_WEBHOOK_RELANCE_J3_WHATSAPP=http://127.0.0.1:5678/webhook/wf-relance-j3-whatsapp
```

## Étape 6: Mettre à jour le service n8n

Modifier `max_backend/services/n8n.js` pour ajouter le nouveau workflow:

```javascript
const MAP = {
  'wf-relance-j3': process.env.N8N_WEBHOOK_RELANCE_J3,
  'wf-relance-j3-whatsapp': process.env.N8N_WEBHOOK_RELANCE_J3_WHATSAPP, // NOUVEAU
  'wf-tag-chaud': process.env.N8N_WEBHOOK_TAG_CHAUD,
  'wf-nettoyage': process.env.N8N_WEBHOOK_NETTOYAGE,
  'wf-newsletter-segment': process.env.N8N_WEBHOOK_NEWSLETTER_SEGMENT
};
```

## Étape 7: Tester l'envoi WhatsApp

Créer un script de test:

```javascript
// tools/test_whatsapp_send.js
import 'dotenv/config';
import { trigger } from '../services/n8n.js';

const result = await trigger({
  code: 'wf-relance-j3-whatsapp',
  payload: {
    leadId: 'test-123',
    leadPhone: '+33648662734', // TON numéro
    messageSuggestion: 'Test envoi WhatsApp depuis M.A.X. via n8n et Twilio! 🚀',
    canal: 'whatsapp'
  },
  tenant: 'macrea',
  role: 'assistant',
  mode: 'test'
});

console.log('✅ Message envoyé!', result);
```

Lancer: `node tools/test_whatsapp_send.js`

## Notes importantes

### Numéro sandbox Twilio
- Le numéro `+14155238886` est un **sandbox WhatsApp Twilio**
- Tu dois d'abord **rejoindre le sandbox** en envoyant un message WhatsApp avec un code
- Aller sur: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

### Format des numéros
- **Important**: Les numéros doivent être au format international: `+33648662734`
- M.A.X. devra formater les numéros correctement avant d'envoyer

### Templates WhatsApp (optionnel)
Si tu veux utiliser des **Content Templates** (comme dans ton exemple avec `contentSid`), il faut:
1. Créer le template dans Twilio
2. Modifier le node Twilio dans n8n pour utiliser `contentSid` au lieu de `message`

### Coûts
- **Sandbox**: Gratuit pour les tests
- **Production**: ~0.005$ par message WhatsApp envoyé via Twilio

## Workflow comparé

### Workflow TEST (actuel - actif)
```
Webhook → Wait 10s → Test Log
Path: /webhook/wf-relance-j3
```

### Workflow WHATSAPP (nouveau - à activer)
```
Webhook → Wait 10s → Twilio WhatsApp → Log Résultat
Path: /webhook/wf-relance-j3-whatsapp
```

Les deux peuvent coexister! M.A.X. peut choisir lequel utiliser selon le contexte.
