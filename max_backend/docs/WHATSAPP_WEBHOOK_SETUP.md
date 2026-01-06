# Configuration du Webhook Entrant WhatsApp

## Vue d'ensemble

Le webhook entrant WhatsApp permet à M.A.X. de recevoir:
- Les clics sur les boutons des templates (Confirm/Cancel)
- Les messages textes libres des utilisateurs
- Les statuts de livraison (delivered, read, failed...)

## Architecture

```
WhatsApp User → Twilio → Webhook M.A.X. → Parse payload → Route par tenant → Update EspoCRM
```

## Routes créées

### POST `/api/whatsapp/incoming`
Endpoint principal qui reçoit tous les webhooks Twilio WhatsApp.

**Gère 4 types de webhooks:**
1. **Clic sur bouton** (ButtonPayload présent)
2. **Message texte** (Body présent)
3. **Statut de livraison** (MessageStatus présent)
4. **Média** (NumMedia > 0)

### GET `/api/whatsapp/status`
Endpoint de santé pour vérifier que le webhook est accessible.

**Exemple de réponse:**
```json
{
  "status": "ok",
  "service": "whatsapp-webhook",
  "timestamp": "2025-12-03T14:17:09.559Z"
}
```

## Tester le webhook localement

### 1. Vérifier que M.A.X. tourne
```bash
curl http://localhost:3005/api/whatsapp/status
```

### 2. Lancer le script de test
```bash
cd d:\Macrea\CRM\max_backend
node tools/test_whatsapp_webhook.js
```

Ce script teste:
- ✅ Clic bouton "Confirm"
- ✅ Clic bouton "Cancel"
- ✅ Message texte libre
- ✅ Statut de livraison
- ✅ Endpoint de santé

## Configurer Twilio en production

### Option 1: Utiliser ngrok (développement)

1. Installer ngrok: https://ngrok.com/download

2. Lancer ngrok:
```bash
ngrok http 3005
```

3. Copier l'URL générée (ex: `https://abc123.ngrok.io`)

4. Aller dans Twilio Console:
   https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox

5. Configurer "WHEN A MESSAGE COMES IN":
   ```
   https://abc123.ngrok.io/api/whatsapp/incoming
   ```

6. Méthode: **POST**

7. Cliquer sur **Save**

### Option 2: Déployer M.A.X. en production

1. Déployer M.A.X. sur un serveur avec une URL publique

2. Configurer le webhook dans Twilio avec votre URL:
   ```
   https://your-domain.com/api/whatsapp/incoming
   ```

## Format des payloads reçus

### Clic sur bouton
```json
{
  "MessageSid": "SM...",
  "From": "whatsapp:+33648662734",
  "To": "whatsapp:+14155238886",
  "Body": "Confirm",
  "ButtonPayload": "confirm|tenant=macrea|contact=lead-abc123|type=appointment"
}
```

**Le ButtonPayload est parsé pour extraire:**
- `action`: confirm, cancel, etc.
- `tenant`: macrea, autre-client, etc.
- `contact`: ID du lead/contact dans EspoCRM
- `type`: appointment, newsletter, etc.

### Message texte libre
```json
{
  "MessageSid": "SM...",
  "From": "whatsapp:+33648662734",
  "To": "whatsapp:+14155238886",
  "Body": "Bonjour, je voudrais plus d'informations"
}
```

### Statut de livraison
```json
{
  "MessageSid": "SM...",
  "MessageStatus": "delivered",
  "From": "whatsapp:+14155238886",
  "To": "whatsapp:+33648662734"
}
```

**Statuts possibles:**
- `sent`: Envoyé à Twilio
- `delivered`: Livré à WhatsApp
- `read`: Lu par l'utilisateur
- `failed`: Échec d'envoi
- `undelivered`: Non livré

## Traitement par type d'action

### Action "confirm"
```javascript
// Met à jour le lead dans EspoCRM
status: 'Appointment Confirmed'
description: 'Rendez-vous confirmé via WhatsApp le ...'
```

### Action "cancel"
```javascript
// Met à jour le lead dans EspoCRM
status: 'Cancelled'
description: 'Rendez-vous annulé via WhatsApp le ...'
```

### Message texte
```javascript
// TODO: Créer une note/tâche dans EspoCRM
// TODO: Notifier M.A.X. pour ce tenant
```

## Multitenant

Le webhook extrait automatiquement le `tenantId` du `ButtonPayload`:

```
ButtonPayload: "confirm|tenant=macrea|contact=lead-123|type=appointment"
                           ^^^^^^^^^^^^^^
```

Cela permet de router la réponse vers le bon tenant et de mettre à jour le bon CRM.

## Sécurité

### TODO: Valider les webhooks Twilio

Twilio signe chaque webhook avec un header `X-Twilio-Signature`. Il est recommandé de valider cette signature pour s'assurer que le webhook vient bien de Twilio.

**Exemple de validation:**
```javascript
import { validateRequest } from 'twilio';

const isValid = validateRequest(
  process.env.TWILIO_AUTH_TOKEN,
  req.headers['x-twilio-signature'],
  'https://your-domain.com/api/whatsapp/incoming',
  req.body
);

if (!isValid) {
  return res.status(403).json({ error: 'Invalid signature' });
}
```

## Logs et monitoring

Le webhook log automatiquement:
- Tous les webhooks reçus (type, From, To, Body, ButtonPayload)
- Les actions détectées (confirm, cancel, etc.)
- Les erreurs de parsing ou de traitement

**Exemple de log:**
```
================================================================================
📲 WEBHOOK WHATSAPP ENTRANT
================================================================================
📋 Données reçues:
   From: whatsapp:+33648662734
   To: whatsapp:+14155238886
   Body: Confirm
   ButtonPayload: confirm|tenant=macrea|contact=lead-abc123|type=appointment
   MessageStatus: N/A
   MessageSid: SM1764771426391

🔘 CLIC SUR BOUTON DÉTECTÉ
📦 Payload parsé: {
  action: 'confirm',
  tenant: 'macrea',
  contact: 'lead-abc123',
  type: 'appointment'
}

🎯 Action: confirm
   Tenant: macrea
   Contact: lead-abc123
   Type: appointment
   Phone: +33648662734

💾 Mise à jour EspoCRM (Tenant: macrea)
   ✅ Rendez-vous CONFIRMÉ pour lead-abc123

✅ Webhook traité avec succès
================================================================================
```

## Prochaines étapes

1. ✅ Structure de données des templates (FAIT - config/whatsapp-templates.js)
2. ✅ Webhook entrant (FAIT - routes/whatsapp-webhook.js)
3. 🔜 Modifier le workflow n8n pour envoyer des templates avec boutons
4. 🔜 Ajouter l'outil `send_whatsapp_template` à M.A.X.
5. 🔜 Implémenter la mise à jour EspoCRM dans handleButtonClick()
6. 🔜 Implémenter la notification M.A.X. pour les messages entrants
7. 🔜 Ajouter la validation de signature Twilio
