# Script pour redémarrer le serveur frontend
Write-Host "=== Redémarrage du serveur frontend M.A.X. ===" -ForegroundColor Cyan

# Tuer les processus npm/node du frontend
Write-Host "`nArrêt des processus frontend..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -eq "node" -and $_.Path -like "*max_frontend*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Petite pause
Start-Sleep -Seconds 2

# Redémarrer le serveur frontend
Write-Host "`nDémarrage du serveur frontend..." -ForegroundColor Green
Set-Location "d:\Macrea\CRM\max_frontend"

# Lancer npm run dev en arrière-plan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\Macrea\CRM\max_frontend'; npm run dev"

Write-Host "`n✅ Serveur frontend redémarré !" -ForegroundColor Green
Write-Host "Ouvrez http://localhost:5173 dans votre navigateur" -ForegroundColor Cyan
