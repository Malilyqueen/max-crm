# ✅ CHECKLIST DÉPLOIEMENT PRODUCTION - Alertes Vivantes

**Projet**: Système Alertes Vivantes M.A.X.
**Version**: 1.0
**Date**: 2025-12-27

---

## 🎯 OBJECTIF

Déployer le système alertes en production sans interruption de service.

**Durée estimée**: 2-3 heures
**Prérequis**: Accès Supabase, Vercel/VPS, DNS configuré

---

## PHASE 1: PRÉPARATION BASE DE DONNÉES

### ✅ 1.1 Vérifier migration Supabase

- [ ] Connexion à Supabase Dashboard
- [ ] Naviguer vers projet production
- [ ] SQL Editor → Copier `supabase_create_lead_activities.sql`
- [ ] Exécuter migration
- [ ] Vérifier tables créées:
  ```sql
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('lead_activities', 'max_alerts');
  ```
  **Attendu**: 2 lignes retournées

### ✅ 1.2 Vérifier index

```sql
SELECT indexname FROM pg_indexes
WHERE tablename IN ('lead_activities', 'max_alerts');
```

**Attendu**:
- `idx_lead_activities_tenant_lead`
- `idx_lead_activities_created`
- `idx_max_alerts_unique_active`
- `idx_max_alerts_tenant_lead`

### ✅ 1.3 Configurer RLS (Row Level Security)

**Option A: Désactiver RLS (dev/staging)**
```sql
ALTER TABLE lead_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE max_alerts DISABLE ROW LEVEL SECURITY;
```

**Option B: Activer RLS (production sécurisée)**
```sql
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE max_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_access ON lead_activities
FOR ALL TO service_role USING (true);

CREATE POLICY service_role_access ON max_alerts
FOR ALL TO service_role USING (true);
```

### ✅ 1.4 Tester connexion backend → Supabase

```bash
# Local test
curl -X POST "http://localhost:3005/api/activities/log" \
  -H "Content-Type: application/json" \
  -H "X-Tenant: macrea" \
  -d '{
    "leadId": "test_deploy",
    "channel": "whatsapp",
    "direction": "out",
    "status": "sent",
    "messageSnippet": "Test déploiement"
  }'
```

**Attendu**: `{"success":true,"activity":{...}}`

---

## PHASE 2: DÉPLOIEMENT BACKEND

### ✅ 2.1 Configurer variables d'environnement production

**Plateforme**: Vercel / Railway / VPS

**Variables requises**:
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJ...

# API Keys
ESPO_API_KEY=your_espocrm_api_key
ESPO_URL=https://crm.yourdomain.com

# Green-API (WhatsApp)
GREENAPI_INSTANCE_ID=7105440259
GREENAPI_TOKEN=your_token

# Server
PORT=3005
NODE_ENV=production
```

### ✅ 2.2 Build backend

```bash
cd max_backend

# Installer dépendances
npm install --production

# Test build (si TypeScript)
npm run build  # Si applicable

# Test démarrage
npm start
```

**Vérifier logs**:
```
Server running on port 3005
Supabase connected
Routes mounted: /api/activities, /api/alerts
```

### ✅ 2.3 Déployer backend

**Vercel**:
```bash
cd max_backend
vercel deploy --prod
```

**Railway**:
```bash
cd max_backend
railway up
```

**VPS (PM2)**:
```bash
cd max_backend
pm2 start server.js --name max-backend
pm2 save
pm2 startup
```

### ✅ 2.4 Vérifier déploiement backend

```bash
# Test API alertes
curl https://max-api.studiomacrea.cloud/api/alerts/active \
  -H "X-Tenant: macrea"

# Attendu: {"success":true,"stats":{...},"alerts":[]}
```

**Checklist endpoints**:
- [ ] GET /api/alerts/active → 200
- [ ] POST /api/activities/log → 200
- [ ] GET /health (si existe) → 200

---

## PHASE 3: DÉPLOIEMENT FRONTEND

### ✅ 3.1 Configurer variables d'environnement production

**Vercel / Netlify**:
```env
VITE_API_BASE=https://max-api.studiomacrea.cloud
```

### ✅ 3.2 Build frontend

```bash
cd max_frontend

# Installer dépendances
npm install

# Build production
npm run build

# Vérifier dist/
ls -la dist/
```

**Attendu**: Dossier `dist/` avec:
- `index.html`
- `assets/` (JS, CSS chunks)

### ✅ 3.3 Déployer frontend

**Vercel**:
```bash
cd max_frontend
vercel deploy --prod
```

**Netlify**:
```bash
cd max_frontend
netlify deploy --prod --dir=dist
```

**VPS (Nginx)**:
```bash
# Copier dist/ vers serveur
rsync -avz dist/ user@server:/var/www/max-dashboard/

# Nginx config
server {
  listen 443 ssl;
  server_name max-dashboard.studiomacrea.cloud;

  root /var/www/max-dashboard;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass https://max-api.studiomacrea.cloud;
  }
}

# Reload Nginx
sudo systemctl reload nginx
```

### ✅ 3.4 Vérifier déploiement frontend

```bash
# Test URL
curl https://max-dashboard.studiomacrea.cloud

# Attendu: HTML avec <title>
```

**Checklist pages**:
- [ ] https://max-dashboard.studiomacrea.cloud → 200
- [ ] /dashboard → Widget visible
- [ ] Console navigateur (F12) → Aucune erreur

---

## PHASE 4: TESTS POST-DÉPLOIEMENT

### ✅ 4.1 Test E2E complet

**Scénario**: Envoyer message WhatsApp → Logger activité → Voir dans widget

1. **Envoyer message via Chat M.A.X. (production)**
   - Aller sur Chat M.A.X.
   - Envoyer message à un lead
   - Vérifier envoi réussi

2. **Vérifier logging backend**
   ```bash
   # Logs backend (Vercel/Railway)
   vercel logs max-backend --follow
   # OU
   railway logs

   # Chercher:
   # "📝 Activité loggée pour lead ..."
   ```

3. **Vérifier dans Supabase**
   ```sql
   SELECT * FROM lead_activities
   WHERE tenant_id = 'macrea'
   ORDER BY created_at DESC
   LIMIT 10;
   ```
   **Attendu**: Nouvelle ligne avec activité just loggée

4. **Vérifier dans widget dashboard**
   - Ouvrir https://max-dashboard.studiomacrea.cloud/dashboard
   - Section "Alertes M.A.X."
   - Si aucune alerte: Message "R.A.S. aujourd'hui..."
   - Cliquer "Actualiser" → Pas d'erreur

### ✅ 4.2 Test création alerte manuelle

```sql
-- Dans Supabase production
INSERT INTO max_alerts (tenant_id, lead_id, type, severity, message, suggested_action)
VALUES (
  'macrea',
  'test_prod_alert',
  'NoContact7d',
  'high',
  'Test alerte production',
  '{"label": "Test Action", "action": "test"}'::jsonb
);
```

**Vérification dashboard**:
- Rafraîchir page
- Widget affiche l'alerte test
- Badge "Haute: 1" visible
- Bouton "Résoudre" fonctionnel

### ✅ 4.3 Test résolution alerte

1. Cliquer "Résoudre" sur alerte test
2. Alerte disparaît immédiatement
3. Vérifier dans Supabase:
   ```sql
   SELECT resolved_at FROM max_alerts
   WHERE lead_id = 'test_prod_alert';
   ```
   **Attendu**: `resolved_at` non NULL

### ✅ 4.4 Test auto-refresh (60s)

1. Créer nouvelle alerte via SQL
2. NE PAS rafraîchir page
3. Attendre 60-70 secondes
4. Widget affiche automatiquement nouvelle alerte

**Attendu**: ✅ Alerte apparaît sans refresh manuel

---

## PHASE 5: MONITORING & LOGS

### ✅ 5.1 Configurer alertes erreur

**Sentry / Datadog / LogRocket** (optionnel):
```javascript
// max_backend/server.js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production'
});
```

### ✅ 5.2 Logs backend accessibles

**Vercel**:
```bash
vercel logs max-backend --follow
```

**Railway**:
```bash
railway logs --follow
```

**PM2 (VPS)**:
```bash
pm2 logs max-backend --lines 100
```

### ✅ 5.3 Métriques clés à surveiller

**Backend**:
- [ ] Taux erreur POST /api/activities/log < 1%
- [ ] Temps réponse GET /api/alerts/active < 500ms
- [ ] Uptime > 99.5%

**Frontend**:
- [ ] Temps chargement dashboard < 3s
- [ ] Aucune erreur console navigateur
- [ ] Auto-refresh fonctionne (check toutes les 60s)

**Base de données**:
- [ ] Queries lead_activities < 100ms
- [ ] Disk usage < 80%
- [ ] Connexions actives < max pool

---

## PHASE 6: FORMATION ÉQUIPE

### ✅ 6.1 Session formation utilisateurs

**Durée**: 30 minutes
**Participants**: Équipe commerciale

**Agenda**:
1. Introduction système alertes (5 min)
2. Demo widget dashboard (10 min)
3. Interprétation badges sévérité (5 min)
4. Best practices résolution alertes (5 min)
5. Q&A (5 min)

### ✅ 6.2 Documentation utilisateur

- [ ] Guide utilisateur créé
- [ ] Screenshots widget annotés
- [ ] FAQ alertes disponible
- [ ] Process escalade défini (alerte high non résolue 24h)

### ✅ 6.3 Support technique

**Contact**:
- Slack channel: #alertes-max
- Email: support@yourdomain.com
- Hotline: +33 X XX XX XX XX

**Heures support**:
- Lun-Ven: 9h-18h
- Weekend: On-call si alerte critique

---

## PHASE 7: ROLLBACK PLAN

### ✅ 7.1 Préparer rollback backend

**Avant déploiement**:
```bash
# Tag version actuelle
git tag v1.0-alertes-before
git push origin v1.0-alertes-before

# Backup Vercel deployment
vercel inspect <current-deployment-url> > backup-deployment.json
```

**Si rollback nécessaire**:
```bash
# Vercel: Rollback vers deployment précédent
vercel rollback <previous-deployment-url>

# Railway: Redéployer commit précédent
railway up --detached <previous-commit-sha>

# PM2: Restart ancienne version
git checkout v1.0-alertes-before
npm install
pm2 restart max-backend
```

### ✅ 7.2 Préparer rollback frontend

**Avant déploiement**:
```bash
# Backup dist/
tar -czf dist-backup-$(date +%Y%m%d).tar.gz dist/
```

**Si rollback nécessaire**:
```bash
# Vercel: Rollback automatique
vercel rollback

# Netlify: Restore previous deploy
netlify rollback

# VPS: Restore backup
tar -xzf dist-backup-YYYYMMDD.tar.gz -C /var/www/max-dashboard/
```

### ✅ 7.3 Rollback base de données

**⚠️ ATTENTION**: Rollback DB complexe (perte données)

**Option A: Désactiver tables (non destructif)**:
```sql
-- Renommer tables
ALTER TABLE lead_activities RENAME TO lead_activities_backup;
ALTER TABLE max_alerts RENAME TO max_alerts_backup;
```

**Option B: Backup avant migration**:
```bash
# Avant migration production
pg_dump -h supabase-host -U postgres -d your_db > backup_before_alertes.sql

# Si rollback nécessaire
psql -h supabase-host -U postgres -d your_db < backup_before_alertes.sql
```

---

## 📋 CHECKLIST FINALE VALIDATION

### Technique

- [ ] Migration Supabase appliquée
- [ ] Index créés et fonctionnels
- [ ] Backend déployé et accessible
- [ ] Frontend déployé et accessible
- [ ] Variables env configurées (production)
- [ ] HTTPS/SSL configuré
- [ ] CORS configuré correctement
- [ ] Logs backend accessibles
- [ ] Monitoring activé

### Fonctionnel

- [ ] POST /api/activities/log fonctionne
- [ ] GET /api/alerts/active retourne données
- [ ] Widget dashboard visible
- [ ] État empty affiche message "vivant"
- [ ] Création alerte test réussie
- [ ] Résolution alerte fonctionne
- [ ] Auto-refresh 60s opérationnel
- [ ] Badges sévérité affichés correctement

### Organisationnel

- [ ] Équipe formée
- [ ] Documentation utilisateur disponible
- [ ] Process support défini
- [ ] Rollback plan testé (dry-run)
- [ ] Backup DB effectué
- [ ] Communication déploiement envoyée

---

## 🚀 GO / NO-GO DECISION

**Critères GO**:
- ✅ Tous tests E2E passés
- ✅ Performance acceptable (< 500ms API)
- ✅ Aucune erreur critique logs
- ✅ Équipe formée et disponible
- ✅ Rollback plan prêt

**Critères NO-GO**:
- ❌ Erreur taux > 5% sur tests
- ❌ Temps réponse API > 2s
- ❌ Base données inaccessible
- ❌ Équipe non formée

---

## 📊 POST-DÉPLOIEMENT (7 jours)

### Métriques à suivre

**Jour 1-3**:
- Taux adoption widget (% commerciaux qui consultent)
- Nombre alertes créées
- Nombre alertes résolues
- Temps moyen résolution

**Jour 4-7**:
- Feedback équipe (survey)
- Bugs reportés (Github issues)
- Performance système (response times)
- Taux erreur logging

### Actions correctives si besoin

**Si taux erreur > 2%**:
- Investiguer logs
- Identifier pattern erreurs
- Hotfix si nécessaire

**Si adoption faible**:
- Session formation supplémentaire
- Améliorer UX widget
- Communication rappel équipe

---

**Checklist prête - Bon déploiement!** 🚀
