# 📋 Instructions - Application Migration Supabase

## Étape 1: Ouvrir Supabase Dashboard

**URL**: https://app.supabase.com/project/jcegkuyagbthpbklyawz

1. Se connecter avec vos identifiants Supabase
2. Sélectionner le projet: `jcegkuyagbthpbklyawz`

---

## Étape 2: Ouvrir SQL Editor

1. Dans le menu de gauche, cliquer sur **SQL Editor**
2. Cliquer sur **New Query**

---

## Étape 3: Copier/Coller le SQL

**Fichier source**: `max_backend/migrations/supabase_create_lead_activities.sql`

**Option A - Tout en une fois** (recommandé):
```sql
-- Copier TOUT le contenu du fichier supabase_create_lead_activities.sql
-- et coller dans SQL Editor
```

**Option B - Commande par commande**:
Si l'option A échoue, exécuter les commandes séparément:

### 1. Créer table lead_activities
```sql
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'macrea',
  lead_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'call', 'other')),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'replied', 'no_answer')),
  message_snippet TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Créer index lead_activities
```sql
CREATE INDEX IF NOT EXISTS idx_lead_activities_tenant ON lead_activities (tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_tenant_lead_created ON lead_activities (tenant_id, lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_channel ON lead_activities (channel);
CREATE INDEX IF NOT EXISTS idx_lead_activities_direction ON lead_activities (direction);
```

### 3. Créer table max_alerts
```sql
CREATE TABLE IF NOT EXISTS max_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'macrea',
  lead_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('NoContact7d', 'NoReply3d')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'med', 'high')),
  message TEXT NOT NULL,
  suggested_action JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ DEFAULT NULL,
  resolved_by TEXT DEFAULT NULL
);
```

### 4. Créer index max_alerts
```sql
CREATE INDEX IF NOT EXISTS idx_max_alerts_tenant ON max_alerts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_max_alerts_tenant_lead ON max_alerts (tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_max_alerts_type ON max_alerts (type);
CREATE INDEX IF NOT EXISTS idx_max_alerts_unresolved ON max_alerts (resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_max_alerts_severity ON max_alerts (severity);
```

### 5. Créer contrainte unique
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_max_alerts_unique_active
ON max_alerts (tenant_id, lead_id, type)
WHERE resolved_at IS NULL;
```

### 6. Créer vue active_alerts
```sql
CREATE OR REPLACE VIEW active_alerts AS
SELECT
  a.id,
  a.tenant_id,
  a.lead_id,
  a.type,
  a.severity,
  a.message,
  a.suggested_action,
  a.created_at,
  (
    SELECT created_at
    FROM lead_activities
    WHERE lead_id = a.lead_id AND tenant_id = a.tenant_id
    ORDER BY created_at DESC
    LIMIT 1
  ) as last_activity_at
FROM max_alerts a
WHERE a.resolved_at IS NULL
ORDER BY
  CASE a.severity
    WHEN 'high' THEN 1
    WHEN 'med' THEN 2
    WHEN 'low' THEN 3
  END,
  a.created_at DESC;
```

### 7. Activer RLS (Row Level Security)
```sql
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE max_alerts ENABLE ROW LEVEL SECURITY;
```

### 8. Créer policies RLS
```sql
CREATE POLICY "Enable all for service role" ON lead_activities
  FOR ALL USING (true);

CREATE POLICY "Enable all for service role" ON max_alerts
  FOR ALL USING (true);
```

### 9. Ajouter commentaires (optionnel)
```sql
COMMENT ON TABLE lead_activities IS 'Tracking de toutes les interactions avec les leads (WhatsApp, email, appels)';
COMMENT ON TABLE max_alerts IS 'Alertes proactives générées par M.A.X. pour le suivi commercial';
COMMENT ON COLUMN max_alerts.suggested_action IS 'Action suggérée au format JSON: {action: "whatsapp_followup", template: "relance_douce"}';
```

---

## Étape 4: Exécuter

1. Cliquer sur **Run** (ou `Ctrl+Enter`)
2. Vérifier qu'il n'y a pas d'erreurs dans la console en bas

---

## Étape 5: Vérifier

Dans le SQL Editor, exécuter:

```sql
-- Vérifier tables créées
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('lead_activities', 'max_alerts');

-- Vérifier vue créée
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name = 'active_alerts';

-- Test insertion
INSERT INTO lead_activities (tenant_id, lead_id, channel, direction, status, message_snippet)
VALUES ('macrea', 'test_lead_001', 'whatsapp', 'out', 'sent', 'Message de test');

-- Vérifier insertion
SELECT * FROM lead_activities WHERE lead_id = 'test_lead_001';
```

Si tout fonctionne, vous devriez voir:
- ✅ 2 tables: `lead_activities`, `max_alerts`
- ✅ 1 vue: `active_alerts`
- ✅ 1 ligne insérée dans `lead_activities`

---

## Étape 6: Tester l'API

Retourner dans le terminal et exécuter:

```powershell
cd max_backend
.\test-alerts-mvp.ps1
```

Le script devrait maintenant fonctionner et logger des activités + générer des alertes.

---

## ⚠️ En cas d'erreur

**Erreur: "relation already exists"**
→ Normal si vous réexécutez le script. Ignorer.

**Erreur: "permission denied"**
→ Vérifier que vous utilisez bien la `SUPABASE_SERVICE_KEY` (pas l'anon key) dans .env

**Erreur: "syntax error"**
→ Vérifier que vous avez copié tout le SQL correctement (pas de caractères manquants)

---

## 📞 Support

Si problème persistant:
1. Vérifier logs Supabase: Menu **Logs** dans Dashboard
2. Vérifier permissions: Menu **Authentication** > **Policies**
3. Contacter support Supabase si nécessaire

---

**Une fois migration appliquée, le système d'alertes M.A.X. sera opérationnel! 🎉**
