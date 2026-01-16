# Script de deploiement PowerShell - Scaleway
# Deploiement Phase 1: Per-Tenant Encryption + IPv4 Fix

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "DEPLOIEMENT PHASE 1 - SCALEWAY" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$server = "root@51.159.170.20"
$basePath = "d:\Macrea\CRM"

Write-Host "Transfert des fichiers vers le serveur..." -ForegroundColor Yellow
Write-Host ""

# Transferer les fichiers
Write-Host "1/4 - Transfert de server.js..." -ForegroundColor White
scp "$basePath\max_backend\server.js" "${server}:/opt/max-infrastructure/max_backend/server.js"

Write-Host "2/4 - Transfert de encryption.js..." -ForegroundColor White
scp "$basePath\max_backend\lib\encryption.js" "${server}:/opt/max-infrastructure/max_backend/lib/encryption.js"

Write-Host "3/4 - Transfert de settings.js..." -ForegroundColor White
scp "$basePath\max_backend\routes\settings.js" "${server}:/opt/max-infrastructure/max_backend/routes/settings.js"

Write-Host "4/4 - Transfert de settings-test.js..." -ForegroundColor White
scp "$basePath\max_backend\routes\settings-test.js" "${server}:/opt/max-infrastructure/max_backend/routes/settings-test.js"

Write-Host ""
Write-Host "Fichiers transferes!" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines etapes sur le serveur:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Connecte-toi en SSH:" -ForegroundColor White
Write-Host "   ssh root@51.159.170.20" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Ajoute FORCE_IPV4 au .env:" -ForegroundColor White
Write-Host "   cd /opt/max-infrastructure" -ForegroundColor Gray
Write-Host "   echo 'FORCE_IPV4=true' >> .env" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Edite docker-compose.yml:" -ForegroundColor White
Write-Host "   nano docker-compose.yml" -ForegroundColor Gray
Write-Host "   (Ajoute dans max-backend.environment:)" -ForegroundColor Gray
Write-Host "   - FORCE_IPV4=" -NoNewline -ForegroundColor Gray
Write-Host '${FORCE_IPV4}' -ForegroundColor Gray
Write-Host ""
Write-Host "4. Rebuild et redemarre:" -ForegroundColor White
Write-Host "   docker compose build max-backend" -ForegroundColor Gray
Write-Host "   docker compose up -d max-backend" -ForegroundColor Gray
Write-Host "   docker compose logs -f max-backend" -ForegroundColor Gray
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Voir COPIER_COLLER_DEPLOYMENT.md pour plus de details" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Cyan