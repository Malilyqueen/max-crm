$body = @{
    tenant = "macrea"
    actor = "MAX"
    data = @{
        leadId = "test-ps"
        leadName = "Test PowerShell"
        leadPhone = "+33648662734"
        messageSuggestion = "🎯 TEST FINAL: Message dynamique depuis PowerShell!"
    }
} | ConvertTo-Json -Depth 3

Write-Host "Envoi du webhook..."
Write-Host "Body: $body"

try {
    $result = Invoke-RestMethod -Uri "http://127.0.0.1:5678/webhook/wf-relance-j3-whatsapp" -Method Post -ContentType "application/json" -Body $body
    Write-Host "✅ Succès!"
    Write-Host "Résultat: $result"
} catch {
    Write-Host "❌ Erreur: $_"
}
