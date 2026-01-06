# Script to create MAX_SUPERADMIN_BOT user in EspoCRM with API access
# Phase 1: Immediate setup for testing

$espoUrl = "https://crm.studiomacrea.cloud/api/v1"
$adminUser = "admin"
$adminPassword = "Admin2025Secure"

# Create Basic Auth header
$base64AuthInfo = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${adminUser}:${adminPassword}"))
$headers = @{
    "Authorization" = "Basic $base64AuthInfo"
    "Content-Type" = "application/json"
}

Write-Host "`n=== Phase 1: Creating MAX_SUPERADMIN_BOT User ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create Role MAX_BOT_GLOBAL
Write-Host "[1/4] Creating role MAX_BOT_GLOBAL..." -ForegroundColor Yellow

$roleData = @{
    name = "MAX_BOT_GLOBAL"
    data = @{
        # Full permissions on all entities
        Lead = @{
            create = "yes"
            read = "all"
            edit = "all"
            delete = "all"
            stream = "all"
        }
        Contact = @{
            create = "yes"
            read = "all"
            edit = "all"
            delete = "all"
            stream = "all"
        }
        Account = @{
            create = "yes"
            read = "all"
            edit = "all"
            delete = "all"
            stream = "all"
        }
        Opportunity = @{
            create = "yes"
            read = "all"
            edit = "all"
            delete = "all"
            stream = "all"
        }
        Case = @{
            create = "yes"
            read = "all"
            edit = "all"
            delete = "all"
            stream = "all"
        }
        KnowledgeBaseArticle = @{
            create = "yes"
            read = "all"
            edit = "all"
            delete = "all"
            stream = "all"
        }
        Task = @{
            create = "yes"
            read = "all"
            edit = "all"
            delete = "all"
            stream = "all"
        }
        Call = @{
            create = "yes"
            read = "all"
            edit = "all"
            delete = "all"
            stream = "all"
        }
        Meeting = @{
            create = "yes"
            read = "all"
            edit = "all"
            delete = "all"
            stream = "all"
        }
        Email = @{
            create = "yes"
            read = "all"
            edit = "all"
            delete = "all"
            stream = "all"
        }
    }
    fieldData = @{
        # Grant access to all fields
    }
} | ConvertTo-Json -Depth 10

try {
    $roleResponse = Invoke-RestMethod -Uri "$espoUrl/Role" -Method Post -Headers $headers -Body $roleData
    $roleId = $roleResponse.id
    Write-Host "Role created: $roleId" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "Role MAX_BOT_GLOBAL already exists, fetching ID..." -ForegroundColor Yellow
        $existingRole = Invoke-RestMethod -Uri "$espoUrl/Role?where[0][type]=equals&where[0][attribute]=name&where[0][value]=MAX_BOT_GLOBAL" -Method Get -Headers $headers
        $roleId = $existingRole.list[0].id
        Write-Host "Using existing role: $roleId" -ForegroundColor Green
    } else {
        Write-Host "Error creating role: $_" -ForegroundColor Red
        Write-Host $_.Exception.Response -ForegroundColor Red
        exit 1
    }
}

# Step 2: Create User MAX_SUPERADMIN_BOT
Write-Host "`n[2/4] Creating user MAX_SUPERADMIN_BOT..." -ForegroundColor Yellow

$userData = @{
    userName = "max_superadmin_bot"
    firstName = "MAX"
    lastName = "SUPERADMIN_BOT"
    emailAddress = "max-bot@macrea.fr"
    password = "MAXBot2025SecureKey!$(Get-Random -Minimum 1000 -Maximum 9999)"
    type = "api"
    isActive = $true
    rolesIds = @($roleId)
    defaultTeamId = $null
} | ConvertTo-Json -Depth 5

try {
    $userResponse = Invoke-RestMethod -Uri "$espoUrl/User" -Method Post -Headers $headers -Body $userData
    $userId = $userResponse.id
    Write-Host "User created: $userId" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "User already exists, fetching ID..." -ForegroundColor Yellow
        $existingUser = Invoke-RestMethod -Uri "$espoUrl/User?where[0][type]=equals&where[0][attribute]=userName&where[0][value]=max_superadmin_bot" -Method Get -Headers $headers
        $userId = $existingUser.list[0].id
        Write-Host "Using existing user: $userId" -ForegroundColor Green
    } else {
        Write-Host "Error creating user: $_" -ForegroundColor Red
        Write-Host $_.Exception.Response -ForegroundColor Red
        exit 1
    }
}

# Step 3: Generate API Key for user
Write-Host "`n[3/4] Generating API Key..." -ForegroundColor Yellow

$apiKeyData = @{
    userId = $userId
    isActive = $true
} | ConvertTo-Json

try {
    $apiKeyResponse = Invoke-RestMethod -Uri "$espoUrl/ApiKey" -Method Post -Headers $headers -Body $apiKeyData
    $apiKey = $apiKeyResponse.key
    Write-Host "API Key generated successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host "  ESPOCRM API KEY FOR MAX_SUPERADMIN_BOT" -ForegroundColor Cyan
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  API Key: $apiKey" -ForegroundColor White
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "Error generating API key: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response -ForegroundColor Red
    exit 1
}

# Step 4: Save API key to file for server update
Write-Host "[4/4] Saving API key..." -ForegroundColor Yellow

# Save API key to temporary file
$apiKey | Out-File -FilePath "d:\Macrea\CRM\espo-api-key.txt" -Encoding UTF8 -NoNewline

Write-Host "API Key saved to: d:\Macrea\CRM\espo-api-key.txt" -ForegroundColor Green
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "MAX_SUPERADMIN_BOT SETUP COMPLETE!" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""