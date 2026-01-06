# Test décisif - Vérifier que le dashboard retourne les vraies activités
# Usage: .\test-decisif.ps1 "VOTRE_JWT_TOKEN"

param(
    [Parameter(Mandatory=$false)]
    [string]$JwtToken
)

Write-Host ""
Write-Host "🔍 TEST DÉCISIF - Dashboard Activités M.A.X." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Vérifier si le token est fourni
if ([string]::IsNullOrEmpty($JwtToken)) {
    Write-Host "❌ ERREUR: Token JWT manquant" -ForegroundColor Red
    Write-Host ""
    Write-Host "USAGE:" -ForegroundColor Yellow
    Write-Host "  1. Ouvrir le frontend: http://localhost:5173"
    Write-Host "  2. Se connecter"
    Write-Host "  3. Ouvrir DevTools (F12) > Application > Local Storage"
    Write-Host "  4. Chercher 'auth-storage'"
    Write-Host "  5. Copier la valeur de 'state.token'"
    Write-Host "  6. Lancer: .\test-decisif.ps1 `"<TOKEN>`""
    Write-Host ""
    Write-Host "EXEMPLE:" -ForegroundColor Yellow
    Write-Host '  .\test-decisif.ps1 "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOi..."'
    Write-Host ""
    exit 1
}

Write-Host "📋 ÉTAPE 1: Créer des actions de test" -ForegroundColor Yellow
Write-Host ""

# Créer action 1 - Opportunité
try {
    $body1 = @{
        actionType = "create_opportunity"
        params = @{
            tenantId = "macrea"
            name = "Test Décisif - Opportunité"
            amount = 20000
            closeDate = "2025-09-01"
            stage = "Negotiation"
        }
    } | ConvertTo-Json -Depth 10

    $response1 = Invoke-RestMethod -Uri "http://localhost:3005/api/action-layer/run" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body1

    if ($response1.success) {
        Write-Host "   ✅ Opportunité créée" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Échec création opportunité" -ForegroundColor Red
    }
} catch {
    Write-Host "   ⚠️ Erreur création opportunité: $($_.Exception.Message)" -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

# Créer action 2 - Ticket
try {
    $body2 = @{
        actionType = "create_ticket"
        params = @{
            tenantId = "macrea"
            name = "Test Décisif - Ticket"
            description = "Validation du patch Quick Fix A"
            priority = "High"
            status = "New"
        }
    } | ConvertTo-Json -Depth 10

    $response2 = Invoke-RestMethod -Uri "http://localhost:3005/api/action-layer/run" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body2

    if ($response2.success) {
        Write-Host "   ✅ Ticket créé" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Échec création ticket" -ForegroundColor Red
    }
} catch {
    Write-Host "   ⚠️ Erreur création ticket: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 ÉTAPE 2: Vérifier actionLogger" -ForegroundColor Yellow
Write-Host ""

try {
    $logsResponse = Invoke-RestMethod -Uri "http://localhost:3005/api/action-layer/logs?limit=5&tenantId=macrea"
    $logsCount = $logsResponse.count

    Write-Host "   ✅ ActionLogger contient $logsCount logs" -ForegroundColor Green
} catch {
    Write-Host "   ❌ ActionLogger inaccessible: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 ÉTAPE 3: Tester /dashboard-mvp1/stats avec JWT" -ForegroundColor Yellow
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $JwtToken"
        "X-Tenant" = "macrea"
    }

    $dashboardResponse = Invoke-RestMethod -Uri "http://localhost:3005/api/dashboard-mvp1/stats" `
        -Method Get `
        -Headers $headers

    if ($dashboardResponse.error) {
        Write-Host "   ❌ ÉCHEC - Erreur retournée: $($dashboardResponse.error)" -ForegroundColor Red
        exit 1
    }

    $activityCount = $dashboardResponse.recentActivity.Count
    $maxInteractions = $dashboardResponse.stats.maxInteractions

    Write-Host "   ✅ Réponse reçue (200 OK)" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 RÉSULTATS:" -ForegroundColor Cyan
    Write-Host "   - Activités récentes: $activityCount" -ForegroundColor White
    Write-Host "   - Max Interactions: $maxInteractions" -ForegroundColor White
    Write-Host ""

    # Afficher les 3 premières activités
    Write-Host "🔍 Aperçu des activités:" -ForegroundColor Yellow
    $dashboardResponse.recentActivity | Select-Object -First 3 | ForEach-Object {
        Write-Host "   • $($_.title) - $($_.description)" -ForegroundColor White
    }

    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""

    # Validation finale
    if ($activityCount -gt 0) {
        Write-Host "🎉 TEST DÉCISIF: ✅ RÉUSSI" -ForegroundColor Green
        Write-Host ""
        Write-Host "Le dashboard retourne $activityCount activités réelles depuis actionLogger." -ForegroundColor Green
        Write-Host "Les données mockées ont été remplacées avec succès!" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "❌ TEST DÉCISIF: ÉCHEC" -ForegroundColor Red
        Write-Host ""
        Write-Host "Le dashboard ne retourne aucune activité." -ForegroundColor Red
        Write-Host "Vérifier que des actions ont été exécutées via M.A.X." -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }

} catch {
    Write-Host "   ❌ ERREUR lors de l'appel dashboard: $($_.Exception.Message)" -ForegroundColor Red

    # Afficher plus de détails sur l'erreur
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   Status Code: $statusCode" -ForegroundColor Yellow

        if ($statusCode -eq 401) {
            Write-Host ""
            Write-Host "⚠️  Token JWT invalide ou expiré." -ForegroundColor Yellow
            Write-Host "   Veuillez récupérer un nouveau token depuis le frontend." -ForegroundColor Yellow
        }
    }

    Write-Host ""
    exit 1
}