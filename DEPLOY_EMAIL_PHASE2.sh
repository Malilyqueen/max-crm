#!/bin/bash

# ============================================================
# SCRIPT DÉPLOIEMENT PHASE 2 - EMAIL 3 MODES
# ============================================================
# Déploie l'architecture email complète en production
# Mode 1 (default), Mode 2 (custom domain), Mode 3 (self-service)
# ============================================================

set -e  # Exit on error

echo "============================================================"
echo "DÉPLOIEMENT PHASE 2 - EMAIL 3 MODES"
echo "============================================================"
echo ""

# Variables
SERVER="root@51.159.170.20"
PROJECT_DIR="/opt/max-infrastructure"
BACKEND_DIR="d:/Macrea/CRM/max_backend"
FRONTEND_DIR="d:/Macrea/CRM/max_frontend"

# ============================================================
# ÉTAPE 1: Vérifications pré-déploiement
# ============================================================
echo "📋 ÉTAPE 1/6: Vérifications pré-déploiement"
echo ""

echo "1.1 - Vérifier fichiers migrations..."
if [ ! -f "$BACKEND_DIR/migrations/009_tenant_email_domains.sql" ]; then
  echo "❌ Migration 009 manquante"
  exit 1
fi

if [ ! -f "$BACKEND_DIR/migrations/010_tenant_settings.sql" ]; then
  echo "❌ Migration 010 manquante"
  exit 1
fi

if [ ! -f "$BACKEND_DIR/migrations/011_email_quota_usage.sql" ]; then
  echo "❌ Migration 011 manquante"
  exit 1
fi

echo "✅ Migrations présentes"
echo ""

echo "1.2 - Vérifier code backend..."
if [ ! -f "$BACKEND_DIR/lib/emailModeResolver.js" ]; then
  echo "❌ emailModeResolver.js manquant"
  exit 1
fi

if [ ! -f "$BACKEND_DIR/routes/email-domains.js" ]; then
  echo "❌ email-domains.js manquant"
  exit 1
fi

echo "✅ Code backend prêt"
echo ""

echo "1.3 - Vérifier code frontend..."
if [ ! -f "$FRONTEND_DIR/src/components/settings/EmailProvidersPanel.tsx" ]; then
  echo "❌ EmailProvidersPanel.tsx manquant"
  exit 1
fi

echo "✅ Code frontend prêt"
echo ""

# ============================================================
# ÉTAPE 2: Backup base de données
# ============================================================
echo "📋 ÉTAPE 2/6: Backup base de données"
echo ""

ssh $SERVER "cd $PROJECT_DIR && docker compose exec -T postgres pg_dump -U postgres max > /tmp/max_backup_\$(date +%Y%m%d_%H%M%S).sql"

echo "✅ Backup créé"
echo ""

# ============================================================
# ÉTAPE 3: Exécution migrations SQL
# ============================================================
echo "📋 ÉTAPE 3/6: Exécution migrations SQL"
echo ""

echo "3.1 - Copier migrations vers serveur..."
scp "$BACKEND_DIR/migrations/010_tenant_settings.sql" $SERVER:/tmp/
scp "$BACKEND_DIR/migrations/009_tenant_email_domains.sql" $SERVER:/tmp/
scp "$BACKEND_DIR/migrations/011_email_quota_usage.sql" $SERVER:/tmp/

echo "✅ Migrations copiées"
echo ""

echo "3.2 - Exécuter migration 010 (tenant_settings)..."
ssh $SERVER "cd $PROJECT_DIR && docker compose exec -T postgres psql -U postgres max -f /tmp/010_tenant_settings.sql"

echo "✅ Migration 010 OK"
echo ""

echo "3.3 - Exécuter migration 009 (tenant_email_domains)..."
ssh $SERVER "cd $PROJECT_DIR && docker compose exec -T postgres psql -U postgres max -f /tmp/009_tenant_email_domains.sql"

echo "✅ Migration 009 OK"
echo ""

echo "3.4 - Exécuter migration 011 (email_quota_usage)..."
ssh $SERVER "cd $PROJECT_DIR && docker compose exec -T postgres psql -U postgres max -f /tmp/011_email_quota_usage.sql"

echo "✅ Migration 011 OK"
echo ""

# ============================================================
# ÉTAPE 4: Modification .env production
# ============================================================
echo "📋 ÉTAPE 4/6: Modification .env production"
echo ""

echo "4.1 - Changer MAILJET_FROM_EMAIL..."
ssh $SERVER "cd $PROJECT_DIR && sed -i 's/^MAILJET_FROM_EMAIL=contact@/MAILJET_FROM_EMAIL=no-reply@/' .env"

echo "4.2 - Vérifier changement..."
FROM_EMAIL=$(ssh $SERVER "cd $PROJECT_DIR && grep '^MAILJET_FROM_EMAIL=' .env")
echo "    $FROM_EMAIL"

if [[ $FROM_EMAIL == *"no-reply@"* ]]; then
  echo "✅ .env modifié correctement"
else
  echo "❌ Erreur modification .env"
  exit 1
fi

echo ""

# ============================================================
# ÉTAPE 5: Déploiement code backend
# ============================================================
echo "📋 ÉTAPE 5/6: Déploiement code backend"
echo ""

echo "5.1 - Git push backend..."
cd "$BACKEND_DIR"
git add .
git commit -m "feat(email): Architecture 3 modes - Phase 2 complete" || echo "Rien à commiter"
git push

echo "✅ Code backend pushed"
echo ""

echo "5.2 - Pull + restart backend production..."
ssh $SERVER "cd $PROJECT_DIR && docker compose pull max-backend && docker compose restart max-backend"

echo "✅ Backend redémarré"
echo ""

echo "5.3 - Vérifier logs backend..."
ssh $SERVER "cd $PROJECT_DIR && docker compose logs max-backend --tail 20 | grep -E 'EMAIL_MODE|Encryption|PostgreSQL'"

echo ""

# ============================================================
# ÉTAPE 6: Déploiement code frontend
# ============================================================
echo "📋 ÉTAPE 6/6: Déploiement code frontend"
echo ""

echo "6.1 - Git push frontend..."
cd "$FRONTEND_DIR"
git add .
git commit -m "feat(email): UI 3 modes - Phase 2 complete" || echo "Rien à commiter"
git push

echo "✅ Code frontend pushed (Vercel auto-deploy)"
echo ""

# ============================================================
# VÉRIFICATIONS FINALES
# ============================================================
echo "============================================================"
echo "VÉRIFICATIONS FINALES"
echo "============================================================"
echo ""

echo "✅ Tables créées:"
ssh $SERVER "cd $PROJECT_DIR && docker compose exec -T postgres psql -U postgres max -c \"SELECT tablename FROM pg_tables WHERE tablename IN ('tenant_settings', 'tenant_email_domains', 'email_quota_usage');\""

echo ""
echo "✅ Fonctions créées:"
ssh $SERVER "cd $PROJECT_DIR && docker compose exec -T postgres psql -U postgres max -c \"SELECT proname FROM pg_proc WHERE proname LIKE '%email%quota%';\""

echo ""
echo "✅ Backend status:"
ssh $SERVER "cd $PROJECT_DIR && docker compose ps max-backend"

echo ""
echo "============================================================"
echo "DÉPLOIEMENT TERMINÉ ✅"
echo "============================================================"
echo ""
echo "Next steps:"
echo "1. Tester Mode 1: http://localhost:5173/settings/integrations"
echo "2. Créer tenant test avec email_reply_to"
echo "3. Envoyer email test et vérifier tracking"
echo "4. Monitorer quota: SELECT * FROM get_current_email_quota('tenant-id');"
echo ""
echo "Documentation:"
echo "- EMAIL_ARCHITECTURE_FINAL.md"
echo "- PHASE2_EMAIL_DEPLOYMENT_GUIDE.md"
echo ""
