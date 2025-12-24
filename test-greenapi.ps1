# Script de Test Green-API WhatsApp Integration
# Usage: .\test-greenapi.ps1

param(
    [string]$InstanceId = "",
    [string]$ApiToken = ""
)

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🧪 TEST GREEN-API WHATSAPP - M.A.X." -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$BASE_URL = "http://localhost:3005"

# Vérifier que l'instance ID et le token sont fournis
if (-not $InstanceId -or -not $ApiToken) {
    Write-Host "⚠️  Credentials manquants!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor White
    Write-Host "  .\test-greenapi.ps1 -InstanceId 7103123456 -ApiToken abc123def456" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pour obtenir les credentials:" -ForegroundColor White
    Write-Host "  1. Créer un compte sur https://green-api.com/" -ForegroundColor Gray
    Write-Host "  2. Créer une instance WhatsApp" -ForegroundColor Gray
    Write-Host "  3. Noter idInstance et apiTokenInstance" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "📍 Configuration:" -ForegroundColor Yellow
Write-Host "   Backend: $BASE_URL" -ForegroundColor White
Write-Host "   Instance ID: $InstanceId" -ForegroundColor White
Write-Host "   API Token: $($ApiToken.Substring(0, 10))..." -ForegroundColor White
Write-Host ""

# Test 1: Healthcheck Backend
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ TEST 1: Healthcheck Backend (/api/ping)" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/ping" -Method Get -TimeoutSec 10
    Write-Host "✅ Backend M.A.X. répond!" -ForegroundColor Green
    Write-Host "   Réponse: $($response | ConvertTo-Json -Compress)" -ForegroundColor White
} catch {
    Write-Host "❌ Backend inaccessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Vérifier que 'npm start' tourne dans max_backend/" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 2: Créer/Enregistrer Instance
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ TEST 2: Créer/Enregistrer Instance" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

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

    Write-Host "✅ Instance créée/enregistrée!" -ForegroundColor Green
    Write-Host "   Instance ID: $($response.instance.instanceId)" -ForegroundColor White
    Write-Host "   Statut: $($response.instance.status)" -ForegroundColor White
    Write-Host "   Provider: $($response.instance.provider)" -ForegroundColor White

    $currentStatus = $response.instance.status
} catch {
    Write-Host "❌ Échec création instance: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Vérifier les credentials Green-API" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 3: Récupérer QR Code
if ($currentStatus -eq "notAuthorized") {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "✅ TEST 3: Récupérer QR Code" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/wa/instance/$InstanceId/qr?apiToken=$ApiToken" `
            -Method Get `
            -TimeoutSec 15

        Write-Host "✅ QR Code récupéré!" -ForegroundColor Green
        Write-Host "   Type: $($response.qr.type)" -ForegroundColor White
        Write-Host "   Expire dans: $($response.qr.expiresIn)ms" -ForegroundColor White

        $qrCode = $response.qr.qrCode

        # Sauvegarder QR en HTML pour affichage
        $htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>QR Code WhatsApp - Green-API</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
        }
        img {
            border: 4px solid #e0e0e0;
            border-radius: 10px;
            padding: 20px;
            background: white;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
        }
        p {
            color: #666;
            font-size: 16px;
        }
        .status {
            margin-top: 20px;
            padding: 15px;
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 8px;
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📱 QR Code WhatsApp</h1>
        <p>Scannez ce QR code avec WhatsApp pour connecter votre instance</p>
        <img src="$qrCode" alt="QR Code">
        <div class="status">
            ⏳ En attente de scan...<br>
            Ouvrez WhatsApp → WhatsApp Web → Scanner QR Code
        </div>
    </div>
</body>
</html>
"@

        $htmlFile = "qr-code-greenapi.html"
        $htmlContent | Out-File -FilePath $htmlFile -Encoding UTF8

        Write-Host ""
        Write-Host "📄 QR Code sauvegardé dans: $htmlFile" -ForegroundColor Cyan
        Write-Host "   Ouvrir le fichier dans un navigateur pour scanner le QR" -ForegroundColor White

        # Ouvrir automatiquement dans le navigateur
        Start-Process $htmlFile

    } catch {
        Write-Host "❌ Échec récupération QR: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
} else {
    Write-Host "ℹ️  Instance déjà autorisée, pas besoin de QR code" -ForegroundColor Cyan
    Write-Host ""
}

# Test 4: Vérifier Statut
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ TEST 4: Vérifier Statut Instance" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/wa/instance/$InstanceId/status?apiToken=$ApiToken" `
        -Method Get `
        -TimeoutSec 10

    Write-Host "✅ Statut récupéré!" -ForegroundColor Green
    Write-Host "   État: $($response.status.state)" -ForegroundColor White
    Write-Host "   Autorisé: $($response.status.isAuthorized)" -ForegroundColor White

    if ($response.status.isAuthorized) {
        Write-Host ""
        Write-Host "🎉 Instance WhatsApp connectée et prête!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⏳ En attente de scan du QR code..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Échec vérification statut: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Résumé
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "📊 RÉSUMÉ DES TESTS" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Backend M.A.X. accessible" -ForegroundColor Green
Write-Host "✅ Instance Green-API enregistrée" -ForegroundColor Green
if ($currentStatus -eq "notAuthorized") {
    Write-Host "⏳ QR Code généré - Scanner pour connecter" -ForegroundColor Yellow
} else {
    Write-Host "✅ Instance déjà connectée" -ForegroundColor Green
}
Write-Host ""
Write-Host "🎯 PROCHAINES ÉTAPES:" -ForegroundColor Yellow
Write-Host "   1. Scanner le QR code avec WhatsApp" -ForegroundColor White
Write-Host "   2. Vérifier statut: .\test-greenapi.ps1 -InstanceId $InstanceId -ApiToken $ApiToken" -ForegroundColor White
Write-Host "   3. Tester le frontend: http://localhost:5173/connect-whatsapp" -ForegroundColor White
Write-Host ""
Write-Host "📝 Documentation complète: GREEN_API_SETUP.md" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
