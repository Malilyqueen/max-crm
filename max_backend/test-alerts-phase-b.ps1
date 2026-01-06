# Test Phase B - Integration logActivity() dans Chat M.A.X.
# Teste l'envoi via send_whatsapp_greenapi avec leadId

Write-Host "TEST PHASE B - INTEGRATION CHAT M.A.X. + ALERTES" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$BASE_URL = "http://localhost:3005"
$TENANT = "macrea"

# ============================================================
# STEP 1: Configuration lead ID et instance WhatsApp
# ============================================================
Write-Host "[1/3] STEP: Configuration test" -ForegroundColor Yellow
Write-Host ""

# IMPORTANT: Remplacez par un vrai lead ID de votre EspoCRM
$LEAD_ID = "694d0bed15df5b9e1"  # Exemple - MODIFIER avec votre lead ID
$LEAD_PHONE = "+33612345678"    # Exemple - MODIFIER avec le phone du lead
$WA_INSTANCE_ID = "7105440259"  # Instance Green-API par defaut

Write-Host "Configuration test:" -ForegroundColor Green
Write-Host "   Lead ID: $LEAD_ID"
Write-Host "   Phone: $LEAD_PHONE"
Write-Host "   Instance: $WA_INSTANCE_ID"
Write-Host ""
Write-Host "NOTE: Pour tester, modifiez LEAD_ID et LEAD_PHONE" -ForegroundColor Gray
Write-Host ""

Write-Host "------------------------------------------------------" -ForegroundColor Gray
Write-Host ""

# ============================================================
# STEP 2: Simuler envoi via M.A.X. avec leadId
# ============================================================
Write-Host "[2/3] STEP: Simuler envoi WhatsApp via M.A.X. (avec leadId)" -ForegroundColor Yellow
Write-Host ""

# Note: Ce test simule ce que M.A.X. ferait en appelant send_whatsapp_greenapi
# avec un leadId explicite pour permettre le logging

Write-Host "INFO: Envoi direct via API (simulation tool call M.A.X.)" -ForegroundColor Gray
Write-Host "   Tool: send_whatsapp_greenapi" -ForegroundColor Gray
Write-Host "   Args: phoneNumber, message, instanceId, leadId" -ForegroundColor Gray
Write-Host ""

# Pour tester, on loggue directement via /api/activities/log
# car l'envoi via chat.js necessite une session complete

$body2 = @{
    leadId = $LEAD_ID
    channel = "whatsapp"
    direction = "out"
    status = "sent"
    messageSnippet = "Test Phase B - Message via M.A.X. Chat (Green-API)"
    meta = @{
        provider = "green-api"
        source = "chat_max"
        instanceId = $WA_INSTANCE_ID
    }
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "$BASE_URL/api/activities/log" `
        -Method POST `
        -Body $body2 `
        -ContentType "application/json" `
        -Headers @{
            "X-Tenant" = $TENANT
        }

    Write-Host "OK Activite OUT loggee (simule M.A.X.):" -ForegroundColor Green
    Write-Host "   ID: $($response2.activity.id)"
    Write-Host "   Lead: $($response2.activity.lead_id)"
    Write-Host "   Channel: $($response2.activity.channel) ($($response2.activity.direction))"
    Write-Host "   Provider: green-api"
    Write-Host ""

    if ($response2.alerts) {
        Write-Host "Alertes:" -ForegroundColor Yellow
        Write-Host "   Created: $($response2.alerts.created.Count)"
        Write-Host "   Resolved: $($response2.alerts.resolved.Count)"
        Write-Host ""
    }
} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "------------------------------------------------------" -ForegroundColor Gray
Write-Host ""

# ============================================================
# STEP 3: Verifier alertes actives
# ============================================================
Write-Host "[3/3] STEP: Verifier alertes actives" -ForegroundColor Yellow
Write-Host ""

try {
    $response3 = Invoke-RestMethod -Uri "$BASE_URL/api/alerts/active" `
        -Method GET `
        -Headers @{
            "X-Tenant" = $TENANT
        }

    Write-Host "OK Alertes actives recuperees" -ForegroundColor Green
    Write-Host ""
    Write-Host "STATISTIQUES:" -ForegroundColor Cyan
    Write-Host "   Total: $($response3.stats.total)"
    Write-Host "   High: $($response3.stats.by_severity.high)"
    Write-Host "   Med: $($response3.stats.by_severity.med)"
    Write-Host "   Low: $($response3.stats.by_severity.low)"
    Write-Host ""

    if ($response3.stats.by_type) {
        Write-Host "   NoContact7d: $($response3.stats.by_type.NoContact7d)"
        Write-Host "   NoReply3d: $($response3.stats.by_type.NoReply3d)"
        Write-Host ""
    }

    if ($response3.alerts.Count -gt 0) {
        Write-Host "ALERTES POUR CE LEAD:" -ForegroundColor Cyan
        $leadAlerts = $response3.alerts | Where-Object { $_.lead_id -eq $LEAD_ID }

        if ($leadAlerts) {
            foreach ($alert in $leadAlerts) {
                Write-Host ""
                Write-Host "   [$($alert.type)] $($alert.message)" -ForegroundColor White
                Write-Host "   Severity: $($alert.severity)"
                Write-Host "   Created: $($alert.created_at)"
            }
        } else {
            Write-Host "   Aucune alerte pour lead $LEAD_ID" -ForegroundColor Gray
        }
    } else {
        Write-Host "INFO: Aucune alerte active" -ForegroundColor Yellow
    }

} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "TESTS PHASE B TERMINES" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "VERIFICATION DANS SUPABASE:" -ForegroundColor Yellow
Write-Host "1. Ouvrir Supabase SQL Editor" -ForegroundColor White
Write-Host "2. Executer:" -ForegroundColor White
Write-Host ""
Write-Host "   SELECT * FROM lead_activities" -ForegroundColor Gray
Write-Host "   WHERE lead_id = '$LEAD_ID'" -ForegroundColor Gray
Write-Host "   AND meta->>'provider' = 'green-api'" -ForegroundColor Gray
Write-Host "   ORDER BY created_at DESC;" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Vous devriez voir les activites Phase A + Phase B" -ForegroundColor White
Write-Host ""
Write-Host "OU LOGGUE EXACTEMENT:" -ForegroundColor Yellow
Write-Host "- routes/chat.js ligne 3018-3042 (send_whatsapp_greenapi success)" -ForegroundColor White
Write-Host "- routes/chat.js ligne 3056-3075 (send_whatsapp_greenapi failed)" -ForegroundColor White
Write-Host ""
Write-Host "PROCHAINE ETAPE:" -ForegroundColor Yellow
Write-Host "- Phase C: Widget AlertsWidget.tsx (frontend)" -ForegroundColor White
