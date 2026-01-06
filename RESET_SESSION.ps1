# Script pour réinitialiser la session M.A.X. et forcer une nouvelle conversation
Write-Host "🔄 Réinitialisation de la session M.A.X...." -ForegroundColor Cyan

# Trouver le fichier de session actuel
$sessionFile = Get-ChildItem "D:\Macrea\CRM\max_backend\conversations\session_*.json" | Select-Object -First 1

if ($sessionFile) {
    $sessionId = $sessionFile.Name -replace 'session_|\.json', ''
    Write-Host "📋 Session trouvée: $sessionId" -ForegroundColor Yellow

    # Supprimer via l'API
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:3005/api/chat/session/$sessionId" -Method Delete
        Write-Host "✅ Session supprimée via API" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Erreur API, suppression directe du fichier..." -ForegroundColor Yellow
        Remove-Item $sessionFile.FullName -Force
        Write-Host "✅ Fichier de session supprimé" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "🎉 Nouvelle session prête!" -ForegroundColor Green
    Write-Host "👉 Rafraîchis la page dans ton navigateur (F5)" -ForegroundColor Cyan
} else {
    Write-Host "❌ Aucune session active trouvée" -ForegroundColor Red
}

Write-Host ""
Write-Host "Appuie sur une touche pour fermer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
