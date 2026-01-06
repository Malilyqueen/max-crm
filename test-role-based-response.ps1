# Test de l'adaptation des reponses de MAX selon le role (admin vs client)
# Verifie que MAX montre les details techniques aux admins mais pas aux clients

$backendUrl = "https://max-api.studiomacrea.cloud"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TEST: Adaptation des reponses MAX selon le role utilisateur" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Message de test - demander a MAX ce qu'il a fait lors de la derniere importation
$testMessage = "Peux-tu me dire ce que tu as fait lors de la derniere importation de leads ?"

# ============================================================================
# TEST 1: Requete en tant qu'ADMIN (devrait montrer les details techniques)
# ============================================================================
Write-Host "TEST 1: Requete en tant qu'ADMIN" -ForegroundColor Yellow
Write-Host "     -> Doit montrer les details techniques (tools, IDs, etc.)" -ForegroundColor Gray
Write-Host ""

$headersAdmin = @{
    "X-Tenant" = "macrea-admin"
    "X-Role" = "admin"
    "Content-Type" = "application/json"
}

$payload = @{
    message = $testMessage
    sessionId = "test_role_admin_$(Get-Date -Format 'HHmmss')"
} | ConvertTo-Json

try {
    Write-Host "Envoi requete ADMIN..." -ForegroundColor White
    $responseAdmin = Invoke-RestMethod -Uri "$backendUrl/api/chat" `
        -Method Post `
        -Headers $headersAdmin `
        -Body $payload `
        -ErrorAction Stop

    Write-Host ""
    Write-Host "REPONSE ADMIN:" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host $responseAdmin.message -ForegroundColor White
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host ""

    # Verifier si la reponse contient des termes techniques
    $hasTechnicalDetails = $responseAdmin.message -match "(query_espo_leads|update_leads_in_espo|tool|ID:|694e[0-9a-f]+)"

    if ($hasTechnicalDetails) {
        Write-Host "PASS: Reponse ADMIN contient des details techniques" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Reponse ADMIN ne contient pas de details techniques" -ForegroundColor Yellow
    }

} catch {
    Write-Host "ERREUR lors de la requete ADMIN:" -ForegroundColor Red
    Write-Host $_ -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# TEST 2: Requete en tant que CLIENT (devrait cacher les details techniques)
# ============================================================================
Write-Host "TEST 2: Requete en tant que CLIENT" -ForegroundColor Yellow
Write-Host "     -> NE doit PAS montrer les details techniques" -ForegroundColor Gray
Write-Host ""

$headersClient = @{
    "X-Tenant" = "macrea-admin"
    "X-Role" = "client"
    "Content-Type" = "application/json"
}

$payloadClient = @{
    message = $testMessage
    sessionId = "test_role_client_$(Get-Date -Format 'HHmmss')"
} | ConvertTo-Json

try {
    Write-Host "Envoi requete CLIENT..." -ForegroundColor White
    $responseClient = Invoke-RestMethod -Uri "$backendUrl/api/chat" `
        -Method Post `
        -Headers $headersClient `
        -Body $payloadClient `
        -ErrorAction Stop

    Write-Host ""
    Write-Host "REPONSE CLIENT:" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host $responseClient.message -ForegroundColor White
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host ""

    # Verifier si la reponse NE contient PAS de termes techniques
    $hasTechnicalDetails = $responseClient.message -match "(query_espo_leads|update_leads_in_espo|tool|ID:|694e[0-9a-f]+)"

    if (-not $hasTechnicalDetails) {
        Write-Host "PASS: Reponse CLIENT ne contient pas de details techniques" -ForegroundColor Green
    } else {
        Write-Host "FAIL: Reponse CLIENT contient encore des details techniques!" -ForegroundColor Red
    }

} catch {
    Write-Host "ERREUR lors de la requete CLIENT:" -ForegroundColor Red
    Write-Host $_ -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "FIN DES TESTS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
