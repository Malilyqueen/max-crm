# Generate API Key for MAX_SUPERADMIN_BOT using EspoCRM database directly

$espoUrl = "https://crm.studiomacrea.cloud/api/v1"
$adminUser = "admin"
$adminPassword = "Admin2025Secure"

# Create Basic Auth header
$base64AuthInfo = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${adminUser}:${adminPassword}"))
$headers = @{
    "Authorization" = "Basic $base64AuthInfo"
    "Content-Type" = "application/json"
}

Write-Host "Generating API Key via database..." -ForegroundColor Yellow
Write-Host ""

# Generate a random API key (EspoCRM format: 32-character hex string)
$apiKey = -join ((48..57) + (97..102) | Get-Random -Count 32 | ForEach-Object {[char]$_})

Write-Host "Generated Key: $apiKey" -ForegroundColor Cyan
Write-Host ""

# Get user ID
Write-Host "Fetching user MAX_SUPERADMIN_BOT..." -ForegroundColor Yellow
$existingUser = Invoke-RestMethod -Uri "$espoUrl/User?where[0][type]=equals&where[0][attribute]=userName&where[0][value]=max_superadmin_bot" -Method Get -Headers $headers
$userId = $existingUser.list[0].id

if (!$userId) {
    Write-Host "ERROR: User max_superadmin_bot not found" -ForegroundColor Red
    exit 1
}

Write-Host "User ID: $userId" -ForegroundColor Green
Write-Host ""

# Insert API key directly into database using docker exec
Write-Host "Inserting API key into database..." -ForegroundColor Yellow

$sqlCommand = "INSERT INTO api_key (id, name, user_id, api_key, is_active, created_at) VALUES (REPLACE(UUID(),'-',''), 'MAX_BOT_API_KEY', '$userId', '$apiKey', 1, NOW());"

$dockerCommand = "cd /opt/max-infrastructure && docker exec espocrm-db mysql -u espocrm -pespocrm_password espocrm -e `"$sqlCommand`""

Write-Host "Executing SQL command on server..." -ForegroundColor Yellow
ssh root@51.159.170.20 $dockerCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host "API KEY GENERATED SUCCESSFULLY" -ForegroundColor Green
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "API Key: $apiKey" -ForegroundColor White
    Write-Host ""

    # Save to file
    $apiKey | Out-File -FilePath "d:\Macrea\CRM\espo-api-key.txt" -Encoding UTF8 -NoNewline
    Write-Host "Saved to: d:\Macrea\CRM\espo-api-key.txt" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "ERROR: Failed to insert API key" -ForegroundColor Red
    exit 1
}