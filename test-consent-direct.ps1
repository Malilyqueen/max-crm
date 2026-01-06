$ErrorActionPreference = "Stop"
$API_URL = "https://max-api.studiomacrea.cloud"

# Generate unique field name
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$random = Get-Random -Minimum 1000 -Maximum 9999
$fieldName = "testDirect_${timestamp}_${random}"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST CONSENT GATE - Direct Tool Call" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "Field Name: $fieldName`n" -ForegroundColor Yellow

# STEP 1: Direct tool execution via API (force tool call)
Write-Host "STEP 1: Direct tool execution..." -ForegroundColor Cyan

$body = @{
    message = "Execute maintenant: create_custom_field avec entity=Lead, fieldName=$fieldName, type=text, label=Test Direct $timestamp"
    sessionId = "direct-test-$timestamp"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/chat" -Method POST -Headers @{ "Content-Type" = "application/json"; "X-Tenant" = "macrea-admin" } -Body $body

    Write-Host "Response received" -ForegroundColor Green

    if (-not $response.pendingConsent) {
        Write-Host "`nERROR: pendingConsent missing!" -ForegroundColor Red
        Write-Host "Full response:" -ForegroundColor Yellow
        $response | ConvertTo-Json -Depth 10 | Write-Host
        exit 1
    }

    $sessionId = $response.sessionId
    $consentId = $response.pendingConsent.consentId
    $operation = $response.pendingConsent.operation

    Write-Host "`n✅ Consent Gate triggered!" -ForegroundColor Green
    Write-Host "Session ID: $sessionId" -ForegroundColor Yellow
    Write-Host "Consent ID: $consentId" -ForegroundColor Yellow
    Write-Host "Operation Type: $($operation.type)" -ForegroundColor Magenta
    Write-Host "Description: $($operation.description)" -ForegroundColor Magenta
    Write-Host "Field Name: $($operation.details.fieldName)" -ForegroundColor Magenta

} catch {
    Write-Host "`nERROR Step 1: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# STEP 2: Execute with consent
Write-Host "`nSTEP 2: Executing with consent..." -ForegroundColor Cyan

$executeBody = @{ sessionId = $sessionId } | ConvertTo-Json

try {
    $executeResponse = Invoke-RestMethod -Uri "$API_URL/api/consent/execute/$consentId" -Method POST -Headers @{ "Content-Type" = "application/json"; "X-Tenant" = "macrea-admin" } -Body $executeBody

    if ($executeResponse.success) {
        Write-Host "`n✅ Execution successful!" -ForegroundColor Green
        Write-Host "Message: $($executeResponse.result.message)" -ForegroundColor Green

        if ($executeResponse.audit) {
            Write-Host "Audit Consent ID: $($executeResponse.audit.consentId)" -ForegroundColor Yellow
            Write-Host "Report Path: $($executeResponse.audit.reportPath)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "`n❌ Execution failed" -ForegroundColor Red
        Write-Host "Error: $($executeResponse.error)" -ForegroundColor Red
        exit 1
    }

} catch {
    Write-Host "`nERROR Step 2: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✅ TEST COMPLETED SUCCESSFULLY" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
Write-Host "Field created: $fieldName" -ForegroundColor Yellow
Write-Host "`nVerify in EspoCRM:" -ForegroundColor Cyan
Write-Host "http://51.159.170.20/ -> Admin -> Entity Manager -> Lead -> Fields`n" -ForegroundColor White