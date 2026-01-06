# 🧪 Tests Production - Pipe Communications

## 📋 Vue d'ensemble

Ce dossier contient **3 scripts de test** pour valider le système de communication (EMAIL + WhatsApp + SMS) en production.

| # | Script | Canal | Durée | Prérequis |
|---|--------|-------|-------|-----------|
| 1 | `test-prod-webhook-greenapi.sh` | WhatsApp (Green-API) | ~5s | Aucun |
| 2 | `test-prod-email-send.ps1` | Email (SMTP) | ~10s | JWT token |
| 3 | `test-prod-whatsapp-e2e.sh` | WhatsApp (Twilio) | ~15s | JWT token |

**Serveur testé**: https://max-api.studiomacrea.cloud (51.159.170.20)

---

## 🚀 Exécution Rapide

### Test 1: Webhook Green-API (Bash/Linux/Mac)

```bash
cd /path/to/CRM
chmod +x test-prod-webhook-greenapi.sh
./test-prod-webhook-greenapi.sh
```

**Windows (Git Bash)**:
```bash
bash test-prod-webhook-greenapi.sh
```

**Résultat attendu**: ✅ HTTP 200 OK

---

### Test 2: Email SMTP (PowerShell/Windows)

```powershell
cd D:\Macrea\CRM
.\test-prod-email-send.ps1
```

**Linux/Mac (avec PowerShell Core)**:
```bash
pwsh test-prod-email-send.ps1
```

**⚠️ IMPORTANT**: Modifier le script avant exécution:
```powershell
# Ligne 17: Remplacer par vraie adresse email de test
$TEST_EMAIL = "votre-email@example.com"

# Ligne 21: Remplacer par vrai JWT token
$JWT_TOKEN = "eyJhbGc..."  # Obtenir via /api/auth/login
```

**Résultat attendu**: ✅ Email reçu dans la boîte test

---

### Test 3: WhatsApp Twilio E2E (Bash/Linux/Mac)

```bash
cd /path/to/CRM
chmod +x test-prod-whatsapp-e2e.sh
./test-prod-whatsapp-e2e.sh
```

**Windows (Git Bash)**:
```bash
bash test-prod-whatsapp-e2e.sh
```

**⚠️ IMPORTANT**: Modifier le script avant exécution:
```bash
# Ligne 30: Remplacer par vraie adresse email de test
TEST_PHONE="+33648662734"  # Votre numéro WhatsApp vérifié Twilio

# Ligne 34: Remplacer par vrai JWT token
JWT_TOKEN="eyJhbGc..."  # Obtenir via /api/auth/login
```

**Résultat attendu**: ✅ Message Twilio envoyé + Webhook traité

---

## 🔑 Obtenir un JWT Token

**Méthode 1: curl (Linux/Mac/Git Bash)**
```bash
curl -X POST https://max-api.studiomacrea.cloud/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_PASSWORD"}' \
  | jq -r '.token'
```

**Méthode 2: PowerShell (Windows)**
```powershell
$response = Invoke-RestMethod `
  -Uri "https://max-api.studiomacrea.cloud/api/auth/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"username":"admin","password":"YOUR_PASSWORD"}'

$response.token
```

**Méthode 3: Postman**
1. POST `https://max-api.studiomacrea.cloud/api/auth/login`
2. Body (JSON): `{"username":"admin","password":"xxx"}`
3. Copier `response.token`

---

## 📊 Interprétation des Résultats

### ✅ TEST PASSÉ

Tous les indicateurs verts :
```
✅ TEST PASSÉ: [Description]
✓ [Composant 1]: OK
✓ [Composant 2]: OK
```

→ **Action**: Aucune, système fonctionnel

---

### ❌ TEST ÉCHOUÉ

Codes d'erreur HTTP courants :

| Code | Signification | Cause Probable | Solution Rapide |
|------|--------------|----------------|-----------------|
| **401** | Unauthorized | JWT token invalide/expiré | Se reconnecter |
| **403** | Forbidden | Cloudflare Access bloque | Bypass `/webhooks/*` |
| **404** | Not Found | Route nginx/backend manquante | Vérifier config |
| **500** | Server Error | Bug backend ou config | Consulter logs |
| **502/503** | Bad Gateway | Backend down | Redémarrer container |
| **504** | Timeout | Opération trop longue | Augmenter timeouts |

---

### ⚠️ TEST INCERTAIN

Warnings jaunes :
```
⚠️  TEST INCERTAIN: [Description]
```

→ **Action**: Vérifier manuellement les détails dans la sortie

---

## 🐛 Debugging

### Logs Backend (Max-Backend)

```bash
# Logs complets
ssh root@51.159.170.20 "docker logs max-backend --tail 100"

# Filtrer par canal
ssh root@51.159.170.20 "docker logs max-backend --tail 500 | grep -i whatsapp"
ssh root@51.159.170.20 "docker logs max-backend --tail 500 | grep -i email"
ssh root@51.159.170.20 "docker logs max-backend --tail 500 | grep -i webhook"

# Temps réel
ssh root@51.159.170.20 "docker logs max-backend --tail 50 -f"
```

### Logs Nginx

```bash
# Erreurs nginx
ssh root@51.159.170.20 "docker logs nginx --tail 100"

# Vérifier config
ssh root@51.159.170.20 "docker exec nginx nginx -t"

# Recharger config
ssh root@51.159.170.20 "docker exec nginx nginx -s reload"
```

### Twilio Dashboard

**Messages WhatsApp**:
https://console.twilio.com/us1/monitor/logs/messages

**Debugger** (errors):
https://console.twilio.com/us1/monitor/logs/debugger

**Webhooks** (callbacks):
https://console.twilio.com/us1/develop/sms/settings/geo-permissions

### Database (Supabase)

```sql
-- Vérifier messages WhatsApp loggués
SELECT *
FROM whatsapp_message_events
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;

-- Vérifier emails CRM
SELECT id, name, status, dateSent, parentType, parentId
FROM Email
WHERE dateSent > NOW() - INTERVAL '1 day'
ORDER BY dateSent DESC;
```

---

## 📈 Métriques de Succès

Après avoir exécuté les 3 tests, remplir ce tableau:

| Test | Résultat | HTTP Code | Temps Réponse | Notes |
|------|----------|-----------|---------------|-------|
| 1. Webhook Green-API | ⬜ PASS / ⬜ FAIL | ___ | ___ms | |
| 2. Email SMTP | ⬜ PASS / ⬜ FAIL | ___ | ___ms | Email reçu ? ⬜ |
| 3. WhatsApp Twilio | ⬜ PASS / ⬜ FAIL | ___ | ___ms | MessageSid: ____ |

**Taux de réussite**: ___/3 (___%)

**Niveau de confiance production**:
- 3/3 ✅ → 🟢 **Production Ready** (90%+)
- 2/3 ✅ → 🟡 **Partiellement Fonctionnel** (60-80%)
- 1/3 ✅ → 🟠 **Problèmes Critiques** (30-50%)
- 0/3 ✅ → 🔴 **Non Opérationnel** (<30%)

---

## 🔗 Documentation Complète

Pour le rapport d'audit détaillé avec diagnostic et fixes :
📄 **[AUDIT_PIPE_COMMS_PRODUCTION.md](./AUDIT_PIPE_COMMS_PRODUCTION.md)**

Contient :
- ✅ Analyse complète EMAIL, WhatsApp, SMS
- ✅ État de l'infrastructure (nginx, .env, logs)
- ✅ Tableau diagnostic : Symptôme → Cause → Fix (40+ cas)
- ✅ Plan d'action prioritaire (P0/P1/P2)
- ✅ Checklist déploiement production
- ✅ Métriques et objectifs

---

## 📞 Support

**En cas de problème bloquant** :

1. Consulter tableau diagnostic dans `AUDIT_PIPE_COMMS_PRODUCTION.md`
2. Vérifier logs backend/nginx
3. Tester endpoint health : `curl https://max-api.studiomacrea.cloud/api/health`
4. Redémarrer containers si nécessaire :
   ```bash
   ssh root@51.159.170.20 "cd /opt/max-infrastructure && docker compose restart max-backend"
   ```

**Contacts Twilio/Email** :
- Twilio Support: https://support.twilio.com
- OVH Support: https://www.ovh.com/fr/support/

---

**Créé le**: 2026-01-06
**Serveur**: max-api.studiomacrea.cloud (51.159.170.20)
**Auteur**: Claude Sonnet 4.5 (Audit Technique)