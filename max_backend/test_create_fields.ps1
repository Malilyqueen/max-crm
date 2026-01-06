# Test de création de champs personnalisés via M.A.X.
# Ce script teste uniquement ce qui est POSSIBLE via l'API

$MAX_URL = "http://127.0.0.1:3005/api/chat"
$HEADERS = @{
    "Content-Type" = "application/json"
}

Write-Host "=== Test Création de Champs via M.A.X. ===" -ForegroundColor Cyan
Write-Host ""

# Message à M.A.X. pour créer les champs
$message = @"
Vérifie et crée les champs personnalisés suivants sur l'entité Lead si ils n'existent pas:

1. tags (type: multiEnum, options: ["VIP", "Prioritaire", "Urgent", "Suivi"])
2. objectifs (type: text, label: "Objectifs Business")
3. servicesSouhaites (type: text, label: "Services Souhaités")
4. statutActions (type: varchar, label: "Statut des Actions")
5. prochainesEtapes (type: text, label: "Prochaines Étapes")

Affiche-moi un résumé des champs créés au format tableau + JSON.
"@

$body = @{
    tenant = "macrea_client"
    message = $message
} | ConvertTo-Json

Write-Host "Envoi de la requête à M.A.X..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $MAX_URL -Method Post -Headers $HEADERS -Body $body -TimeoutSec 60

    Write-Host ""
    Write-Host "=== Réponse de M.A.X. ===" -ForegroundColor Green
    Write-Host $response.reply
    Write-Host ""

    if ($response.tokens_used) {
        Write-Host "Tokens utilisés: $($response.tokens_used)" -ForegroundColor Cyan
    }

} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== IMPORTANT ===" -ForegroundColor Yellow
Write-Host "Les champs sont créés dans EspoCRM, mais pas encore visibles dans l'interface."
Write-Host "Pour les rendre visibles:"
Write-Host "1. Ouvrir http://127.0.0.1:8081/espocrm"
Write-Host "2. Administration → Entity Manager → Lead → Layouts"
Write-Host "3. Ajouter les champs dans Detail, Detail (Small) et List"
Write-Host "4. Save + Administration → Rebuild"
Write-Host ""
