# Test webhook avec debug pour voir la structure exacte
$body = @{
    tenant = "macrea"
    actor = "MAX"
    data = @{
        leadId = "test-debug"
        leadName = "Test Debug"
        leadPhone = "+33648662734"
        messageSuggestion = "TEST DEBUG - verification structure"
    }
} | ConvertTo-Json -Depth 3

Write-Host "=== PAYLOAD ENVOYE ==="
Write-Host $body
Write-Host ""
Write-Host "=== STRUCTURE ==="
Write-Host "data.leadPhone = +33648662734"
Write-Host ""

try {
    $result = Invoke-RestMethod -Uri "http://127.0.0.1:5678/webhook/wf-relance-j3-whatsapp" -Method Post -ContentType "application/json" -Body $body
    Write-Host "OK Webhook declenche!"
    Write-Host "Resultat: $result"
} catch {
    Write-Host "ERREUR: $_"
}

Write-Host ""
Write-Host "Maintenant dans n8n:"
Write-Host "1. Cliquez sur le noeud Webhook"
Write-Host "2. Regardez l'onglet OUTPUT en bas"
Write-Host "3. Verifiez le chemin exact vers leadPhone"
