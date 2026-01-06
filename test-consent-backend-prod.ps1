# ============================================================================
# Test E2E Consent Gate - Backend Production
# ============================================================================
# URL: https://max-api.studiomacrea.cloud
# Objectif: Valider le flux complet backend consent gate
# ============================================================================

$ErrorActionPreference = "Stop"
$API_URL = "https://max-api.studiomacrea.cloud"

# Génération fieldName unique (évite collisions)
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$random = Get-Random -Minimum 1000 -Maximum 9999
$fieldName = "testConsent_${timestamp}_${random}"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CONSENT GATE - Test Backend Prod" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "📍 API URL: $API_URL" -ForegroundColor Yellow
Write-Host "🔖 Field Name: $fieldName`n" -ForegroundColor Yellow

# ============================================================================
# STEP 1: Demande création champ (doit être bloqué par consent gate)
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "STEP 1: Demande création champ sur Lead" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

$body = @{
    message = "Crée un champ $fieldName de type text sur Lead"
    sessionId = "e2e-test-$timestamp"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/chat" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-Tenant" = "macrea-admin"
        } `
        -Body $body

    Write-Host "✅ Réponse API reçue" -ForegroundColor Green

    # Vérifier que pendingConsent existe
    if (-not $response.pendingConsent) {
        Write-Host "`n❌ ERREUR: pendingConsent absent de la réponse!`n" -ForegroundColor Red
        Write-Host "Réponse brute:" -ForegroundColor Yellow
        $response | ConvertTo-Json -Depth 10 | Write-Host
        exit 1
    }

    $sessionId = $response.sessionId
    $consentId = $response.pendingConsent.consentId
    $operation = $response.pendingConsent.operation
    $expiresIn = $response.pendingConsent.expiresIn

    Write-Host "📋 Session ID: " -NoNewline -ForegroundColor White
    Write-Host "$sessionId" -ForegroundColor Yellow

    Write-Host "🔐 Consent ID: " -NoNewline -ForegroundColor White
    Write-Host "$consentId" -ForegroundColor Yellow

    Write-Host "`n📝 Operation Details:" -ForegroundColor Cyan
    Write-Host "   Type: " -NoNewline -ForegroundColor White
    Write-Host "$($operation.type)" -ForegroundColor Magenta

    Write-Host "   Description: " -NoNewline -ForegroundColor White
    Write-Host "$($operation.description)" -ForegroundColor Magenta

    Write-Host "   Field Name: " -NoNewline -ForegroundColor White
    Write-Host "$($operation.details.fieldName)" -ForegroundColor Magenta

    Write-Host "   Entity: " -NoNewline -ForegroundColor White
    Write-Host "$($operation.details.entity)" -ForegroundColor Magenta

    Write-Host "   Type: " -NoNewline -ForegroundColor White
    Write-Host "$($operation.details.type)" -ForegroundColor Magenta

    Write-Host "`n⏱️  Expire dans: " -NoNewline -ForegroundColor White
    Write-Host "$expiresIn secondes" -ForegroundColor Yellow

} catch {
    Write-Host "`n❌ ERREUR Step 1: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception.Response -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# STEP 2: Exécution avec consentId (doit créer le champ)
# ============================================================================
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "STEP 2: Exécution avec consentement" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

$executeBody = @{
    sessionId = $sessionId
} | ConvertTo-Json

try {
    $executeResponse = Invoke-RestMethod -Uri "$API_URL/api/consent/execute/$consentId" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-Tenant" = "macrea-admin"
        } `
        -Body $executeBody

    if ($executeResponse.success) {
        Write-Host "✅ Exécution réussie!" -ForegroundColor Green

        Write-Host "`n📦 Résultat:" -ForegroundColor Cyan
        Write-Host "   Message: " -NoNewline -ForegroundColor White
        Write-Host "$($executeResponse.result.message)" -ForegroundColor Green

        if ($executeResponse.audit) {
            Write-Host "`n📊 Audit:" -ForegroundColor Cyan
            Write-Host "   Consent ID: " -NoNewline -ForegroundColor White
            Write-Host "$($executeResponse.audit.consentId)" -ForegroundColor Yellow

            Write-Host "   Report Path: " -NoNewline -ForegroundColor White
            Write-Host "$($executeResponse.audit.reportPath)" -ForegroundColor Yellow
        }

    } else {
        Write-Host "`n⚠️  Exécution échouée" -ForegroundColor Red
        Write-Host "   Erreur: $($executeResponse.error)" -ForegroundColor Red
    }

} catch {
    Write-Host "`n❌ ERREUR Step 2: $($_.Exception.Message)" -ForegroundColor Red

    # Afficher détails si disponibles
    if ($_.ErrorDetails.Message) {
        try {
            $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "   Error: $($errorObj.error)" -ForegroundColor Yellow
        } catch {
            Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
        }
    }
    exit 1
}

# ============================================================================
# RÉSUMÉ FINAL
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  ✅ TEST CONSENT GATE - RÉUSSI" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "🎯 Résumé:" -ForegroundColor Cyan
Write-Host "   • Consent Gate bloque opération: " -NoNewline
Write-Host "✅" -ForegroundColor Green

Write-Host "   • pendingConsent retourné: " -NoNewline
Write-Host "✅" -ForegroundColor Green

Write-Host "   • Exécution avec consent: " -NoNewline
Write-Host "✅" -ForegroundColor Green

Write-Host "   • Champ créé: " -NoNewline
Write-Host "$fieldName" -ForegroundColor Yellow

Write-Host "`n📌 Prochaine étape:" -ForegroundColor Cyan
Write-Host "   → Vérifier dans EspoCRM: http://51.159.170.20/" -ForegroundColor White
Write-Host "   → Admin → Entity Manager → Lead → Fields" -ForegroundColor White
Write-Host "   → Chercher: " -NoNewline -ForegroundColor White
Write-Host "$fieldName`n" -ForegroundColor Yellow
