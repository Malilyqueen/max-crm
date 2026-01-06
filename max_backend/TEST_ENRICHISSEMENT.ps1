# Script de test de l'enrichissement intelligent
# Teste l'analyse d'un email de test

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   TEST ENRICHISSEMENT INTELLIGENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Email de test
$testEmail = "contact@cosmetics-paris.com"

Write-Host "Test avec email: $testEmail" -ForegroundColor Yellow
Write-Host ""

# Créer un payload de test pour l'API
$payload = @{
    sessionId = "test-enrichissement"
    message = "Analyse l'email $testEmail et dis-moi ce que tu en déduis (secteur, tags, services)"
} | ConvertTo-Json

Write-Host "Envoi de la requête à M.A.X..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3005/api/chat" -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 30

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   RÉPONSE DE M.A.X." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host $response.message -ForegroundColor White
    Write-Host ""

    if ($response.toolCalls) {
        Write-Host "Outils appelés:" -ForegroundColor Cyan
        foreach ($tool in $response.toolCalls) {
            Write-Host "  - $($tool.name)" -ForegroundColor Gray
        }
        Write-Host ""
    }

} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   ERREUR" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Impossible de contacter M.A.X." -ForegroundColor Red
    Write-Host "Vérifiez que le serveur est démarré sur le port 3005" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Détails: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
