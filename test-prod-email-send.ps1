################################################################################
# TEST 2: Envoi Email SMTP - Fonctionnalité E2E
################################################################################
#
# Objectif: Vérifier l'envoi d'email via SMTP OVH depuis le serveur de production
# et valider la réception effective.
#
# Prérequis: JWT token utilisateur valide
# Durée: ~10 secondes
#
################################################################################

Write-Host "🧪 TEST 2: Email SMTP Send E2E" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$API_URL = "https://max-api.studiomacrea.cloud"
$ENDPOINT = "/api/max/actions"
$TEST_EMAIL = "test-recipient@example.com"  # ⚠️ REMPLACER par vraie adresse test

# ⚠️ ATTENTION: Remplacer par un vrai JWT token
# Obtenir via: POST /api/auth/login avec credentials
$JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

if ($JWT_TOKEN -eq "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...") {
    Write-Host "⚠️  WARNING: JWT_TOKEN par défaut détecté" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Pour obtenir un token valide:" -ForegroundColor Gray
    Write-Host '  $response = Invoke-RestMethod -Uri "https://max-api.studiomacrea.cloud/api/auth/login" -Method POST -Body (@{username="admin";password="xxx"} | ConvertTo-Json) -ContentType "application/json"' -ForegroundColor Gray
    Write-Host '  $JWT_TOKEN = $response.token' -ForegroundColor Gray
    Write-Host ""
    Read-Host "Appuyez sur Entrée pour continuer avec le token par défaut (échouera probablement)"
}

Write-Host "📍 URL testée: $API_URL$ENDPOINT" -ForegroundColor Gray
Write-Host "📧 Destinataire: $TEST_EMAIL" -ForegroundColor Gray
Write-Host ""

# Timestamp unique pour identifier l'email
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$testId = (Get-Date).ToFileTimeUtc()

# Payload action sendEmail
$payload = @{
    action = "sendEmail"
    params = @{
        tenantId = "macrea"
        to = $TEST_EMAIL
        subject = "✅ Test Email Production - Audit $timestamp"
        body = @"
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="color: #2563eb;">✅ Email Test - Production Server</h2>
  <p>Cet email a été envoyé depuis le serveur de production lors d'un audit technique.</p>

  <h3>Informations de test:</h3>
  <ul>
    <li><strong>Test ID:</strong> $testId</li>
    <li><strong>Timestamp:</strong> $timestamp</li>
    <li><strong>Provider:</strong> SMTP OVH (ssl0.ovh.net:587)</li>
    <li><strong>From:</strong> contact@malalacrea.fr</li>
  </ul>

  <h3>Validations:</h3>
  <ol>
    <li>Email reçu dans la boîte $TEST_EMAIL ? ✅</li>
    <li>Expéditeur = contact@malalacrea.fr ? ⬜</li>
    <li>Pas de marquage spam ? ⬜</li>
    <li>Headers DKIM/SPF OK ? ⬜</li>
  </ol>

  <p style="color: #666; font-size: 12px; margin-top: 30px;">
    Si vous recevez cet email, le pipe SMTP est fonctionnel.
  </p>
</body>
</html>
"@
        from = "contact@malalacrea.fr"
    }
} | ConvertTo-Json -Depth 5

Write-Host "📤 Envoi de la requête..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod `
        -Uri "$API_URL$ENDPOINT" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $JWT_TOKEN"
            "Content-Type" = "application/json"
        } `
        -Body $payload `
        -ErrorAction Stop

    Write-Host ""
    Write-Host "📊 RÉSULTATS:" -ForegroundColor Green
    Write-Host "-------------" -ForegroundColor Green

    if ($response.success -eq $true) {
        Write-Host "✅ TEST PASSÉ: Email envoyé avec succès" -ForegroundColor Green
        Write-Host ""
        Write-Host "Provider: $($response.provider)" -ForegroundColor Gray
        Write-Host "Message ID: $($response.entityId)" -ForegroundColor Gray
        Write-Host "Preview: $($response.preview)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "🔍 VÉRIFICATIONS MANUELLES REQUISES:" -ForegroundColor Cyan
        Write-Host "  1. Ouvrir la boîte $TEST_EMAIL" -ForegroundColor White
        Write-Host "  2. Vérifier réception de l'email (peut prendre 1-2 min)" -ForegroundColor White
        Write-Host "  3. Vérifier From = contact@malalacrea.fr" -ForegroundColor White
        Write-Host "  4. Vérifier que l'email n'est PAS dans spam" -ForegroundColor White
        Write-Host "  5. Headers → Vérifier DKIM/SPF PASS" -ForegroundColor White
        Write-Host ""
        Write-Host "✓ Envoi SMTP: OK" -ForegroundColor Green
        Write-Host "✓ API endpoint: OK" -ForegroundColor Green
        Write-Host "✓ Authentification: OK" -ForegroundColor Green

    } else {
        Write-Host "❌ TEST ÉCHOUÉ: Envoi en erreur" -ForegroundColor Red
        Write-Host ""
        Write-Host "Erreur: $($response.error)" -ForegroundColor Red
        Write-Host "Preview: $($response.preview)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "🔧 Causes probables:" -ForegroundColor Yellow
        Write-Host "  1. Credentials SMTP invalides dans .env" -ForegroundColor White
        Write-Host "  2. OVH bloque le compte (quota dépassé)" -ForegroundColor White
        Write-Host "  3. Adresse destinataire blacklistée" -ForegroundColor White
        Write-Host ""
        Write-Host "📋 Logs serveur:" -ForegroundColor Yellow
        Write-Host '  ssh root@51.159.170.20 "docker logs max-backend --tail 50 | grep -i smtp"' -ForegroundColor Gray
    }

} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message

    Write-Host ""
    Write-Host "❌ TEST ÉCHOUÉ: Erreur HTTP" -ForegroundColor Red
    Write-Host "-------------" -ForegroundColor Red
    Write-Host "HTTP Status: $statusCode" -ForegroundColor Red

    if ($errorBody) {
        Write-Host "Response:" -ForegroundColor Gray
        Write-Host $errorBody -ForegroundColor Gray
    }

    Write-Host ""

    switch ($statusCode) {
        401 {
            Write-Host "🔧 Cause: JWT token invalide ou expiré" -ForegroundColor Yellow
            Write-Host "   Solution: Se reconnecter pour obtenir un nouveau token" -ForegroundColor White
        }
        403 {
            Write-Host "🔧 Cause: Permissions insuffisantes" -ForegroundColor Yellow
            Write-Host "   Solution: Vérifier le rôle utilisateur (admin requis)" -ForegroundColor White
        }
        404 {
            Write-Host "🔧 Cause: Endpoint /api/max/actions introuvable" -ForegroundColor Yellow
            Write-Host "   Solution: Vérifier server.js ligne 136 (maxActionsRouter)" -ForegroundColor White
        }
        500 {
            Write-Host "🔧 Cause: Erreur serveur (SMTP ou code)" -ForegroundColor Yellow
            Write-Host "   Solution: Consulter logs backend" -ForegroundColor White
            Write-Host '   ssh root@51.159.170.20 "docker logs max-backend --tail 100"' -ForegroundColor Gray
        }
        default {
            Write-Host "🔧 Cause: Erreur inattendue (HTTP $statusCode)" -ForegroundColor Yellow
            Write-Host "   Solution: Consulter la réponse ci-dessus" -ForegroundColor White
        }
    }
}

Write-Host ""
Write-Host "📝 NOTE: Ce test vérifie UNIQUEMENT l'envoi." -ForegroundColor Cyan
Write-Host "   Pour tracking delivery/open/click → Migrer vers SendGrid (voir AUDIT_PIPE_COMMS_PRODUCTION.md)" -ForegroundColor Cyan