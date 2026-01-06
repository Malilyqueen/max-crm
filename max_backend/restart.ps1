# Script de redémarrage du backend M.A.X.
Write-Host "=== Redémarrage du backend M.A.X. ===" -ForegroundColor Cyan

# 1. Trouver et tuer tous les processus Node sur le port 3005
Write-Host "`n1. Recherche des processus sur le port 3005..." -ForegroundColor Yellow
$connections = Get-NetTCPConnection -LocalPort 3005 -ErrorAction SilentlyContinue
if ($connections) {
    $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
        Write-Host "   Arrêt du processus PID: $processId" -ForegroundColor Red
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "   Aucun processus trouvé sur le port 3005" -ForegroundColor Green
}

# 2. Vérifier que le port est libre
Write-Host "`n2. Vérification que le port est libre..." -ForegroundColor Yellow
$check = Get-NetTCPConnection -LocalPort 3005 -ErrorAction SilentlyContinue
if ($check) {
    Write-Host "   ERREUR: Le port 3005 est toujours occupé!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "   Port 3005 libre!" -ForegroundColor Green
}

# 3. Démarrer le serveur
Write-Host "`n3. Démarrage du serveur..." -ForegroundColor Yellow
Set-Location -Path "D:\Macrea\CRM\max_backend"
npm start
