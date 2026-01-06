# Test Final - Cloudflare Tunnel Consolidé
# Vérifie que ollama-tunnel gère correctement les deux hostnames

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🧪 TEST FINAL - CLOUDFLARE TUNNEL CONSOLIDÉ" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: max.studiomacrea.cloud → localhost:3005
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ TEST 1: max.studiomacrea.cloud → /api/ping" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "https://max.studiomacrea.cloud/api/ping" -Method Get -TimeoutSec 10
    Write-Host "✅ max.studiomacrea.cloud accessible!" -ForegroundColor Green
    Write-Host "   Réponse: $($response | ConvertTo-Json -Compress)" -ForegroundColor White
} catch {
    Write-Host "❌ ÉCHEC: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Vérifier que le hostname a été ajouté dans le dashboard Cloudflare" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 2: max.studiomacrea.cloud → /api/whatsapp/status
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ TEST 2: max.studiomacrea.cloud → /api/whatsapp/status" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "https://max.studiomacrea.cloud/api/whatsapp/status" -Method Get -TimeoutSec 10
    Write-Host "✅ Webhook WhatsApp accessible!" -ForegroundColor Green
    Write-Host "   Service: $($response.service)" -ForegroundColor White
    Write-Host "   Status: $($response.status)" -ForegroundColor White
} catch {
    Write-Host "❌ ÉCHEC: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 3: Simuler webhook Twilio
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ TEST 3: Webhook Twilio → /api/whatsapp/incoming" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$body = @{
    From = "whatsapp:+33612345678"
    To = "whatsapp:+14155238886"
    Body = "Test final tunnel consolidé"
    MessageSid = "SM" + (Get-Random -Minimum 100000000 -Maximum 999999999)
}

try {
    $response = Invoke-WebRequest -Uri "https://max.studiomacrea.cloud/api/whatsapp/incoming" `
        -Method Post `
        -ContentType "application/x-www-form-urlencoded" `
        -Body $body `
        -TimeoutSec 15 `
        -UseBasicParsing

    Write-Host "✅ Webhook accepté!" -ForegroundColor Green
    Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor White

    if ($response.StatusCode -eq 200) {
        Write-Host ""
        Write-Host "🎉 SUCCÈS TOTAL - Twilio peut maintenant envoyer des webhooks!" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Webhook échoué: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 4: Vérifier ollama.studiomacrea.cloud (ne doit pas être cassé)
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ TEST 4: ollama.studiomacrea.cloud (vérif non-régression)" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "https://ollama.studiomacrea.cloud" -Method Get -TimeoutSec 10 -UseBasicParsing
    Write-Host "✅ ollama.studiomacrea.cloud toujours accessible" -ForegroundColor Green
    Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor White
} catch {
    Write-Host "⚠️  ollama.studiomacrea.cloud: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   (Normal si le service Ollama n'est pas démarré)" -ForegroundColor Gray
}
Write-Host ""

# Résumé
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "📊 RÉSUMÉ" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Tunnel consolidé opérationnel" -ForegroundColor Green
Write-Host "✅ max.studiomacrea.cloud → localhost:3005 → Backend M.A.X." -ForegroundColor Green
Write-Host "✅ Webhooks Twilio fonctionnels" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 PROCHAINE ÉTAPE:" -ForegroundColor Yellow
Write-Host "   Configurer Twilio avec:" -ForegroundColor White
Write-Host "   https://max.studiomacrea.cloud/api/whatsapp/incoming" -ForegroundColor Cyan
Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan