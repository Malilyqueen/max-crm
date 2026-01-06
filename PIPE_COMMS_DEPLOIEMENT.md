# 🚀 PIPE COMMS - Déploiement Production (Stack Court Terme)

**Date**: 2026-01-06
**Stack**: Green-API WhatsApp + Twilio SMS + SMTP OVH Email (send-only)
**Objectif**: Pipe comms production testable

---

## 📋 RÉCAPITULATIF DES FICHIERS CRÉÉS

### Webhooks & Routes Backend

| Fichier | Description | Statut |
|---------|-------------|--------|
| `routes/greenapi-webhook.js` | Webhook entrant Green-API WhatsApp | ✅ Créé |
| `routes/twilio-sms-webhook.js` | Webhook entrant + status Twilio SMS | ✅ Créé |
| `lib/messageEventLogger.js` | Persistence events (DB/JSON) | ✅ Créé + Fixé |
| `server.js` | Routes montées (lignes 78-79, 150-151) | ✅ Modifié |

### Infrastructure

| Fichier | Description | Statut |
|---------|-------------|--------|
| `scripts/create-message-events-table.sql` | Schéma SQL Supabase | ✅ **PRÊT** (mot réservé corrigé) |
| `nginx-twilio-sms-route.conf` | Routes nginx SMS | ⚠️ **À AJOUTER** |

### Tests E2E

| Fichier | Canal | Durée | Prérequis |
|---------|-------|-------|-----------|
| `TEST_E2E_GREENAPI_WHATSAPP.sh` | WhatsApp (Green-API) | ~15s | Instance Green-API |
| `TEST_E2E_TWILIO_SMS.ps1` | SMS (Twilio) | ~15s | Compte Twilio |
| `TEST_E2E_SMTP_EMAIL.sh` | Email (SMTP OVH) | ~10s | JWT token |

---

## 🎯 ÉTAPES DE DÉPLOIEMENT

### P0 - CRITIQUE (À faire maintenant)

#### 1. Créer la table `message_events` dans Supabase

```bash
# Connexion Supabase SQL Editor
# https://supabase.com/dashboard/project/YOUR_PROJECT/sql

# Exécuter le fichier:
cat scripts/create-message-events-table.sql
# Copier/coller dans SQL Editor → Run
```

**Validation**:
```sql
-- Vérifier table créée
SELECT * FROM message_events LIMIT 1;

-- Vérifier indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'message_events';
```

#### 2. Déployer le code backend sur le serveur

```bash
# Copier les nouveaux fichiers
scp -r max_backend/routes/greenapi-webhook.js root@51.159.170.20:/opt/max-infrastructure/max-backend/routes/
scp -r max_backend/routes/twilio-sms-webhook.js root@51.159.170.20:/opt/max-infrastructure/max-backend/routes/
scp -r max_backend/lib/messageEventLogger.js root@51.159.170.20:/opt/max-infrastructure/max-backend/lib/
scp max_backend/server.js root@51.159.170.20:/opt/max-infrastructure/max-backend/server.js

# Redémarrer le backend
ssh root@51.159.170.20 "cd /opt/max-infrastructure && docker compose restart max-backend"

# Vérifier logs démarrage
ssh root@51.159.170.20 "docker logs max-backend --tail 50"
```

**Validation**:
```bash
# Vérifier routes montées
ssh root@51.159.170.20 "docker logs max-backend --tail 100 | grep -E 'webhook|route'"
```

#### 3. Ajouter routes nginx pour Twilio SMS

```bash
# Éditer le fichier nginx
ssh root@51.159.170.20 "vi /opt/max-infrastructure/nginx/conf.d/api.conf"
```

**Contenu à ajouter** (avant la section `location /`):

```nginx
# Webhook Twilio SMS - Messages entrants
location /webhooks/twilio-sms/incoming {
    limit_req zone=webhook_limit burst=50 nodelay;
    proxy_pass http://max_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Connection "";
    proxy_read_timeout 60s;
    proxy_connect_timeout 10s;
}

# Webhook Twilio SMS - Status callbacks
location /webhooks/twilio-sms/status {
    limit_req zone=webhook_limit burst=50 nodelay;
    proxy_pass http://max_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Connection "";
    proxy_read_timeout 60s;
    proxy_connect_timeout 10s;
}
```

**Test config**:
```bash
ssh root@51.159.170.20 "docker exec nginx nginx -t"
```

**Recharger nginx**:
```bash
ssh root@51.159.170.20 "docker exec nginx nginx -s reload"
```

#### 4. Vérifier Cloudflare Access ne bloque PAS les webhooks

**Dashboard Cloudflare** → Zero Trust → Access → Applications

**Vérifier**:
- `/webhooks/greenapi` → ✅ Bypass Access (déjà configuré normalement)
- `/webhooks/twilio-sms/*` → ⚠️ **À AJOUTER si besoin**

**Si pas de règle Bypass**:
1. Create Application
2. Name: "Webhooks Externes"
3. Subdomain: `max-api`
4. Path: `/webhooks/*`
5. Action: **Bypass** (pas "Allow")

#### 5. Configurer variables .env (optionnel mais recommandé)

```bash
ssh root@51.159.170.20 "vi /opt/max-infrastructure/.env"
```

**Ajouter/vérifier**:
```env
# Persistence events (mode JSON par défaut)
MESSAGE_EVENT_PERSISTENCE=json
MESSAGE_EVENT_LOGS_DIR=./logs/message_events

# Pour activer Supabase (si préféré):
# MESSAGE_EVENT_PERSISTENCE=supabase

# Green-API (déplacer du code vers .env)
GREEN_API_INSTANCE_ID=7105440259
GREEN_API_TOKEN=YOUR_TOKEN_HERE

# Twilio SMS (si pas déjà présent)
TWILIO_SMS_FROM=+14155238886
```

**Redémarrer après modification**:
```bash
ssh root@51.159.170.20 "cd /opt/max-infrastructure && docker compose restart max-backend"
```

---

## 🧪 TESTS DE VALIDATION

### Test 1: Webhook Green-API WhatsApp

```bash
chmod +x TEST_E2E_GREENAPI_WHATSAPP.sh

# ⚠️ Éditer le fichier avant:
# - GREEN_API_TOKEN=xxx (ligne 28)
# - TEST_PHONE=+33... (ligne 29)

./TEST_E2E_GREENAPI_WHATSAPP.sh
```

**Critères OK**:
- ✅ HTTP 200 pour GET /webhooks/greenapi/status
- ✅ Message envoyé via Green-API (idMessage retourné)
- ✅ Webhook POST traité (HTTP 200)
- ✅ Event visible dans logs backend
- ✅ Event persisté (JSON ou DB)

### Test 2: Webhook Twilio SMS

```powershell
# PowerShell Windows
.\TEST_E2E_TWILIO_SMS.ps1
```

**Critères OK**:
- ✅ HTTP 200 pour GET /webhooks/twilio-sms/status-check
- ✅ SMS envoyé via Twilio (MessageSid retourné)
- ✅ Webhook status traité (HTTP 200)
- ✅ Event visible dans logs backend
- ✅ Event persisté (JSON ou DB)

### Test 3: Email SMTP OVH

```bash
chmod +x TEST_E2E_SMTP_EMAIL.sh

# ⚠️ Éditer le fichier avant:
# - JWT_TOKEN=xxx (ligne 27)
# - TEST_EMAIL=xxx@example.com (ligne 28)

./TEST_E2E_SMTP_EMAIL.sh
```

**Critères OK**:
- ✅ HTTP 200 + success: true
- ✅ MessageId provider retourné
- ✅ Email reçu dans boîte test (< 2 min)
- ✅ From = contact@malalacrea.fr
- ✅ Pas dans spam

---

## 📊 VÉRIFICATIONS POST-DÉPLOIEMENT

### 1. Endpoints Accessibles

```bash
# Green-API webhook
curl https://max-api.studiomacrea.cloud/webhooks/greenapi/status
# Attendu: {"ok":true,"service":"greenapi-webhook",...}

# Twilio SMS webhook
curl https://max-api.studiomacrea.cloud/webhooks/twilio-sms/status-check
# Attendu: {"ok":true,"service":"twilio-sms-webhook",...}
```

### 2. Persistence Events

**Mode JSON** (par défaut):
```bash
ssh root@51.159.170.20 "ls -lh /opt/max-infrastructure/max-backend/logs/message_events/"
# Attendu: Fichiers message_events_2026-01-06.json
```

**Mode Supabase**:
```sql
SELECT COUNT(*) FROM message_events;
-- Attendu: Nombre > 0 après tests
```

### 3. Logs Backend

```bash
ssh root@51.159.170.20 "docker logs max-backend --tail 200 | grep -E 'WEBHOOK|MESSAGE EVENT'"
```

**Logs attendus**:
```
📲 WEBHOOK GREEN-API ENTRANT
💬 📱 [RECEIVED] {channel: whatsapp, provider: greenapi, leadId: xxx...}
📝 Event evt_xxx ajouté au cache (1/100)
```

### 4. Corrélation Lead

**Tester avec numéro connu dans CRM**:
```bash
# Envoyer message WhatsApp à un lead existant
# Observer logs: "👤 Lead trouvé: Jean Dupont (ID: 691b2816e43817b92)"
```

---

## 📈 MÉTRIQUES DE SUCCÈS

| Canal | Critère | Cible | Méthode Vérification |
|-------|---------|-------|----------------------|
| **WhatsApp Green-API** | Webhook accessible | HTTP 200 | `curl .../webhooks/greenapi/status` |
| | Event persisté | 100% | Logs JSON ou DB |
| | Lead corrélé | 80%+ | Logs backend "Lead trouvé" |
| **SMS Twilio** | Webhook accessible | HTTP 200 | `curl .../webhooks/twilio-sms/status-check` |
| | Event persisté | 100% | Logs JSON ou DB |
| | Lead corrélé | 80%+ | Logs backend "Lead trouvé" |
| **Email SMTP** | Envoi réussi | 95%+ | Action sendEmail success: true |
| | Réception effective | 90%+ | Vérification manuelle boîte email |
| | Tracking CRM | 100% | Table Email dans EspoCRM |

---

## 🔧 TROUBLESHOOTING

| Symptôme | Cause Probable | Fix |
|----------|---------------|-----|
| **Webhook 404 Not Found** | Route nginx manquante | Ajouter config nginx + reload |
| **Webhook 403 Forbidden** | Cloudflare Access bloque | Bypass `/webhooks/*` dans Cloudflare |
| **Webhook 502 Bad Gateway** | Backend down ou crashé | `docker compose restart max-backend` |
| **Event pas persisté (JSON)** | Répertoire logs inexistant | `mkdir -p logs/message_events` |
| **Event pas persisté (DB)** | Table message_events absente | Exécuter `create-message-events-table.sql` |
| **Lead non corrélé** | Numéro format différent | Normalisation auto (déjà implémentée) |
| **Email non reçu** | Credentials SMTP invalides | Vérifier .env SMTP_USER/PASSWORD |
| **SMS échec Twilio** | Numéro From non vérifié | Vérifier Twilio Dashboard → Phone Numbers |

---

## 🔄 CONFIGURATION PROVIDERS

### Green-API (WhatsApp)

**Dashboard**: https://console.green-api.com

1. **Configurer webhook URL**:
   - Settings → Webhooks
   - Add URL: `https://max-api.studiomacrea.cloud/webhooks/greenapi`
   - Events: Tous (incomingMessageReceived, outgoingMessageStatus, etc.)

2. **Vérifier instance autorisée**:
   - Status doit être "authorized" (QR code scanné)

### Twilio (SMS)

**Dashboard**: https://console.twilio.com

1. **Configurer Messaging Service → Status Callbacks**:
   - POST URL: `https://max-api.studiomacrea.cloud/webhooks/twilio-sms/status`

2. **Configurer Incoming Messages**:
   - Phone Numbers → Votre numéro → Configure
   - A Message Comes In: Webhook
   - URL: `https://max-api.studiomacrea.cloud/webhooks/twilio-sms/incoming`
   - Method: HTTP POST

### SMTP OVH (Email)

**Aucune config webhook** (send-only)

Credentials déjà configurés dans `.env`:
```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_USER=contact@malalacrea.fr
SMTP_PASSWORD=12Victoire!
```

---

## ✅ CHECKLIST FINALE

Avant de considérer le déploiement terminé:

- [ ] Table `message_events` créée dans Supabase
- [ ] Code backend déployé (`routes/`, `lib/`, `server.js`)
- [ ] Routes nginx ajoutées (Twilio SMS)
- [ ] Nginx rechargé sans erreur (`nginx -t` OK)
- [ ] Cloudflare Access bypass configuré
- [ ] Variables .env ajoutées/vérifiées
- [ ] Backend redémarré et logs OK
- [ ] Test 1 (WhatsApp Green-API) : ✅ PASS
- [ ] Test 2 (SMS Twilio) : ✅ PASS
- [ ] Test 3 (Email SMTP) : ✅ PASS
- [ ] Events persistés (JSON ou DB) vérifiés
- [ ] Corrélation Lead testée et fonctionnelle

---

**Status Déploiement**: ⬜ EN COURS

**Déployé par**: _________________

**Date déploiement**: _________________

**Tests validés**: ___ / 3

**Niveau de confiance production**: ____%