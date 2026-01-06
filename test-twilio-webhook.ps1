# Test Webhook Twilio WhatsApp - M.A.X. + Cloudflare
# Usage: .\test-twilio-webhook.ps1

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🧪 TEST WEBHOOK TWILIO WHATSAPP - M.A.X." -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BASE_URL = "https://max.studiomacrea.cloud"
$WEBHOOK_PATH = "/api/whatsapp/incoming"
$WEBHOOK_URL = "$BASE_URL$WEBHOOK_PATH"

Write-Host "📍 URL de base: $BASE_URL" -ForegroundColor Yellow
Write-Host "📍 Webhook: $WEBHOOK_PATH" -ForegroundColor Yellow
Write-Host ""

# Test 1: Healthcheck global
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ TEST 1: Healthcheck Global (/api/ping)" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/ping" -Method Get -TimeoutSec 10
    Write-Host "✅ Backend M.A.X. répond!" -ForegroundColor Green
    Write-Host "   Réponse: $($response | ConvertTo-Json -Compress)" -ForegroundColor White
} catch {
    Write-Host "❌ Healthcheck échoué: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Vérifier que:" -ForegroundColor Yellow
    Write-Host "   - Backend M.A.X. tourne (npm start dans max_backend/)" -ForegroundColor Yellow
    Write-Host "   - Cloudflare Tunnel est actif (cloudflared tunnel list)" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 2: Healthcheck WhatsApp
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ TEST 2: Healthcheck WhatsApp (/api/whatsapp/status)" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/whatsapp/status" -Method Get -TimeoutSec 10
    Write-Host "✅ Webhook WhatsApp accessible!" -ForegroundColor Green
    Write-Host "   Service: $($response.service)" -ForegroundColor White
    Write-Host "   Status: $($response.status)" -ForegroundColor White
    Write-Host "   Timestamp: $($response.timestamp)" -ForegroundColor White
} catch {
    Write-Host "❌ Healthcheck WhatsApp échoué: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 3: Simuler webhook Twilio (message texte)
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ TEST 3: Simuler Webhook Twilio - Message Texte" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$body = @{
    From = "whatsapp:+33612345678"
    To = "whatsapp:+14155238886"
    Body = "Test depuis PowerShell - Cloudflare OK"
    MessageSid = "SM" + (Get-Random -Minimum 100000000 -Maximum 999999999)
}

Write-Host "📤 Envoi webhook POST:" -ForegroundColor Cyan
Write-Host "   From: $($body.From)" -ForegroundColor White
Write-Host "   To: $($body.To)" -ForegroundColor White
Write-Host "   Body: $($body.Body)" -ForegroundColor White
Write-Host "   MessageSid: $($body.MessageSid)" -ForegroundColor White
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $WEBHOOK_URL `
        -Method Post `
        -ContentType "application/x-www-form-urlencoded" `
        -Body $body `
        -TimeoutSec 15 `
        -UseBasicParsing

    Write-Host "✅ Webhook accepté!" -ForegroundColor Green
    Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor White
    Write-Host "   Réponse: $($response.Content)" -ForegroundColor White

    if ($response.StatusCode -eq 200) {
        Write-Host ""
        Write-Host "🎉 SUCCÈS - Twilio recevrait un 200 OK!" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Webhook échoué: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Vérifier les logs backend M.A.X. pour plus de détails" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 4: Simuler clic sur bouton (ButtonPayload)
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ TEST 4: Simuler Clic sur Bouton (ButtonPayload)" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$bodyButton = @{
    From = "whatsapp:+33612345678"
    To = "whatsapp:+14155238886"
    ButtonPayload = "action=confirm|type=appointment|lead=67894d27f5df5c5c2|tenant=macrea"
    MessageSid = "SM" + (Get-Random -Minimum 100000000 -Maximum 999999999)
}

Write-Host "📤 Envoi webhook POST avec ButtonPayload:" -ForegroundColor Cyan
Write-Host "   ButtonPayload: $($bodyButton.ButtonPayload)" -ForegroundColor White
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $WEBHOOK_URL `
        -Method Post `
        -ContentType "application/x-www-form-urlencoded" `
        -Body $bodyButton `
        -TimeoutSec 15 `
        -UseBasicParsing

    Write-Host "✅ Webhook bouton accepté!" -ForegroundColor Green
    Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor White
    Write-Host "   Réponse: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "❌ Webhook bouton échoué: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Résumé final
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "📊 RÉSUMÉ DES TESTS" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Backend M.A.X. accessible via Cloudflare" -ForegroundColor Green
Write-Host "✅ Webhook WhatsApp opérationnel" -ForegroundColor Green
Write-Host "✅ Format Twilio (application/x-www-form-urlencoded) supporté" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 PROCHAINE ÉTAPE:" -ForegroundColor Yellow
Write-Host "   1. Configurer Twilio Sandbox:" -ForegroundColor White
Write-Host "      https://console.twilio.com/us1/develop/sms/settings/whatsapp-sender" -ForegroundColor Cyan
Write-Host ""
Write-Host "   2. URL à mettre dans 'When a message comes in':" -ForegroundColor White
Write-Host "      $WEBHOOK_URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "   3. Méthode: HTTP POST" -ForegroundColor White
Write-Host ""
Write-Host "   4. Tester avec un vrai message WhatsApp au sandbox" -ForegroundColor White
Write-Host ""
Write-Host "📝 Voir: CLOUDFLARE_TWILIO_SETUP.md pour la config complète" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan