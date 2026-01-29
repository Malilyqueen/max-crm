# ========================================
# DEPLOY DASHBOARD V1 - Scaleway
# Tag: dashboard-v1
# ========================================

$server = "root@51.159.170.20"
$basePath = "d:\Macrea\CRM"
$remotePath = "/opt/max-infrastructure"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "DEPLOIEMENT DASHBOARD V1" -ForegroundColor Green
Write-Host "Tag: dashboard-v1 (102 fichiers)" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# ========================================
# PHASE 1: MIGRATION DB
# ========================================
Write-Host "PHASE 1: MIGRATION DATABASE" -ForegroundColor Magenta
Write-Host "-----------------------------------------" -ForegroundColor Gray

Write-Host "Transfert migration 012_campaigns_tracking.sql..." -ForegroundColor White
scp "$basePath\max_backend\migrations\012_campaigns_tracking.sql" "${server}:$remotePath/max_backend/migrations/"

Write-Host ""
Write-Host ">> Execute manuellement sur le serveur:" -ForegroundColor Yellow
Write-Host "   ssh $server" -ForegroundColor Gray
Write-Host "   docker exec -i max-postgres psql -U max_user -d max_db < $remotePath/max_backend/migrations/012_campaigns_tracking.sql" -ForegroundColor Gray
Write-Host ""

# ========================================
# PHASE 2: BACKEND
# ========================================
Write-Host "PHASE 2: BACKEND FILES" -ForegroundColor Magenta
Write-Host "-----------------------------------------" -ForegroundColor Gray

$backendFiles = @(
    "server.js",
    "lib/emailModeResolver.js",
    "lib/messageEventLogger.js",
    "lib/statusNormalizer.js",
    "lib/whatsappHelper.js",
    "routes/campaigns.js",
    "routes/events.js",
    "routes/settings.js",
    "routes/greenapi-webhook.js",
    "routes/mailjet-webhook.js",
    "routes/twilio-sms-webhook.js",
    "routes/wa-instance.js",
    "middleware/authMiddleware.js",
    "middleware/whatsappGate.js"
)

foreach ($file in $backendFiles) {
    $localFile = "$basePath\max_backend\$file"
    $remoteDir = Split-Path "$remotePath/max_backend/$file" -Parent
    if (Test-Path $localFile) {
        Write-Host "  -> $file" -ForegroundColor White
        scp $localFile "${server}:$remotePath/max_backend/$file"
    } else {
        Write-Host "  [SKIP] $file (not found)" -ForegroundColor DarkGray
    }
}

Write-Host ""

# ========================================
# PHASE 3: FRONTEND BUILD
# ========================================
Write-Host "PHASE 3: FRONTEND BUILD" -ForegroundColor Magenta
Write-Host "-----------------------------------------" -ForegroundColor Gray

Write-Host "Building frontend locally..." -ForegroundColor White
Set-Location "$basePath\max_frontend"
npm run build 2>&1 | Out-Null

if (Test-Path "$basePath\max_frontend\dist") {
    Write-Host "Build successful!" -ForegroundColor Green

    Write-Host "Creating tarball..." -ForegroundColor White
    Set-Location "$basePath\max_frontend"
    tar -czf frontend-dashboard-v1.tar.gz -C dist .

    Write-Host "Transferring to server..." -ForegroundColor White
    scp frontend-dashboard-v1.tar.gz "${server}:$remotePath/"

    Write-Host ""
    Write-Host ">> Execute sur le serveur:" -ForegroundColor Yellow
    Write-Host "   cd $remotePath" -ForegroundColor Gray
    Write-Host "   rm -rf max_frontend/dist/*" -ForegroundColor Gray
    Write-Host "   tar -xzf frontend-dashboard-v1.tar.gz -C max_frontend/dist/" -ForegroundColor Gray
} else {
    Write-Host "Build FAILED!" -ForegroundColor Red
}

Set-Location $basePath

Write-Host ""

# ========================================
# PHASE 4: RESTART SERVICES
# ========================================
Write-Host "PHASE 4: RESTART (manuel)" -ForegroundColor Magenta
Write-Host "-----------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host ">> Sur le serveur:" -ForegroundColor Yellow
Write-Host "   docker compose restart max-backend" -ForegroundColor Gray
Write-Host "   docker compose logs -f max-backend --tail=50" -ForegroundColor Gray
Write-Host ""

# ========================================
# PHASE 5: SMOKE TESTS
# ========================================
Write-Host "PHASE 5: SMOKE TESTS" -ForegroundColor Magenta
Write-Host "-----------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "Endpoints a tester apres deploiement:" -ForegroundColor White
Write-Host "  1. GET /campaigns (auth required)" -ForegroundColor Gray
Write-Host "  2. GET /campaigns/stats/global (auth required)" -ForegroundColor Gray
Write-Host "  3. GET /events (auth required)" -ForegroundColor Gray
Write-Host "  4. GET /events/stats (auth required)" -ForegroundColor Gray
Write-Host "  5. Frontend: /campagnes, /activite" -ForegroundColor Gray
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "DEPLOIEMENT TERMINE" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan