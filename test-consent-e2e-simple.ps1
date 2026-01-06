# Test E2E - Système de consentement M.A.X.
# Flux complet : Demande → Approbation → Exécution → Audit

$API = "https://max-api.studiomacrea.cloud"
$TENANT = "macrea-admin"
$SESSION = "demo_$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "`n=== TEST E2E CONSENTEMENT M.A.X. ===" -ForegroundColor Cyan

# ÉTAPE 1 : Demande de consentement
Write-Host "`nETAPE 1 : M.A.X. demande le consentement..." -ForegroundColor Yellow

$body1 = @{
    sessionId = $SESSION
    description = "Ajouter le champ secteur aux layouts Lead"
} | ConvertTo-Json

$resp1 = Invoke-RestMethod -Uri "$API/api/chat/test-consent" `
    -Method Post -ContentType "application/json" `
    -Headers @{"X-Tenant"=$TENANT} -Body $body1

$consentId = $resp1.message.consentId

Write-Host "Succes ! ConsentId: $consentId" -ForegroundColor Green
Write-Host "Message: $($resp1.message.content)" -ForegroundColor White
Write-Host "Type: $($resp1.message.type)" -ForegroundColor White
Write-Host "Status: $($resp1.message.consentStatus)" -ForegroundColor White

Write-Host "`nAppuyez sur ENTREE pour approuver..." -ForegroundColor Yellow
Read-Host

# ÉTAPE 2 : Approbation et exécution
Write-Host "`nETAPE 2 : Approbation et execution du consentement..." -ForegroundColor Yellow

$resp2 = Invoke-RestMethod -Uri "$API/api/consent/execute/$consentId" `
    -Method Post -ContentType "application/json" `
    -Headers @{"X-Tenant"=$TENANT}

Write-Host "Succes ! Operation executee" -ForegroundColor Green
Write-Host "Layouts modifies: $($resp2.result.layoutsModified)" -ForegroundColor White

# ÉTAPE 3 : Récupération audit
Write-Host "`nETAPE 3 : Recuperation du rapport d'audit..." -ForegroundColor Yellow

$resp3 = Invoke-RestMethod -Uri "$API/api/consent/audit/$consentId" `
    -Method Get -Headers @{"X-Tenant"=$TENANT}

Write-Host "Succes ! Audit recupere" -ForegroundColor Green
Write-Host "Consent ID: $($resp3.audit.consentId)" -ForegroundColor White
Write-Host "Operation: $($resp3.audit.operation.description)" -ForegroundColor White
Write-Host "Resultat: Success=$($resp3.audit.result.success)" -ForegroundColor White
Write-Host "Layouts modifies: $($resp3.audit.result.layoutsModified)" -ForegroundColor White
Write-Host "Duree: $($resp3.audit.metadata.execution_time_ms)ms" -ForegroundColor White

Write-Host "`n=== TEST E2E TERMINE AVEC SUCCES ===" -ForegroundColor Green
Write-Host "`nProchaine etape: Tester depuis le frontend (ChatPage)`n" -ForegroundColor Yellow
