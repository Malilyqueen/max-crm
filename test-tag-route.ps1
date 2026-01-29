# Test de la nouvelle route POST /api/crm/leads/:id/tags
$baseUrl = "https://crm.macrea.fr"
$leadId = "66e86adf59e1cf1e6"  # ID de lead existant

# Token de test (à remplacer par un vrai token)
$token = "YOUR_JWT_TOKEN_HERE"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    tags = @("test-api", "urgent", "nouveau client")
} | ConvertTo-Json

Write-Host "🚀 Test POST /api/crm/leads/$leadId/tags..."
Write-Host "URL: $baseUrl/api/crm/leads/$leadId/tags"
Write-Host "Body: $body"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/crm/leads/$leadId/tags" `
                                  -Method POST `
                                  -Headers $headers `
                                  -Body $body

    Write-Host "✅ Succès !"
    Write-Host "Réponse: $($response | ConvertTo-Json -Depth 3)"
    
    # Test de vérification : récupérer les tags du tenant
    Write-Host ""
    Write-Host "🔍 Vérification avec GET /api/crm/tags..."
    $tagsResponse = Invoke-RestMethod -Uri "$baseUrl/api/crm/tags" `
                                      -Method GET `
                                      -Headers $headers
    
    Write-Host "Tags disponibles: $($tagsResponse.tags -join ', ')"
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $errorDetails = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorDetails)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Détails: $errorBody"
    }
}