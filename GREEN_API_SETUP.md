# 📱 Setup Green-API WhatsApp - M.A.X.

Guide complet pour configurer et tester l'intégration Green-API WhatsApp

---

## 🎯 Architecture

```
Frontend React (ConnectWhatsApp.jsx)
    ↓
Backend M.A.X. (/api/wa/instance/*)
    ↓
Provider Green-API (HTTP direct, pas de SDK)
    ↓
Green-API Cloud
    ↓
WhatsApp Business
```

---

## 📋 Prérequis

### 1. Compte Green-API

1. Créer un compte sur https://green-api.com/
2. Créer une instance WhatsApp depuis le dashboard
3. Noter:
   - **`idInstance`** (ex: `7103123456`)
   - **`apiTokenInstance`** (ex: `abc123def456...`)

### 2. Variables d'Environnement

Ajouter dans `max_backend/.env`:

```env
# Green-API
GREENAPI_BASE_URL=https://api.green-api.com
```

---

## 🚀 Démarrage

### Backend

```powershell
cd d:\Macrea\CRM\max_backend
npm start
```

**Vérifications**:
- Console affiche: `M.A.X. server P1 listening on http://127.0.0.1:3005`
- Aucune erreur au démarrage

### Frontend

```powershell
cd d:\Macrea\CRM\max_frontend
npm run dev
```

**URL**: http://localhost:5173

---

## 🧪 Tests Backend (via curl)

### 1. Créer/Enregistrer une Instance

```powershell
curl -X POST http://localhost:3005/api/wa/instance/create `
  -H "Content-Type: application/json" `
  -d '{
    "idInstance": "7103123456",
    "apiTokenInstance": "abc123def456",
    "tenant": "macrea"
  }'
```

**Réponse attendue**:
```json
{
  "ok": true,
  "instance": {
    "instanceId": "7103123456",
    "status": "notAuthorized",
    "provider": "greenapi",
    "tenant": "macrea"
  }
}
```

---

### 2. Récupérer le QR Code

```powershell
curl "http://localhost:3005/api/wa/instance/7103123456/qr?apiToken=abc123def456"
```

**Réponse attendue**:
```json
{
  "ok": true,
  "qr": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "type": "qrCode",
    "expiresIn": 45000
  }
}
```

**Décoder le QR**: Copier l'URL `data:image/png;base64,...` dans un navigateur pour voir le QR.

---

### 3. Vérifier le Statut

```powershell
curl "http://localhost:3005/api/wa/instance/7103123456/status?apiToken=abc123def456"
```

**Réponses possibles**:

**Avant scan**:
```json
{
  "ok": true,
  "status": {
    "state": "notAuthorized",
    "isAuthorized": false
  }
}
```

**Après scan**:
```json
{
  "ok": true,
  "status": {
    "state": "authorized",
    "isAuthorized": true
  }
}
```

---

### 4. Rafraîchir le QR Code

```powershell
curl -X POST http://localhost:3005/api/wa/instance/7103123456/refresh-qr `
  -H "Content-Type: application/json" `
  -d '{"apiTokenInstance": "abc123def456"}'
```

---

### 5. Envoyer un Message de Test

```powershell
curl -X POST http://localhost:3005/api/wa/instance/7103123456/send-test `
  -H "Content-Type: application/json" `
  -d '{
    "apiTokenInstance": "abc123def456",
    "phoneNumber": "33612345678",
    "message": "Test depuis M.A.X.!"
  }'
```

**Note**: Le numéro doit être au format international (sans `+`).

---

## 🎨 Tests Frontend

### 1. Accéder à la Page

URL: http://localhost:5173/connect-whatsapp

**Ou ajouter une route dans le routeur React**:

`max_frontend/src/App.jsx` (ou votre fichier de routes):

```jsx
import ConnectWhatsApp from './pages/ConnectWhatsApp';

// Dans vos routes:
<Route path="/connect-whatsapp" element={<ConnectWhatsApp />} />
```

---

### 2. Workflow Utilisateur

1. **Entrer les credentials**:
   - Instance ID: `7103123456`
   - API Token: `abc123def456...`

2. **Cliquer "Créer / Afficher QR Code"**

3. **Scanner le QR** avec WhatsApp:
   - Ouvrir WhatsApp sur mobile
   - WhatsApp Web → Scanner QR Code
   - Scanner le QR affiché

4. **Attendre la confirmation**:
   - Le statut passe automatiquement à "✅ WhatsApp Connecté!"
   - Polling toutes les 3 secondes

5. **Tester l'envoi**:
   - Cliquer "📤 Envoyer un Message de Test"
   - Entrer un numéro (format: `33612345678`)
   - Vérifier réception sur WhatsApp

---

## 📂 Structure des Fichiers

```
max_backend/
├── providers/greenapi/
│   ├── greenapi.config.js    # Configuration (timeouts, retry, etc.)
│   ├── greenapi.client.js    # Client HTTP bas niveau (fetch)
│   └── greenapi.service.js   # Fonctions métier (createInstance, getQr, etc.)
├── routes/
│   └── wa-instance.js        # Routes API /api/wa/instance/*
├── lib/
│   └── waInstanceStorage.js  # Stockage JSON (MVP)
└── data/
    └── wa-instances.json     # Données instances (gitignored)

max_frontend/
└── src/pages/
    └── ConnectWhatsApp.jsx   # Page React avec QR + polling
```

---

## 🔍 Debugging

### Logs Backend

Tous les appels Green-API sont loggés dans la console:

```
[GREEN-API] 📤 GET /waInstance7103123456/qr/abc123def456
[GREEN-API] ✅ Success: { type: 'qrCode', message: '...' }
```

### Logs Frontend

Ouvrir la console navigateur (F12) pour voir les appels API et le polling:

```
[POLLING] Statut actuel: notAuthorized
[POLLING] Statut actuel: authorized ✅
```

### Fichier Storage

Vérifier les instances enregistrées:

```powershell
cat max_backend/data/wa-instances.json
```

**Exemple**:
```json
[
  {
    "instanceId": "7103123456",
    "apiToken": "abc123def456",
    "tenant": "macrea",
    "status": "authorized",
    "provider": "greenapi",
    "createdAt": "2025-12-24T14:30:00.000Z",
    "updatedAt": "2025-12-24T14:31:00.000Z",
    "authorizedAt": "2025-12-24T14:31:00.000Z"
  }
]
```

---

## 🚨 Troubleshooting

### Erreur: "Green-API timeout"

**Cause**: L'API Green-API ne répond pas dans les délais

**Solution**:
1. Vérifier que l'instance existe sur https://green-api.com/
2. Vérifier les credentials (`idInstance` + `apiToken`)
3. Augmenter le timeout dans `greenapi.config.js`:
   ```js
   timeouts: {
     getQrCode: 20000  // 20s au lieu de 10s
   }
   ```

---

### Erreur: "MISSING_API_TOKEN"

**Cause**: Le token n'est pas passé dans les query params

**Solution**: Utiliser `?apiToken=xxx` dans l'URL:
```
/api/wa/instance/7103123456/qr?apiToken=abc123def456
```

---

### QR Code ne s'affiche pas

**Cause**: Le format de réponse Green-API diffère de l'attendu

**Solution**: Vérifier les logs backend pour voir la réponse exacte:
```
[GREEN-API] ✅ Success: { ... }
```

Adapter dans `greenapi.service.js`:
```js
return {
  qrCode: response.message || response.qrCode || response.data,
  ...
};
```

---

### Le polling ne s'arrête pas après scan

**Cause**: Le statut `authorized` n'est pas détecté

**Solution**: Vérifier la comparaison dans `ConnectWhatsApp.jsx`:
```jsx
if (data.status.isAuthorized) {
  stopPolling();
}
```

---

## 📈 Prochaines Étapes

### Phase 2: Webhook Entrant

Recevoir les messages entrants depuis WhatsApp:

1. Configurer webhook Green-API → `https://max.studiomacrea.cloud/api/wa/incoming`
2. Créer route `/api/wa/incoming` (similaire à `/api/whatsapp/incoming` Twilio)
3. Parser le format Green-API
4. Lier aux leads EspoCRM

### Phase 3: Templates & Scénarios

1. Créer templates de messages
2. Intégrer scénarios M.A.X. (confirmation RDV, etc.)
3. Switch `provider: 'twilio' | 'greenapi'` dans le code

### Phase 4: Migration DB

Remplacer `wa-instances.json` par stockage EspoCRM/PostgreSQL

---

## ✅ Critères de Succès

- [ ] Backend démarré sans erreur
- [ ] `/api/wa/instance/create` retourne 200 OK
- [ ] `/api/wa/instance/:id/qr` retourne QR base64
- [ ] QR scanné → statut passe à `authorized`
- [ ] Message de test envoyé et reçu
- [ ] Frontend affiche QR + polling fonctionne
- [ ] Commit Git sur branche `feature/greenapi`

---

**Créé**: 24 décembre 2025
**Auteur**: Claude Sonnet 4.5 + M.A.X. CTO
**Branche**: `feature/greenapi`
