# Test EspoCRM API Key for MAX_SUPERADMIN_BOT
# This script tests if the API key can create a lead in EspoCRM

$espoUrl = "https://crm.studiomacrea.cloud/api/v1"
$apiKey = "c306b76bd7e981305569b63e8bb4d157"

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "Testing EspoCRM API Key for MAX_SUPERADMIN_BOT" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Verify API Key works (GET /App/user)
Write-Host "[Test 1] Verifying API key authentication..." -ForegroundColor Yellow

$headers = @{
    "X-Api-Key" = $apiKey
    "Content-Type" = "application/json"
}

try {
    $userResponse = Invoke-RestMethod -Uri "$espoUrl/App/user" -Method Get -Headers $headers
    Write-Host "SUCCESS: API Key authenticated" -ForegroundColor Green
    Write-Host "  User: $($userResponse.userName)" -ForegroundColor White
    Write-Host "  Name: $($userResponse.firstName) $($userResponse.lastName)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "FAILED: API Key authentication failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Test 2: Create a test lead
Write-Host "[Test 2] Creating test lead..." -ForegroundColor Yellow

$leadData = @{
    firstName = "Test"
    lastName = "MAX_BOT_$(Get-Date -Format 'HHmmss')"
    status = "New"
    description = "Test lead created by MAX_SUPERADMIN_BOT via API key"
    emailAddress = "test-bot@macrea.fr"
    phoneNumber = "+33612345678"
} | ConvertTo-Json

try {
    $leadResponse = Invoke-RestMethod -Uri "$espoUrl/Lead" -Method Post -Headers $headers -Body $leadData
    Write-Host "SUCCESS: Lead created" -ForegroundColor Green
    Write-Host "  Lead ID: $($leadResponse.id)" -ForegroundColor White
    Write-Host "  Name: $($leadResponse.firstName) $($leadResponse.lastName)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "FAILED: Lead creation failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Test 3: Retrieve the created lead
Write-Host "[Test 3] Retrieving created lead..." -ForegroundColor Yellow

try {
    $retrievedLead = Invoke-RestMethod -Uri "$espoUrl/Lead/$($leadResponse.id)" -Method Get -Headers $headers
    Write-Host "SUCCESS: Lead retrieved" -ForegroundColor Green
    Write-Host "  Full name: $($retrievedLead.name)" -ForegroundColor White
    Write-Host "  Status: $($retrievedLead.status)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "FAILED: Lead retrieval failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Summary
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "ALL TESTS PASSED" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "The API key is working correctly. MAX backend can now:" -ForegroundColor White
Write-Host "  - Authenticate with EspoCRM" -ForegroundColor White
Write-Host "  - Create leads" -ForegroundColor White
Write-Host "  - Read lead data" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Test CSV import via MAX backend" -ForegroundColor White
Write-Host "  2. Verify lead enrichment works" -ForegroundColor White
Write-Host "  3. Test other CRM operations (Contacts, Opportunities)" -ForegroundColor White
Write-Host ""