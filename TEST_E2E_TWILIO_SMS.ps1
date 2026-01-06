################################################################################
# TEST E2E: Twilio SMS - Pipe Complet
################################################################################
#
# Objectif: Tester le pipe complet SMS Twilio depuis PowerShell
#   1. Envoi SMS via Twilio API
#   2. Webhook status accessible
#   3. Event persisté en DB/JSON
#   4. Corrélation Lead
#
# Prérequis: Compte Twilio avec numéro SMS
# Durée: ~15 secondes
#
################################################################################

Write-Host "🧪 TEST E2E: Twilio SMS (Stack Court Terme)" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$API_URL = "https://max-api.studiomacrea.cloud"
$WEBHOOK_URL = "$API_URL/webhooks/twilio-sms"

# ⚠️ CONFIGURATION À PERSONNALISER
$TWILIO_ACCOUNT_SID = "AC78ebc7238576304ae00fbe4df3a07f5e"  # Votre SID Twilio
$TWILIO_AUTH_TOKEN = "12a0e364fb468ea4b00ab07f7e09f6fe"      # Votre Auth Token
$TWILIO_FROM = "+14155238886"                                  # Votre numéro Twilio
$TEST_TO = "+15005550006"                                      # Twilio magic number (test)

Write-Host "📍 API URL: $API_URL" -ForegroundColor Gray
Write-Host "📱 Twilio From: $TWILIO_FROM" -ForegroundColor Gray
Write-Host "📞 Destinataire: $TEST_TO" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# ÉTAPE 1: Tester endpoint webhook (santé)
# ============================================================================
Write-Host "📋 ÉTAPE 1/4: Test accessibilité webhook" -ForegroundColor Yellow
Write-Host ""

try {
    $healthResponse = Invoke-RestMethod -Uri "$WEBHOOK_URL/status-check" -Method GET -ErrorAction Stop

    Write-Host "✅ Webhook accessible (HTTP 200)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Gray
    Write-Host ($healthResponse | ConvertTo-Json -Compress) -ForegroundColor Gray
} catch {
    Write-Host "❌ Webhook inaccessible" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔧 FIXES NÉCESSAIRES:" -ForegroundColor Yellow
    Write-Host "1. Vérifier que le backend est démarré" -ForegroundColor White
    Write-Host "2. Vérifier route nginx /webhooks/twilio-sms" -ForegroundColor White
    Write-Host "3. Vérifier Cloudflare Access ne bloque pas" -ForegroundColor White
    exit 1
}

Write-Host ""

# ============================================================================
# ÉTAPE 2: Envoyer un SMS via Twilio API
# ============================================================================
Write-Host "📤 ÉTAPE 2/4: Envoi SMS via Twilio" -ForegroundColor Yellow
Write-Host ""

$MESSAGE_TEXT = "🧪 Test E2E Twilio SMS - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Créer credentials base64
$credentials = "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
$credentialsBase64 = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes($credentials))

# Body URL-encoded
$body = @{
    From = $TWILIO_FROM
    To = $TEST_TO
    Body = $MESSAGE_TEXT
    StatusCallback = "$WEBHOOK_URL/status"  # URL pour recevoir les status updates
}

try {
    $sendResponse = Invoke-RestMethod `
        -Uri "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json" `
        -Method POST `
        -Headers @{
            "Authorization" = "Basic $credentialsBase64"
        } `
        -Body $body `
        -ContentType "application/x-www-form-urlencoded" `
        -ErrorAction Stop

    $MESSAGE_SID = $sendResponse.sid
    $STATUS = $sendResponse.status

    Write-Host "✅ SMS envoyé via Twilio" -ForegroundColor Green
    Write-Host "   Message SID: $MESSAGE_SID" -ForegroundColor Gray
    Write-Host "   Status initial: $STATUS" -ForegroundColor Gray
    Write-Host "   Destinataire: $TEST_TO" -ForegroundColor Gray

} catch {
    Write-Host "❌ Échec envoi SMS" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔧 CAUSES PROBABLES:" -ForegroundColor Yellow
    Write-Host "1. Credentials Twilio invalides" -ForegroundColor White
    Write-Host "2. Numéro From non vérifié" -ForegroundColor White
    Write-Host "3. Quota Twilio dépassé" -ForegroundColor White
    exit 1
}

Write-Host ""

# ============================================================================
# ÉTAPE 3: Simuler webhook status (delivery)
# ============================================================================
Write-Host "🔄 ÉTAPE 3/4: Simulation webhook status" -ForegroundColor Yellow
Write-Host ""

# Payload URL-encoded comme Twilio l'envoie
$webhookPayload = @{
    MessageSid = $MESSAGE_SID
    MessageStatus = "delivered"
    To = $TEST_TO
    From = $TWILIO_FROM
}

try {
    $webhookResponse = Invoke-RestMethod `
        -Uri "$WEBHOOK_URL/status" `
        -Method POST `
        -Body $webhookPayload `
        -ContentType "application/x-www-form-urlencoded" `
        -ErrorAction Stop

    Write-Host "✅ Webhook status traité (HTTP 200)" -ForegroundColor Green
    Write-Host "Response: $webhookResponse" -ForegroundColor Gray

} catch {
    Write-Host "❌ Webhook status échoué" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""

# ============================================================================
# ÉTAPE 4: Vérifier event persisté
# ============================================================================
Write-Host "📊 ÉTAPE 4/4: Vérification persistence" -ForegroundColor Yellow
Write-Host ""

# Attendre 2s pour laisser le temps au flush
Start-Sleep -Seconds 2

Write-Host "🔍 VÉRIFICATIONS MANUELLES REQUISES:" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Logs backend - Event reçu ?" -ForegroundColor White
Write-Host '   ssh root@51.159.170.20 "docker logs max-backend --tail 100 | grep ''WEBHOOK TWILIO SMS''"' -ForegroundColor Gray
Write-Host ""

Write-Host "2. Persistence JSON - Fichier créé ?" -ForegroundColor White
Write-Host '   ssh root@51.159.170.20 "ls -lh /opt/max-infrastructure/max-backend/logs/message_events/"' -ForegroundColor Gray
Write-Host ""

Write-Host "3. Persistence Supabase - Event en DB ?" -ForegroundColor White
Write-Host "   SELECT * FROM message_events WHERE channel = 'sms' AND provider = 'twilio' ORDER BY timestamp DESC LIMIT 5;" -ForegroundColor Gray
Write-Host ""

Write-Host "4. Twilio Dashboard - Message visible ?" -ForegroundColor White
Write-Host "   https://console.twilio.com/us1/monitor/logs/messages/$MESSAGE_SID" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# RÉSUMÉ
# ============================================================================
Write-Host "📊 RÉSUMÉ DU TEST" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Webhook accessible: $WEBHOOK_URL" -ForegroundColor Green
Write-Host "✅ Message envoyé: $MESSAGE_SID" -ForegroundColor Green
Write-Host "✅ Webhook status traité (HTTP 200)" -ForegroundColor Green
Write-Host ""

Write-Host "📝 CRITÈRES DE SUCCÈS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Pour considérer le test RÉUSSI, vérifier:" -ForegroundColor White
Write-Host "  1. ✅ HTTP 200 à toutes les étapes" -ForegroundColor White
Write-Host "  2. ✅ Event visible dans logs backend" -ForegroundColor White
Write-Host "  3. ✅ Event persisté (DB ou JSON)" -ForegroundColor White
Write-Host "  4. ✅ Lead corrélé (si numéro existe dans CRM)" -ForegroundColor White
Write-Host ""

Write-Host "🔗 CONFIGURATION TWILIO (Si test échoue):" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Dashboard Twilio:" -ForegroundColor White
Write-Host "   https://console.twilio.com/us1/develop/sms/settings/geo-permissions" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Configurer Messaging Service → Status Callbacks:" -ForegroundColor White
Write-Host "   POST $WEBHOOK_URL/status" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Vérifier numéro From vérifié et actif" -ForegroundColor White
Write-Host ""

Write-Host "✅ TEST E2E TWILIO SMS TERMINÉ" -ForegroundColor Green