# Test de séparation des tags PROD vs LOCAL
# Objectif: Vérifier que Campaign ne voit que les tags prod

$prodUrl = "https://crm.macrea.fr"
$localUrl = "http://localhost:3005"
$leadId = "66e86adf59e1cf1e6"  # À remplacer par un vrai ID

# Token de test (à remplacer)
$token = "YOUR_JWT_TOKEN_HERE"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "🧪 TEST SÉPARATION ENVIRONNEMENTS TAGS" -ForegroundColor Green
Write-Host "======================================="

# ===================================================================
# ÉTAPE 1: Créer un tag unique en LOCAL
# ===================================================================
Write-Host ""
Write-Host "📍 ÉTAPE 1: Créer tag 'local-test' en environnement LOCAL" -ForegroundColor Yellow

$localTagBody = @{
    tags = @("local-test-$(Get-Date -Format 'yyyyMMdd-HHmm')")
} | ConvertTo-Json

try {
    Write-Host "🔗 POST $localUrl/api/crm/leads/$leadId/tags"
    $localResponse = Invoke-RestMethod -Uri "$localUrl/api/crm/leads/$leadId/tags" `
                                       -Method POST `
                                       -Headers $headers `
                                       -Body $localTagBody
    
    Write-Host "✅ Tag LOCAL créé: $($localResponse.addedTags -join ', ')" -ForegroundColor Green
    $localTag = $localResponse.addedTags[0]
} catch {
    Write-Host "❌ Erreur création tag local: $($_.Exception.Message)" -ForegroundColor Red
    $localTag = "local-test-fallback"
}

# ===================================================================  
# ÉTAPE 2: Vérifier que le tag LOCAL n'apparaît PAS en PROD
# ===================================================================
Write-Host ""
Write-Host "📍 ÉTAPE 2: Vérifier que '$localTag' n'apparaît PAS en PROD" -ForegroundColor Yellow

try {
    Write-Host "🔗 GET $prodUrl/api/crm/tags"
    $prodTagsResponse = Invoke-RestMethod -Uri "$prodUrl/api/crm/tags" `
                                          -Method GET `
                                          -Headers $headers
    
    $prodTags = $prodTagsResponse.tags
    
    if ($prodTags -contains $localTag) {
        Write-Host "❌ ÉCHEC: Tag local '$localTag' visible en PROD!" -ForegroundColor Red
        Write-Host "🔍 Tags PROD trouvés: $($prodTags -join ', ')"
    } else {
        Write-Host "✅ SUCCÈS: Tag local '$localTag' INVISIBLE en PROD" -ForegroundColor Green
        Write-Host "📊 Nombre de tags PROD: $($prodTags.Count)"
    }
} catch {
    Write-Host "❌ Erreur récupération tags prod: $($_.Exception.Message)" -ForegroundColor Red
}

# ===================================================================
# ÉTAPE 3: Créer un tag unique en PROD
# ===================================================================
Write-Host ""
Write-Host "📍 ÉTAPE 3: Créer tag 'prod-test' en environnement PROD" -ForegroundColor Yellow

$prodTagBody = @{
    tags = @("prod-test-$(Get-Date -Format 'yyyyMMdd-HHmm')")
} | ConvertTo-Json

try {
    Write-Host "🔗 POST $prodUrl/api/crm/leads/$leadId/tags"
    $prodTagResponse = Invoke-RestMethod -Uri "$prodUrl/api/crm/leads/$leadId/tags" `
                                         -Method POST `
                                         -Headers $headers `
                                         -Body $prodTagBody
    
    Write-Host "✅ Tag PROD créé: $($prodTagResponse.addedTags -join ', ')" -ForegroundColor Green
    $prodTag = $prodTagResponse.addedTags[0]
} catch {
    Write-Host "❌ Erreur création tag prod: $($_.Exception.Message)" -ForegroundColor Red
    $prodTag = "prod-test-fallback"
}

# ===================================================================
# ÉTAPE 4: Vérifier que le tag PROD apparaît bien en PROD
# ===================================================================
Write-Host ""
Write-Host "📍 ÉTAPE 4: Vérifier que '$prodTag' apparaît bien en PROD" -ForegroundColor Yellow

Start-Sleep -Seconds 2  # Attendre sync cache

try {
    Write-Host "🔗 GET $prodUrl/api/crm/tags (après sync)"
    $finalTagsResponse = Invoke-RestMethod -Uri "$prodUrl/api/crm/tags" `
                                           -Method GET `
                                           -Headers $headers
    
    $finalTags = $finalTagsResponse.tags
    
    if ($finalTags -contains $prodTag) {
        Write-Host "✅ SUCCÈS: Tag prod '$prodTag' VISIBLE en PROD" -ForegroundColor Green
    } else {
        Write-Host "❌ ÉCHEC: Tag prod '$prodTag' INVISIBLE en PROD!" -ForegroundColor Red
    }
    
    Write-Host "📋 Tous les tags PROD: $($finalTags -join ', ')"
    
} catch {
    Write-Host "❌ Erreur vérification finale: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🏁 TEST TERMINÉ" -ForegroundColor Magenta
Write-Host "================"
Write-Host "✅ Si pas d'erreur: Séparation environnements OK"
Write-Host "❌ Si échec: Vérifier migration SQL et variables CRM_ENV"