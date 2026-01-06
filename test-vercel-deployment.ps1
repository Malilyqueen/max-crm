# Test si Vercel a déployé le bon commit
Write-Host "🔍 Vérification du déploiement Vercel..." -ForegroundColor Cyan

# 1. Vérifier le commit local
Write-Host "`n📌 Commit local actuel:" -ForegroundColor Yellow
cd max_frontend
git log -1 --format="%h - %s"

# 2. Vérifier que le commit est sur GitHub
Write-Host "`n📤 Commit sur GitHub:" -ForegroundColor Yellow
git log origin/master -1 --format="%h - %s"

# 3. Tester l'API de production
Write-Host "`n🌐 Test API Production:" -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "https://max.studiomacrea.cloud/" -Method Get -ErrorAction SilentlyContinue
Write-Host "✅ Site accessible" -ForegroundColor Green

Write-Host "`n💡 Instructions:" -ForegroundColor Cyan
Write-Host "1. Va sur https://vercel.com/malilyqueen/max-frontend/deployments"
Write-Host "2. Vérifie que le commit ac323fa est déployé"
Write-Host "3. Si besoin, force un redéploiement du dernier commit"
Write-Host "4. Attends 2-3 minutes que le build se termine"
Write-Host "5. Teste sur https://max.studiomacrea.cloud avec Ctrl+Shift+R"
