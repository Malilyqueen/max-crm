# Test simple de detection de role

$backendUrl = "https://max-api.studiomacrea.cloud"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TEST: Detection du role utilisateur par MAX" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Message simple qui devrait declencher une reponse de MAX
$testMessage = "Bonjour MAX, combien de leads y a-t-il dans le CRM ?"

# ============================================================================
# TEST 1: ADMIN
# ============================================================================
Write-Host "TEST 1: Requete ADMIN" -ForegroundColor Yellow
Write-Host ""

$headersAdmin = @{
    "X-Tenant" = "macrea-admin"
    "X-Role" = "admin"
    "Content-Type" = "application/json"
}

$timestamp = Get-Date -Format 'HHmmss'
$payload = @{
    message = $testMessage
    sessionId = "test_admin_$timestamp"
} | ConvertTo-Json

Write-Host "Envoi requete ADMIN..." -ForegroundColor White

try {
    $responseAdmin = Invoke-RestMethod -Uri "$backendUrl/api/chat" `
        -Method Post `
        -Headers $headersAdmin `
        -Body $payload `
        -TimeoutSec 30

    Write-Host ""
    Write-Host "REPONSE ADMIN:" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host $responseAdmin.message -ForegroundColor White
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host ""

    # Analyser la reponse
    if ($responseAdmin.message -match "(query_espo_leads|update_leads_in_espo|tool|espoFetch|ID: 694e)") {
        Write-Host "PASS: Reponse ADMIN contient des details techniques" -ForegroundColor Green
    } else {
        Write-Host "INFO: Pas de details techniques detectes" -ForegroundColor Yellow
        Write-Host "      (normal si MAX n'a pas utilise de tools pour cette requete)" -ForegroundColor Gray
    }

} catch {
    Write-Host "ERREUR requete ADMIN:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# TEST 2: CLIENT
# ============================================================================
Write-Host "TEST 2: Requete CLIENT" -ForegroundColor Yellow
Write-Host ""

$headersClient = @{
    "X-Tenant" = "macrea-admin"
    "X-Role" = "client"
    "Content-Type" = "application/json"
}

$timestamp2 = Get-Date -Format 'HHmmss'
$payloadClient = @{
    message = $testMessage
    sessionId = "test_client_$timestamp2"
} | ConvertTo-Json

Write-Host "Envoi requete CLIENT..." -ForegroundColor White

try {
    $responseClient = Invoke-RestMethod -Uri "$backendUrl/api/chat" `
        -Method Post `
        -Headers $headersClient `
        -Body $payloadClient `
        -TimeoutSec 30

    Write-Host ""
    Write-Host "REPONSE CLIENT:" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host $responseClient.message -ForegroundColor White
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host ""

    # Analyser la reponse
    if ($responseClient.message -match "(query_espo_leads|update_leads_in_espo|tool|espoFetch|ID: 694e)") {
        Write-Host "FAIL: Reponse CLIENT contient des details techniques!" -ForegroundColor Red
    } else {
        Write-Host "PASS: Reponse CLIENT ne contient pas de details techniques" -ForegroundColor Green
    }

} catch {
    Write-Host "ERREUR requete CLIENT:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "FIN DES TESTS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
