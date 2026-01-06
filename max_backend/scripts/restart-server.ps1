param(
    [int]$port = 3005,
    [string]$path = "D:\Macrea\CRMACREA\ia_admin_api"
)

# Trouver le processus qui occupe le port
$pid = netstat -ano | findstr ":$port" | ForEach-Object {
    ($_ -split '\s+')[-1]
} | Select-Object -First 1

if ($pid) {
    Write-Host "Port $port occupé (PID=$pid). Arrêt du processus..."
    taskkill /PID $pid /F | Out-Null
    Start-Sleep -Seconds 1
    Write-Host "Port libéré avec succès."
} else {
    Write-Host "Aucun processus n'utilise le port $port."
}

# Relancer le serveur
Set-Location $path
Write-Host "Démarrage du serveur Node.js sur le port $port..."
Start-Process "node" "server.js"
Write-Host "Serveur redémarré avec succès."
