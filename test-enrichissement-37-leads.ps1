# Test Enrichissement 100% - 37 Leads
# Validation philosophie M.A.X. "ZÉRO ignoré"

Write-Host "🧪 TEST ENRICHISSEMENT 100% - PHILOSOPHIE M.A.X." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Vérifier que le backend tourne
Write-Host "1️⃣ Vérification backend..." -ForegroundColor Yellow
$backendRunning = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*max_backend*"}

if (!$backendRunning) {
    Write-Host "❌ Backend non démarré" -ForegroundColor Red
    Write-Host "   Démarrer avec: cd max_backend && npm start" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Backend actif" -ForegroundColor Green
Write-Host ""

# Test API enrichissement
Write-Host "2️⃣ Lancement enrichissement auto..." -ForegroundColor Yellow

$body = @{
    message = "Enrichis tous les leads sans secteur"
    sessionId = "test_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    mode = "auto"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/chat" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -Headers @{
            "X-Tenant" = "macrea"
            "X-Role" = "admin"
        }

    Write-Host "✅ Requête envoyée" -ForegroundColor Green
    Write-Host ""

    # Afficher la réponse
    Write-Host "3️⃣ Réponse M.A.X.:" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

    if ($response.answer) {
        Write-Host $response.answer -ForegroundColor White
    } elseif ($response.response) {
        Write-Host $response.response -ForegroundColor White
    } else {
        Write-Host ($response | ConvertTo-Json -Depth 5) -ForegroundColor White
    }

    Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray
    Write-Host ""

    # Vérifications critiques
    Write-Host "4️⃣ Validation philosophie 100%:" -ForegroundColor Yellow

    $responseText = if ($response.answer) { $response.answer } else { $response.response }

    # ❌ Vérifier absence de "ignorés"
    if ($responseText -match "ignoré") {
        Write-Host "❌ ÉCHEC: Message contient 'ignoré'" -ForegroundColor Red
        Write-Host "   → Philosophie 100% non respectée" -ForegroundColor Red
    } else {
        Write-Host "✅ Pas de message 'ignoré'" -ForegroundColor Green
    }

    # ✅ Vérifier présence "100%"
    if ($responseText -match "100%") {
        Write-Host "✅ Message contient '100%'" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING: '100%' absent du message" -ForegroundColor Yellow
    }

    # ✅ Vérifier stratégies multi-canal
    if ($responseText -match "(WhatsApp|email|téléphone|hypothèse)") {
        Write-Host "✅ Stratégies multi-canal mentionnées" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING: Stratégies multi-canal absentes" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "✅ TEST TERMINÉ" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Prochaines étapes:" -ForegroundColor Yellow
    Write-Host "1. Vérifier dans EspoCRM que TOUS les leads ont:" -ForegroundColor White
    Write-Host "   • secteurInfere rempli (même 'inconnu')" -ForegroundColor Gray
    Write-Host "   • tagsIA avec au moins 1 tag" -ForegroundColor Gray
    Write-Host "   • description enrichie" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Vérifier tags stratégiques:" -ForegroundColor White
    Write-Host "   • whatsapp (téléphone uniquement)" -ForegroundColor Gray
    Write-Host "   • email_only (email uniquement)" -ForegroundColor Gray
    Write-Host "   • hypothèse_IA (données minimales)" -ForegroundColor Gray

} catch {
    Write-Host "❌ ERREUR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vérifier:" -ForegroundColor Yellow
    Write-Host "• Backend démarré: cd max_backend && npm start" -ForegroundColor Gray
    Write-Host "• Port 3001 accessible" -ForegroundColor Gray
    exit 1
}
