# Script PowerShell pour initialiser EspoCRM avec M.A.X.
#
# Usage: .\init-espo.ps1
#
# Prérequis:
# - EspoCRM démarré sur http://127.0.0.1:8081
# - Credentials ADMIN configurés dans .env

Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  M.A.X. - Initialisation EspoCRM Transport/Logistique  ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Vérifier que Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    Write-Host "  Téléchargez Node.js sur https://nodejs.org`n" -ForegroundColor Yellow
    exit 1
}

# Vérifier que le fichier .env existe
if (-Not (Test-Path ".env")) {
    Write-Host "✗ Fichier .env introuvable" -ForegroundColor Red
    Write-Host "  Créez un fichier .env avec ESPO_USERNAME et ESPO_PASSWORD`n" -ForegroundColor Yellow
    exit 1
}

# Vérifier que les credentials ADMIN sont configurés
$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "ESPO_USERNAME" -or $envContent -notmatch "ESPO_PASSWORD") {
    Write-Host "⚠ Credentials ADMIN manquants dans .env" -ForegroundColor Yellow
    Write-Host "`nAjoutez ces lignes dans votre .env:" -ForegroundColor Yellow
    Write-Host "ESPO_USERNAME=admin" -ForegroundColor White
    Write-Host "ESPO_PASSWORD=votre_mot_de_passe`n" -ForegroundColor White

    $response = Read-Host "Voulez-vous continuer quand même? (o/n)"
    if ($response -ne "o") {
        exit 1
    }
}

Write-Host "`n📋 Vérifications préliminaires...`n" -ForegroundColor Cyan

# Tester la connexion à EspoCRM
Write-Host "🔗 Test de connexion à EspoCRM..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8081/api/v1/App/user" -ErrorAction Stop -UseBasicParsing -TimeoutSec 5
    Write-Host "✓ EspoCRM est accessible sur http://127.0.0.1:8081" -ForegroundColor Green
} catch {
    Write-Host "✗ EspoCRM n'est pas accessible" -ForegroundColor Red
    Write-Host "  Vérifiez qu'EspoCRM est démarré sur le port 8081`n" -ForegroundColor Yellow

    $response = Read-Host "Voulez-vous continuer quand même? (o/n)"
    if ($response -ne "o") {
        exit 1
    }
}

Write-Host "`n🚀 Lancement du script d'initialisation...`n" -ForegroundColor Cyan

# Exécuter le script Node.js
node scripts/init-espo-transport.js

# Vérifier le code de sortie
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║           ✅ INITIALISATION RÉUSSIE !                   ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

    Write-Host "🌐 Prochaine étape: Ouvrez le frontend M.A.X." -ForegroundColor Cyan
    Write-Host "   http://localhost:5173`n" -ForegroundColor White

    Write-Host "📊 Consultez l'onglet CRM pour voir les leads importés`n" -ForegroundColor Cyan
} else {
    Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║              ✗ ERREUR D'INITIALISATION                  ║" -ForegroundColor Red
    Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Red

    Write-Host "💡 Vérifiez:" -ForegroundColor Yellow
    Write-Host "   • Les credentials ADMIN dans .env" -ForegroundColor White
    Write-Host "   • EspoCRM est bien démarré" -ForegroundColor White
    Write-Host "   • Les logs ci-dessus pour plus de détails`n" -ForegroundColor White

    exit 1
}
