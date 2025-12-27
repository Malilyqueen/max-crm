# Script de déploiement rapide Frontend MAX
# Utilise l'upload manuel Vercel

Write-Host "🚀 Déploiement Frontend MAX - Fix Tenant + Consent System" -ForegroundColor Cyan
Write-Host ""

# Vérifier que dist existe
if (!(Test-Path "dist")) {
    Write-Host "❌ Dossier dist/ introuvable. Exécutez d'abord: npm run build" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build trouvé dans dist/" -ForegroundColor Green
Write-Host ""

# Afficher les fichiers prêts au déploiement
Write-Host "📦 Contenu du build:" -ForegroundColor Yellow
Get-ChildItem dist -Recurse | Select-Object FullName

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 INSTRUCTIONS DÉPLOIEMENT MANUEL" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "Option 1: Via Dashboard Vercel (RECOMMANDÉ)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "1. Ouvrir: https://vercel.com/dashboard"
Write-Host "2. Sélectionner le projet 'max-frontend'"
Write-Host "3. Onglet 'Deployments'"
Write-Host "4. Cliquer 'Redeploy' sur le dernier déploiement"
Write-Host "5. Décocher 'Use existing Build Cache'"
Write-Host "6. Cliquer 'Redeploy'"
Write-Host ""

Write-Host "Option 2: Drag & Drop Direct" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "1. Ouvrir: https://vercel.com/new"
Write-Host "2. Glisser-déposer le dossier: $PWD\dist"
Write-Host "3. Configurer le domaine: max.studiomacrea.cloud"
Write-Host ""

Write-Host "Option 3: Réparer le token Vercel CLI" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "1. Exécuter: vercel login"
Write-Host "2. Suivre le lien d'authentification"
Write-Host "3. Exécuter: npx vercel --prod --yes"
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🔧 APRÈS DÉPLOIEMENT - TESTS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Ouvrir: https://max.studiomacrea.cloud" -ForegroundColor White
Write-Host "2. Hard Refresh: Ctrl + Shift + R" -ForegroundColor White
Write-Host "3. Console → Vérifier: [API] X-Tenant: macrea" -ForegroundColor White
Write-Host "   (PAS 'macrea-admin')" -ForegroundColor Red
Write-Host "4. Cliquer bouton: 🧪 Test Consent" -ForegroundColor White
Write-Host "5. Vérifier apparition ConsentCard dans le chat" -ForegroundColor White
Write-Host ""

Write-Host "Si erreur 'TENANT_NOT_RESOLVED' persiste:" -ForegroundColor Yellow
Write-Host "Console → localStorage.clear(); location.reload();" -ForegroundColor White
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✨ CORRECTIONS INCLUSES DANS CE BUILD" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Tenant fixé: 'macrea-admin' → 'macrea'" -ForegroundColor Green
Write-Host "✅ Types ChatMessage étendus (consent, operation)" -ForegroundColor Green
Write-Host "✅ ConsentCard intégrée dans MessageList" -ForegroundColor Green
Write-Host "✅ Handlers approve/audit dans ChatPage" -ForegroundColor Green
Write-Host "✅ Bouton test consent fonctionnel" -ForegroundColor Green
Write-Host "✅ ActivityPanel logging automatique" -ForegroundColor Green
Write-Host ""

Write-Host "Voulez-vous ouvrir le dashboard Vercel maintenant? (O/N)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq 'O' -or $response -eq 'o') {
    Start-Process "https://vercel.com/dashboard"
    Write-Host "✅ Dashboard ouvert dans le navigateur" -ForegroundColor Green
}

Write-Host ""
Write-Host "📄 Pour plus de détails, voir: deploy-manual.md" -ForegroundColor Cyan
