# ✅ Checklist MVP - Twilio WhatsApp + Cloudflare + M.A.X.

## 🎯 Objectif: WhatsApp → M.A.X. en 15 minutes

---

## Étape 1: Backend M.A.X. (2 min)

### ✅ Correction appliquée
- [x] Ajout `express.urlencoded()` dans [server.js:64](./max_backend/server.js#L64)
- [x] Support format Twilio `application/x-www-form-urlencoded`

### 🚀 Démarrer le backend
```powershell
cd d:\Macrea\CRM\max_backend
npm start
```

**Vérification**:
- Console affiche: `M.A.X. server P1 listening on http://127.0.0.1:3005`
- Aucune erreur au démarrage

---

## Étape 2: Test Local (3 min)

### Lancer le script de test
```powershell
cd d:\Macrea\CRM
.\test-twilio-webhook.ps1
```

**Résultats attendus**:
```
✅ TEST 1: Healthcheck Global (/api/ping)
✅ Backend M.A.X. répond!

✅ TEST 2: Healthcheck WhatsApp (/api/whatsapp/status)
✅ Webhook WhatsApp accessible!

✅ TEST 3: Simuler Webhook Twilio - Message Texte
✅ Webhook accepté!
   Status Code: 200

✅ TEST 4: Simuler Clic sur Bouton (ButtonPayload)
✅ Webhook bouton accepté!
```

Si **ÉCHEC** → Vérifier:
- [ ] Backend M.A.X. démarré?
- [ ] Cloudflare Tunnel actif? `cloudflared tunnel list`
- [ ] Ports bloqués? Firewall Windows?

---

## Étape 3: Configuration Cloudflare (5 min)

### A. Vérifier le Tunnel
```powershell
cloudflared tunnel list
```
**Attendu**: `max` avec status `ACTIVE`

### B. Tester DNS Public
```powershell
curl https://max.studiomacrea.cloud/api/ping
```
**Attendu**: `{"ok":true,"pong":true}`

### C. ⚠️ IMPORTANT - Cloudflare Access

**Si vous avez configuré Cloudflare Access (authentification):**

1. Aller sur: Cloudflare Dashboard → Zero Trust → Access → Applications
2. Chercher application qui protège `max.studiomacrea.cloud`
3. Ajouter une **Bypass rule**:
   - Path: `/api/whatsapp/*`
   - Action: **Bypass**
   - Apply to: **Everyone**

**Pourquoi?** Twilio n'a pas de JWT, il sera bloqué sinon.

---

## Étape 4: Configuration Twilio (3 min)

### Console Twilio WhatsApp
🔗 https://console.twilio.com/us1/develop/sms/settings/whatsapp-sender

### Configuration
1. Section: **Sandbox Settings** (ou **Phone Number Settings** si numéro prod)
2. Champ: **"When a message comes in"**
3. Valeur:
   ```
   https://max.studiomacrea.cloud/api/whatsapp/incoming
   ```
4. Méthode: **HTTP POST** ✅
5. **Save**

---

## Étape 5: Test Bout-en-Bout (2 min)

### A. Rejoindre le Sandbox Twilio
1. Voir numéro sandbox dans: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Envoyer depuis WhatsApp: `join <votre-code-sandbox>`

### B. Envoyer un message test
Envoyer au numéro sandbox:
```
Test M.A.X. via Cloudflare
```

### C. Vérifier les logs M.A.X.
**Dans le terminal où `npm start` tourne**:
```
================================================================================
📲 WEBHOOK WHATSAPP ENTRANT
================================================================================
📋 Données reçues:
   From: whatsapp:+336...
   Body: Test M.A.X. via Cloudflare

💬 MESSAGE TEXTE REÇU
   ⚠️  Aucun lead trouvé pour le numéro +336...
✅ Webhook traité avec succès
================================================================================
```

**Si ce log apparaît**: 🎉 **SUCCÈS TOTAL!**

---

## 🚨 Troubleshooting

### Twilio Debugger indique "11200: HTTP connection failure"
**Causes**:
- Backend M.A.X. pas démarré → `npm start` dans max_backend/
- Cloudflare Tunnel déconnecté → `cloudflared tunnel list`
- Cloudflare Access bloque → Vérifier bypass `/api/whatsapp/*`

**Solution**:
```powershell
# Vérifier tunnel
cloudflared tunnel list

# Tester healthcheck
curl https://max.studiomacrea.cloud/api/whatsapp/status
```

### Logs M.A.X.: `req.body` vide
**Cause**: Correction `express.urlencoded()` pas appliquée
**Solution**: Vérifier ligne 64 dans [server.js](./max_backend/server.js#L64)

### Lead non trouvé par téléphone
**Normal** si:
- Lead n'existe pas dans EspoCRM
- Format téléphone différent (ex: `0612345678` vs `+33612345678`)

**Pour tester avec un lead existant**:
1. Créer lead dans EspoCRM
2. Champ `phoneNumber`: mettre le numéro WhatsApp avec `+33` (format international)
3. Renvoyer message WhatsApp

---

## 📊 Architecture Validée

```
WhatsApp User (+336...)
    ↓
Twilio API
    ↓ POST https://max.studiomacrea.cloud/api/whatsapp/incoming
Cloudflare Tunnel (max)
    ↓
Backend M.A.X. Local (localhost:3005)
    ↓
/api/whatsapp/incoming
    ↓ req.body = { From, To, Body, MessageSid }
handleTextMessage()
    ↓
findLeadByPhone(+336...)
    ↓
EspoCRM API
    ↓
createWhatsAppNote() ou executeWhatsAppAction()
```

---

## 🎉 Critères de Succès

- [x] `curl https://max.studiomacrea.cloud/api/ping` → 200 OK
- [x] `curl https://max.studiomacrea.cloud/api/whatsapp/status` → 200 OK
- [x] Script PowerShell `test-twilio-webhook.ps1` → Tous tests passent
- [x] Message WhatsApp réel → Logs apparaissent dans M.A.X.
- [x] Twilio Debugger → Webhook reçoit 200 OK (pas 11200 error)

**Si TOUS cochés** → 🚀 **Production Ready!**

---

## 📝 Documentation

- **Guide complet**: [CLOUDFLARE_TWILIO_SETUP.md](./CLOUDFLARE_TWILIO_SETUP.md)
- **Code webhook**: [max_backend/routes/whatsapp-webhook.js](./max_backend/routes/whatsapp-webhook.js)
- **Twilio Debugger**: https://console.twilio.com/us1/monitor/debugger

---

**Créé**: 24 décembre 2025
**Status**: ✅ Prêt pour test MVP
**Temps total**: ~15 minutes