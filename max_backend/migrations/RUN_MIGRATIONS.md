# EXÉCUTION MIGRATIONS EMAIL PHASE 2

## Migrations créées

1. ✅ **008_provider_configs.sql** - Table tenant_provider_configs (Mode 3)
2. ✅ **009_tenant_email_domains.sql** - Table domaines custom (Mode 2)
3. ✅ **010_tenant_settings.sql** - Paramètres tenant (reply-to Mode 1)
4. ✅ **011_email_quota_usage.sql** - Compteur quota + facturation

---

## Ordre d'exécution

**IMPORTANT:** Exécuter dans l'ordre suivant (dépendances)

```bash
# 1. Provider configs (déjà exécutée normalement)
psql $DATABASE_URL -f 008_provider_configs.sql

# 2. Settings tenant (requis par quota usage)
psql $DATABASE_URL -f 010_tenant_settings.sql

# 3. Domaines email custom
psql $DATABASE_URL -f 009_tenant_email_domains.sql

# 4. Quota usage (dépend de tenant_settings)
psql $DATABASE_URL -f 011_email_quota_usage.sql
```

---

## Production (Supabase)

### Méthode 1: SQL Editor (Recommandé)

```
1. Se connecter à Supabase Dashboard
   https://supabase.com/dashboard/project/jcegkuyagbthpbklyawz

2. Menu: SQL Editor

3. Copier-coller le contenu de chaque migration
   (dans l'ordre 010 → 009 → 011)

4. Cliquer "Run" pour chaque fichier

5. Vérifier tables créées:
   SELECT tablename FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename LIKE '%email%'
   OR tablename = 'tenant_settings';
```

### Méthode 2: Via serveur production

```bash
# SSH vers serveur
ssh root@51.159.170.20

# Copier migrations
scp max_backend/migrations/010_tenant_settings.sql root@51.159.170.20:/tmp/
scp max_backend/migrations/009_tenant_email_domains.sql root@51.159.170.20:/tmp/
scp max_backend/migrations/011_email_quota_usage.sql root@51.159.170.20:/tmp/

# Exécuter via Docker
cd /opt/max-infrastructure

docker compose exec -T postgres psql \
  -U postgres \
  -d max \
  -f /tmp/010_tenant_settings.sql

docker compose exec -T postgres psql \
  -U postgres \
  -d max \
  -f /tmp/009_tenant_email_domains.sql

docker compose exec -T postgres psql \
  -U postgres \
  -d max \
  -f /tmp/011_email_quota_usage.sql
```

---

## Vérification post-migration

```sql
-- 1. Vérifier tables créées
SELECT tablename, schemaname
FROM pg_tables
WHERE tablename IN (
  'tenant_provider_configs',
  'tenant_email_domains',
  'tenant_settings',
  'email_quota_usage'
);

-- 2. Vérifier colonnes tenant_settings
\d tenant_settings

-- 3. Vérifier fonctions créées
SELECT proname, prosrc
FROM pg_proc
WHERE proname LIKE '%email%quota%'
   OR proname LIKE '%tenant_settings%';

-- 4. Test fonction quota
SELECT * FROM get_current_email_quota('test-tenant');

-- Doit retourner:
-- emails_sent | quota_limit | remaining | overage_count | overage_cost_eur | percentage_used
--           0 |        1000 |      1000 |             0 |           0.0000 |            0.00

-- 5. Test incrémentation
SELECT increment_email_quota('test-tenant');
SELECT * FROM get_current_email_quota('test-tenant');

-- Doit retourner:
-- emails_sent | quota_limit | remaining | overage_count | overage_cost_eur | percentage_used
--           1 |        1000 |       999 |             0 |           0.0000 |            0.10
```

---

## Initialisation données de test

```sql
-- Créer settings pour tenant macrea-admin
INSERT INTO tenant_settings (tenant_id, email_reply_to, email_from_name)
VALUES ('macrea-admin', 'jules@studiomacrea.cloud', 'MaCréa Team')
ON CONFLICT (tenant_id) DO NOTHING;

-- Créer domaine custom de test (Mode 2)
INSERT INTO tenant_email_domains (
  tenant_id,
  email,
  domain,
  name,
  dns_status,
  dns_instructions
)
VALUES (
  'demo-tenant',
  'contact@demo-restaurant.fr',
  'demo-restaurant.fr',
  'Restaurant Demo',
  'pending',
  '{"spf": "v=spf1 include:spf.mailjet.com ~all", "dkim": "k=rsa; p=..."}'::JSONB
)
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Vérifier
SELECT * FROM tenant_settings WHERE tenant_id = 'macrea-admin';
SELECT * FROM tenant_email_domains WHERE tenant_id = 'demo-tenant';
```

---

## Rollback (si nécessaire)

```sql
-- ATTENTION: Supprime toutes les données !

DROP TABLE IF EXISTS email_quota_usage CASCADE;
DROP TABLE IF EXISTS tenant_email_domains CASCADE;
DROP TABLE IF EXISTS tenant_settings CASCADE;

DROP FUNCTION IF EXISTS increment_email_quota CASCADE;
DROP FUNCTION IF EXISTS get_current_email_quota CASCADE;
DROP FUNCTION IF EXISTS ensure_tenant_settings CASCADE;
DROP FUNCTION IF EXISTS calculate_email_quota_overage CASCADE;
DROP FUNCTION IF EXISTS update_email_quota_usage_updated_at CASCADE;
DROP FUNCTION IF EXISTS update_tenant_email_domains_updated_at CASCADE;
DROP FUNCTION IF EXISTS update_tenant_settings_updated_at CASCADE;
```

---

## Monitoring post-déploiement

```sql
-- Compteur emails par tenant (mois en cours)
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
ORDER BY emails_sent DESC;

-- Tenants en dépassement
SELECT
  tenant_id,
  emails_sent,
  overage_count,
  overage_cost_eur
FROM email_quota_usage
WHERE year = EXTRACT(YEAR FROM NOW())
  AND month = EXTRACT(MONTH FROM NOW())
  AND overage_count > 0
ORDER BY overage_cost_eur DESC;

-- Domaines en attente validation (Mode 2)
SELECT
  tenant_id,
  email,
  domain,
  dns_status,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/3600 AS hours_pending
FROM tenant_email_domains
WHERE dns_status = 'pending'
ORDER BY created_at ASC;
```

---

## Next Steps après migrations

1. **Modifier .env production:**
   ```bash
   ssh root@51.159.170.20
   cd /opt/max-infrastructure
   sed -i 's/^MAILJET_FROM_EMAIL=contact@/MAILJET_FROM_EMAIL=no-reply@/' .env
   grep MAILJET_FROM_EMAIL .env  # Vérifier
   ```

2. **Redémarrer backend:**
   ```bash
   docker compose restart max-backend
   docker compose logs max-backend --tail 50
   ```

3. **Déployer frontend:**
   ```bash
   # Depuis local
   cd d:\Macrea\CRM\max_frontend
   git push
   # Vercel auto-deploy
   ```

4. **Tester Mode 1:**
   - Créer tenant test
   - Configurer email_reply_to dans tenant_settings
   - Envoyer email test
   - Vérifier FROM = no-reply@malalacrea.fr
   - Vérifier REPLY-TO = email configuré

5. **Activer monitoring quota:**
   - Créer cron job quotidien
   - Vérifier dépassements
   - Envoyer alertes si > 90%

---

**Date:** 2026-01-08
**Status:** Prêt exécution
