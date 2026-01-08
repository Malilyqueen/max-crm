# ✅ PHASE 2 EMAIL - CHECKLIST DÉPLOIEMENT PRODUCTION

**Date:** 2026-01-08
**Status:** Prêt pour déploiement
**Durée estimée:** 15 minutes

---

## PRÉ-REQUIS ✅

- [x] Code backend complet et testé
- [x] Code frontend complet et testé
- [x] 3 migrations SQL créées et corrigées
- [x] Erreur SQL syntax fix (apostrophe échappée)
- [x] Documentation complète
- [x] Architecture 3 modes verrouillée

---

## ÉTAPE 1: EXÉCUTION MIGRATIONS SQL (Supabase)

**Durée:** 5 minutes

### 1.1 - Accéder à Supabase SQL Editor

```
URL: https://supabase.com/dashboard/project/jcegkuyagbthpbklyawz
Menu: SQL Editor → New Query
```

### 1.2 - Exécuter Migration 010 (tenant_settings)

**Ordre:** DOIT être exécutée EN PREMIER (dépendance pour 011)

1. Ouvrir: `d:\Macrea\CRM\max_backend\migrations\010_tenant_settings.sql`
2. Copier TOUT le contenu
3. Coller dans Supabase SQL Editor
4. Cliquer **"Run"**
5. Vérifier: **"Success. No rows returned"**

**Vérification:**
```sql
-- Vérifier table créée
SELECT tablename FROM pg_tables
WHERE tablename = 'tenant_settings';

-- Vérifier colonnes
\d tenant_settings

-- Vérifier fonction helper
SELECT proname FROM pg_proc
WHERE proname = 'ensure_tenant_settings';
```

### 1.3 - Exécuter Migration 009 (tenant_email_domains)

**Ordre:** Peut être exécutée après 010

1. Ouvrir: `d:\Macrea\CRM\max_backend\migrations\009_tenant_email_domains.sql`
2. Copier-coller dans Supabase SQL Editor
3. Cliquer **"Run"**
4. Vérifier: **"Success. No rows returned"**

**Vérification:**
```sql
-- Vérifier table créée
SELECT tablename FROM pg_tables
WHERE tablename = 'tenant_email_domains';

-- Vérifier index
SELECT indexname FROM pg_indexes
WHERE tablename = 'tenant_email_domains';
```

### 1.4 - Exécuter Migration 011 (email_quota_usage)

**Ordre:** DOIT être exécutée EN DERNIER (dépend de 010)

1. Ouvrir: `d:\Macrea\CRM\max_backend\migrations\011_email_quota_usage.sql`
2. Copier-coller dans Supabase SQL Editor
3. Cliquer **"Run"**
4. Vérifier: **"Success. No rows returned"**

**Vérification:**
```sql
-- Vérifier table créée
SELECT tablename FROM pg_tables
WHERE tablename = 'email_quota_usage';

-- Vérifier fonctions quota
SELECT proname FROM pg_proc
WHERE proname LIKE '%email%quota%';

-- Test fonction quota (tenant fictif)
SELECT * FROM get_current_email_quota('test-deploy');
-- Doit retourner: emails_sent=0, quota_limit=1000, remaining=1000

-- Test incrémentation
SELECT increment_email_quota('test-deploy');
SELECT * FROM get_current_email_quota('test-deploy');
-- Doit retourner: emails_sent=1, quota_limit=1000, remaining=999
```

---

## ÉTAPE 2: MODIFICATION .ENV PRODUCTION

**Durée:** 2 minutes

### 2.1 - SSH vers serveur production

```bash
ssh root@51.159.170.20
cd /opt/max-infrastructure
```

### 2.2 - Changer MAILJET_FROM_EMAIL

```bash
# Backup .env actuel
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Changer contact@ → no-reply@
sed -i 's/^MAILJET_FROM_EMAIL=contact@/MAILJET_FROM_EMAIL=no-reply@/' .env

# Vérifier changement
grep MAILJET_FROM_EMAIL .env
```

**Résultat attendu:**
```
MAILJET_FROM_EMAIL=no-reply@malalacrea.fr
```

**Si le résultat contient encore "contact@":**
```bash
# Éditer manuellement
nano .env
# Changer la ligne MAILJET_FROM_EMAIL=contact@malalacrea.fr
# En: MAILJET_FROM_EMAIL=no-reply@malalacrea.fr
# Sauvegarder: Ctrl+O, Enter, Ctrl+X
```

---

## ÉTAPE 3: DÉPLOIEMENT BACKEND

**Durée:** 3 minutes

### 3.1 - Git commit + push (depuis local)

```bash
cd d:\Macrea\CRM\max_backend
git add .
git commit -m "feat(email): Architecture 3 modes complete - Phase 2 production ready"
git push
```

### 3.2 - Pull + restart backend (production)

```bash
ssh root@51.159.170.20
cd /opt/max-infrastructure

# Pull nouvelle image
docker compose pull max-backend

# Redémarrer service
docker compose restart max-backend

# Attendre 10 secondes
timeout /t 10

# Vérifier logs
docker compose logs max-backend --tail 50
```

**Logs attendus (succès):**
```
[Encryption] ✅ Clé de chiffrement valide (32 bytes)
[EMAIL_MODE] ✅ emailModeResolver.js chargé
[PostgreSQL] Connected to database
✅ Server running on port 3000
```

**Si erreur "CREDENTIALS_ENCRYPTION_KEY manquant":**
```bash
# Vérifier .env contient bien la clé
grep CREDENTIALS_ENCRYPTION_KEY .env

# Si manquant, ajouter (copier depuis .env.example)
nano .env
# Ajouter: CREDENTIALS_ENCRYPTION_KEY=<64 caractères hex>
# Redémarrer: docker compose restart max-backend
```

---

## ÉTAPE 4: DÉPLOIEMENT FRONTEND

**Durée:** 2 minutes

### 4.1 - Git commit + push (depuis local)

```bash
cd d:\Macrea\CRM\max_frontend
git add .
git commit -m "feat(email): UI 3 modes complete - Phase 2 production ready"
git push
```

### 4.2 - Vérifier auto-deploy Vercel

```bash
# Vercel détecte automatiquement le push
# Suivre déploiement: https://vercel.com/dashboard

# OU forcer redéploy:
npx vercel --prod
```

**Vérification:**
1. Ouvrir: https://max.studiomacrea.cloud/settings/integrations
2. Vérifier onglet **"Email"** visible
3. Vérifier panel bleu **"Email MaCréa activé (Par défaut)"**
4. Vérifier boutons:
   - "Utiliser mon domaine professionnel"
   - "Utiliser mes propres credentials"

---

## ÉTAPE 5: TESTS FONCTIONNELS

**Durée:** 5 minutes

### Test 1: Mode 1 (Default) - Email MaCréa

**Objectif:** Vérifier envoi email par défaut avec no-reply@

```sql
-- 1. Créer settings tenant test
INSERT INTO tenant_settings (tenant_id, email_reply_to, email_from_name)
VALUES ('test-mode1-deploy', 'jules@studiomacrea.cloud', 'Test Deploy')
ON CONFLICT (tenant_id) DO UPDATE
SET email_reply_to = 'jules@studiomacrea.cloud';
```

```bash
# 2. Envoyer email test via API (Postman, curl, ou UI)
curl -X POST https://api.max.studiomacrea.cloud/api/actions/execute \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: test-mode1-deploy" \
  -d '{
    "action": "sendEmail",
    "params": {
      "tenantId": "test-mode1-deploy",
      "to": "jules@studiomacrea.cloud",
      "subject": "Test Phase 2 - Mode 1 Default",
      "body": "<p>Email envoyé en mode default (no-reply@malalacrea.fr)</p>"
    }
  }'
```

**Logs backend attendus:**
```
[EMAIL_MODE] Résolution mode pour tenant: test-mode1-deploy
[EMAIL_MODE] ✅ Mode: DEFAULT
[Mailjet] Configuration: GLOBAL
   📧 FROM: no-reply@malalacrea.fr
   📧 REPLY-TO: jules@studiomacrea.cloud
✅ Email envoyé | MessageID: 123456789
```

**Vérification email reçu:**
- FROM: M.A.X. CRM <no-reply@malalacrea.fr>
- REPLY-TO: jules@studiomacrea.cloud
- Sujet: Test Phase 2 - Mode 1 Default

**Vérification quota incrémenté:**
```sql
SELECT * FROM get_current_email_quota('test-mode1-deploy');
-- emails_sent = 1
-- quota_limit = 1000
-- remaining = 999
-- percentage_used = 0.10
```

### Test 2: Mode 2 (Custom Domain) - Simulation

**Objectif:** Vérifier API DNS validation

```bash
# Demander validation domaine custom
curl -X POST https://api.max.studiomacrea.cloud/api/email/request-domain \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: test-mode2-deploy" \
  -d '{
    "domain": "test-restaurant.fr",
    "email": "contact@test-restaurant.fr"
  }'
```

**Réponse attendue:**
```json
{
  "success": true,
  "sender_id": 987654321,
  "status": "Pending",
  "dns_instructions": {
    "spf": "v=spf1 include:spf.mailjet.com ~all",
    "dkim": "Voir dashboard Mailjet pour la clé DKIM complète"
  }
}
```

**Vérification DB:**
```sql
SELECT * FROM tenant_email_domains
WHERE tenant_id = 'test-mode2-deploy';

-- Doit contenir:
-- email: contact@test-restaurant.fr
-- domain: test-restaurant.fr
-- dns_status: pending
-- mailjet_sender_id: 987654321
```

### Test 3: Mode 3 (Self-Service) - Via UI

**Objectif:** Vérifier création provider Mailjet custom

1. **Ouvrir:** https://max.studiomacrea.cloud/settings/integrations
2. **Cliquer:** "Utiliser mes propres credentials"
3. **Remplir formulaire:**
   - API Key: (clé Mailjet test)
   - API Secret: (secret Mailjet test)
   - From Email: test@malalacrea.fr
   - From Name: Test Self-Service
4. **Cliquer:** "Tester la connexion"
5. **Vérifier toast:** "✅ Test réussi - Connecté"
6. **Cliquer:** "Enregistrer"

**Vérification DB:**
```sql
SELECT
  id,
  tenant_id,
  provider_type,
  is_active,
  connection_status,
  created_at
FROM tenant_provider_configs
WHERE provider_type = 'mailjet'
ORDER BY created_at DESC
LIMIT 1;

-- Doit contenir:
-- provider_type: mailjet
-- is_active: true
-- connection_status: success
-- encrypted_config: (chiffré AES-256-GCM)
```

**Test envoi email Mode 3:**
```bash
# L'envoi devrait maintenant utiliser les credentials custom du tenant
curl -X POST https://api.max.studiomacrea.cloud/api/actions/execute \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: <tenant-id-du-test>" \
  -d '{
    "action": "sendEmail",
    "params": {
      "tenantId": "<tenant-id-du-test>",
      "to": "jules@studiomacrea.cloud",
      "subject": "Test Phase 2 - Mode 3 Self-Service",
      "body": "<p>Email envoyé via credentials custom du tenant</p>"
    }
  }'
```

**Logs attendus:**
```
[EMAIL_MODE] ✅ Mode: SELF_SERVICE
[Mailjet] Configuration: TENANT
   📧 API Key: abc123... (tenant custom)
```

---

## ÉTAPE 6: VÉRIFICATIONS POST-DÉPLOIEMENT

### 6.1 - Vérifier toutes les tables créées

```sql
SELECT tablename, schemaname
FROM pg_tables
WHERE tablename IN (
  'tenant_settings',
  'tenant_email_domains',
  'email_quota_usage',
  'tenant_provider_configs'
)
ORDER BY tablename;

-- Doit retourner 4 lignes
```

### 6.2 - Vérifier fonctions SQL créées

```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN (
  'ensure_tenant_settings',
  'increment_email_quota',
  'get_current_email_quota',
  'calculate_email_quota_overage'
)
ORDER BY proname;

-- Doit retourner 4 fonctions
```

### 6.3 - Vérifier backend logs (Mode detection)

```bash
ssh root@51.159.170.20
cd /opt/max-infrastructure
docker compose logs max-backend --tail 100 | grep "EMAIL_MODE"

# Doit afficher:
# [EMAIL_MODE] ✅ emailModeResolver.js chargé
```

### 6.4 - Vérifier frontend charge les panels

```bash
# Ouvrir DevTools Console: https://max.studiomacrea.cloud/settings/integrations
# Vérifier pas d'erreurs console
# Vérifier onglets: Email | SMS | WhatsApp
```

---

## ROLLBACK (Si nécessaire)

### Rollback Backend
```bash
ssh root@51.159.170.20
cd /opt/max-infrastructure

# Revenir au commit précédent
git log --oneline -5  # Noter le commit avant Phase 2
git checkout <commit-id>
docker compose restart max-backend
```

### Rollback Frontend
```bash
cd d:\Macrea\CRM\max_frontend
git log --oneline -5
git checkout <commit-id>
git push --force
# Vercel redéploie automatiquement
```

### Rollback Migrations SQL
```sql
-- ATTENTION: Supprime toutes les données !
DROP TABLE IF EXISTS email_quota_usage CASCADE;
DROP TABLE IF EXISTS tenant_email_domains CASCADE;
DROP TABLE IF EXISTS tenant_settings CASCADE;

-- Supprimer fonctions
DROP FUNCTION IF EXISTS increment_email_quota CASCADE;
DROP FUNCTION IF EXISTS get_current_email_quota CASCADE;
DROP FUNCTION IF EXISTS ensure_tenant_settings CASCADE;
DROP FUNCTION IF EXISTS calculate_email_quota_overage CASCADE;
```

---

## MONITORING POST-PROD (Premières 48h)

### Quotas - Dashboard SQL

```sql
-- Vue globale usage mois en cours
SELECT
  tenant_id,
  emails_sent,
  quota_limit,
  remaining,
  overage_count,
  overage_cost_eur,
  percentage_used
FROM email_quota_usage
WHERE year = EXTRACT(YEAR FROM NOW())
  AND month = EXTRACT(MONTH FROM NOW())
ORDER BY percentage_used DESC;
```

### Domaines Mode 2 - Validation DNS

```sql
-- Domaines en attente validation
SELECT
  tenant_id,
  email,
  domain,
  dns_status,
  created_at,
  ROUND(EXTRACT(EPOCH FROM (NOW() - created_at))/3600, 2) AS hours_pending
FROM tenant_email_domains
WHERE dns_status = 'pending'
ORDER BY created_at ASC;
```

### Logs Backend - Erreurs email

```bash
ssh root@51.159.170.20
cd /opt/max-infrastructure

# Surveiller erreurs Mailjet
docker compose logs max-backend -f | grep -E "ERROR|Mailjet|EMAIL_MODE"

# Si trop d'erreurs:
docker compose logs max-backend --tail 200 > /tmp/backend_errors.log
cat /tmp/backend_errors.log | grep "ERROR"
```

---

## ✅ CHECKLIST FINALE

- [ ] Migration 010 exécutée (tenant_settings)
- [ ] Migration 009 exécutée (tenant_email_domains)
- [ ] Migration 011 exécutée (email_quota_usage)
- [ ] Vérification SQL: 4 tables + 4 fonctions créées
- [ ] .env production modifié (no-reply@malalacrea.fr)
- [ ] Backend git pushed
- [ ] Backend docker restarted
- [ ] Logs backend OK (Encryption ✅ + PostgreSQL ✅)
- [ ] Frontend git pushed
- [ ] Frontend Vercel deployed
- [ ] UI visible: https://max.studiomacrea.cloud/settings/integrations
- [ ] Test Mode 1 réussi (no-reply@ + reply-to)
- [ ] Test Mode 2 API (DNS validation)
- [ ] Test Mode 3 UI (Provider form + card)
- [ ] Quota incrémenté correctement
- [ ] Monitoring quotas configuré (SQL dashboard)

---

## DOCUMENTATION COMPLÈTE

- **Architecture:** [EMAIL_ARCHITECTURE_FINAL.md](EMAIL_ARCHITECTURE_FINAL.md)
- **Guide déploiement:** [PHASE2_EMAIL_DEPLOYMENT_GUIDE.md](PHASE2_EMAIL_DEPLOYMENT_GUIDE.md)
- **Technique complet:** [PHASE2_EMAIL_3_OPTIONS_COMPLETE.md](PHASE2_EMAIL_3_OPTIONS_COMPLETE.md)
- **Statut final:** [PHASE2_COMPLETE_FINAL.md](PHASE2_COMPLETE_FINAL.md)
- **Script auto:** [DEPLOY_EMAIL_PHASE2.sh](DEPLOY_EMAIL_PHASE2.sh)
- **Migrations:** [max_backend/migrations/RUN_MIGRATIONS.md](max_backend/migrations/RUN_MIGRATIONS.md)

---

## CONTACTS SUPPORT

**Production:**
- Backend: https://api.max.studiomacrea.cloud
- Frontend: https://max.studiomacrea.cloud
- Webhook Mailjet: https://api.max.studiomacrea.cloud/webhooks/mailjet

**Développeur:** Claude (Anthropic)
**Client:** MaCréa / Jules Ramaha
**Date:** 2026-01-08
**Version:** Phase 2 - Production Ready

---

**🎉 PHASE 2 EMAIL 3 MODES - PRÊT POUR PRODUCTION 🎉**

---

**Prochaine étape:** Exécuter ÉTAPE 1 (Migrations SQL via Supabase)
