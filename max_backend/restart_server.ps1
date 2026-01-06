# Script de redémarrage propre du serveur M.A.X.
Write-Host "= Redémarrage du serveur M.A.X..." -ForegroundColor Cyan

# Arrêter tous les processus Node.js sur le port 3005
$port = 3005
$processId = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess

if ($processId) {
    Write-Host "=Í Processus trouvé (PID: $processId) - Arrêt en cours..." -ForegroundColor Yellow
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host " Processus arrêté" -ForegroundColor Green
} else {
    Write-Host "9 Aucun processus sur le port $port" -ForegroundColor Gray
}

# Attendre que le port soit libéré
Write-Host "ó Attente libération du port..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Démarrer le serveur
Write-Host "=€ Démarrage du serveur..." -ForegroundColor Cyan
Set-Location "d:\Macrea\CRM\max_backend"
npm run dev
