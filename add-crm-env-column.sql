-- ===============================================================
-- MIGRATION: Ajout colonne crm_env pour séparation PROD/LOCAL
-- Date: 2026-01-29
-- Contexte: Un seul Supabase sert localhost + prod
-- Objectif: Campaign ne voit que les tags prod
-- ===============================================================

-- 1. Ajouter la colonne crm_env (default 'prod' pour compatibilité)
ALTER TABLE leads_cache 
ADD COLUMN IF NOT EXISTS crm_env TEXT DEFAULT 'prod'
CHECK (crm_env IN ('prod', 'local', 'dev'));

-- 2. Créer un index pour optimiser les requêtes Campaign/SegmentBuilder
CREATE INDEX IF NOT EXISTS idx_leads_cache_crm_env 
ON leads_cache(tenant_id, crm_env);

-- 3. Backfill: toutes les données existantes = prod (safe)
UPDATE leads_cache 
SET crm_env = 'prod' 
WHERE crm_env IS NULL;

-- 4. Statistiques post-migration
SELECT 
  crm_env,
  COUNT(*) as count,
  COUNT(DISTINCT tenant_id) as distinct_tenants
FROM leads_cache 
GROUP BY crm_env 
ORDER BY crm_env;

-- ===============================================================
-- VALIDATION: Vérifier que les tags sont bien séparés
-- ===============================================================

-- Compter les tags par environnement
SELECT 
  crm_env,
  unnest(tags) as tag,
  COUNT(*) as occurrences
FROM leads_cache 
WHERE tags IS NOT NULL 
  AND array_length(tags, 1) > 0
GROUP BY crm_env, tag
ORDER BY crm_env, occurrences DESC
LIMIT 20;

-- Stats générales
SELECT 
  'Total leads' as metric, COUNT(*) as value FROM leads_cache
UNION ALL
SELECT 
  'Leads PROD' as metric, COUNT(*) as value FROM leads_cache WHERE crm_env = 'prod'
UNION ALL  
SELECT 
  'Leads LOCAL' as metric, COUNT(*) as value FROM leads_cache WHERE crm_env = 'local'
UNION ALL
SELECT 
  'Tenants PROD' as metric, COUNT(DISTINCT tenant_id) as value FROM leads_cache WHERE crm_env = 'prod';