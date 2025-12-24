# Script de Test Green-API WhatsApp Integration (Version Simple)
# Usage: .\test-greenapi-simple.ps1 -InstanceId 7105440259 -ApiToken xxxx

param(
    [string]$InstanceId = "",
    [string]$ApiToken = ""
)

$BASE_URL = "http://localhost:3005"

if (-not $InstanceId -or -not $ApiToken) {
    Write-Host "Usage: .\test-greenapi-simple.ps1 -InstanceId YOUR_ID -ApiToken YOUR_TOKEN" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== TEST GREEN-API WHATSAPP ===" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor White
Write-Host "Backend: $BASE_URL`n" -ForegroundColor White

# Test 1: Backend Healthcheck
Write-Host "[1/4] Healthcheck Backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/ping" -Method Get -TimeoutSec 10
    Write-Host "OK - Backend accessible`n" -ForegroundColor Green
} catch {
    Write-Host "ERREUR - Backend inaccessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Verifier que 'npm start' tourne dans max_backend/`n" -ForegroundColor Yellow
    exit 1
}

# Test 2: Creer Instance
Write-Host "[2/4] Creation/Enregistrement instance..." -ForegroundColor Yellow
$createBody = @{
    idInstance = $InstanceId
    apiTokenInstance = $ApiToken
    tenant = "macrea"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/wa/instance/create" `
        -Method Post `
        -ContentType "application/json" `
        -Body $createBody `
        -TimeoutSec 30

    Write-Host "OK - Instance creee" -ForegroundColor Green
    Write-Host "  Statut: $($response.instance.status)`n" -ForegroundColor White
    $currentStatus = $response.instance.status
} catch {
    Write-Host "ERREUR - Creation echouee: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}

# Test 3: Recuperer QR Code
if ($currentStatus -eq "notAuthorized") {
    Write-Host "[3/4] Recuperation QR Code..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/wa/instance/$InstanceId/qr?apiToken=$ApiToken" `
            -Method Get `
            -TimeoutSec 15

        Write-Host "OK - QR Code recupere" -ForegroundColor Green
        $qrCode = $response.qr.qrCode

        # Sauvegarder QR en HTML
        $html = "<!DOCTYPE html><html><head><title>QR WhatsApp</title><style>body{text-align:center;padding:50px;font-family:Arial}img{border:2px solid #ccc;padding:20px}</style></head><body><h1>QR Code WhatsApp</h1><p>Scannez avec WhatsApp</p><img src=`"$qrCode`"></body></html>"

        $htmlFile = "qr-greenapi.html"
        $html | Out-File -FilePath $htmlFile -Encoding UTF8

        Write-Host "  QR sauvegarde dans: $htmlFile" -ForegroundColor Cyan
        Write-Host "  Ouverture automatique du navigateur...`n" -ForegroundColor White

        Start-Process $htmlFile

    } catch {
        Write-Host "ERREUR - QR non recupere: $($_.Exception.Message)`n" -ForegroundColor Red
    }
} else {
    Write-Host "[3/4] Instance deja autorisee - Pas besoin de QR`n" -ForegroundColor Cyan
}

# Test 4: Verifier Statut
Write-Host "[4/4] Verification statut..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/wa/instance/$InstanceId/status?apiToken=$ApiToken" `
        -Method Get `
        -TimeoutSec 10

    Write-Host "OK - Statut recupere" -ForegroundColor Green
    Write-Host "  Etat: $($response.status.state)" -ForegroundColor White
    Write-Host "  Autorise: $($response.status.isAuthorized)`n" -ForegroundColor White

    if ($response.status.isAuthorized) {
        Write-Host "==> SUCCES - WhatsApp connecte et pret!`n" -ForegroundColor Green
    } else {
        Write-Host "==> En attente de scan du QR code...`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERREUR - Statut non verifie: $($_.Exception.Message)`n" -ForegroundColor Red
}

Write-Host "=== FIN DES TESTS ===" -ForegroundColor Cyan
Write-Host "Documentation: GREEN_API_SETUP.md`n" -ForegroundColor White
