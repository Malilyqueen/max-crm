# Test Systeme d'Alertes Vivantes M.A.X. - MVP
# Teste les 2 alertes: NoContact7d et NoReply3d

Write-Host "TEST SYSTEME D'ALERTES VIVANTES M.A.X." -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$BASE_URL = "http://localhost:3005"
$TENANT = "macrea"
$LEAD_ID_TEST = "test_lead_123" # Lead fictif pour test

# ============================================================
# TEST 1: Logger une activite sortante (OUT)
# ============================================================
Write-Host "[1/3] TEST: Logger activite OUT (message envoye)" -ForegroundColor Yellow
Write-Host ""

$body1 = @{
    leadId = $LEAD_ID_TEST
    channel = "whatsapp"
    direction = "out"
    status = "sent"
    messageSnippet = "Bonjour, premier contact WhatsApp"
    meta = @{
        from = "system_test"
    }
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "$BASE_URL/api/activities/log" `
        -Method POST `
        -Body $body1 `
        -ContentType "application/json" `
        -Headers @{
            "X-Tenant" = $TENANT
        }

    Write-Host "OK Activite loggee:" -ForegroundColor Green
    Write-Host "   ID: $($response1.activity.id)"
    Write-Host "   Lead: $($response1.activity.lead_id)"
    Write-Host "   Channel: $($response1.activity.channel) ($($response1.activity.direction))"
    Write-Host ""

    if ($response1.alerts) {
        Write-Host "Alertes generees:" -ForegroundColor Yellow
        Write-Host "   Created: $($response1.alerts.created.Count)"
        Write-Host "   Resolved: $($response1.alerts.resolved.Count)"
        Write-Host "   Unchanged: $($response1.alerts.unchanged.Count)"
    }
} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "------------------------------------------------------" -ForegroundColor Gray
Write-Host ""

# ============================================================
# TEST 2: Recuperer alertes actives
# ============================================================
Write-Host "[2/3] TEST: Recuperer alertes actives" -ForegroundColor Yellow
Write-Host ""

try {
    $response2 = Invoke-RestMethod -Uri "$BASE_URL/api/alerts/active" `
        -Method GET `
        -Headers @{
            "X-Tenant" = $TENANT
        }

    Write-Host "OK Alertes actives recuperees" -ForegroundColor Green
    Write-Host ""
    Write-Host "STATISTIQUES:" -ForegroundColor Cyan
    Write-Host "   Total: $($response2.stats.total)"
    Write-Host "   High: $($response2.stats.by_severity.high)"
    Write-Host "   Med: $($response2.stats.by_severity.med)"
    Write-Host "   Low: $($response2.stats.by_severity.low)"
    Write-Host ""
    Write-Host "   NoContact7d: $($response2.stats.by_type.NoContact7d)"
    Write-Host "   NoReply3d: $($response2.stats.by_type.NoReply3d)"
    Write-Host ""

    if ($response2.alerts.Count -gt 0) {
        Write-Host "ALERTES DETAILLEES:" -ForegroundColor Cyan
        foreach ($alert in $response2.alerts | Select-Object -First 5) {
            Write-Host ""
            Write-Host "   [$($alert.type)] $($alert.message)" -ForegroundColor White
            Write-Host "   Lead: $($alert.lead_name) ($($alert.lead_id))"
            Write-Host "   Severity: $($alert.severity)"
            if ($alert.suggested_action) {
                Write-Host "   Action suggeree: $($alert.suggested_action.action) via $($alert.suggested_action.channel)"
            }
            Write-Host "   Creee: $($alert.created_at)"
        }

        if ($response2.alerts.Count -gt 5) {
            Write-Host ""
            Write-Host "   ... et $($response2.alerts.Count - 5) autres alertes" -ForegroundColor Gray
        }
    } else {
        Write-Host "INFO: Aucune alerte active pour l'instant" -ForegroundColor Yellow
    }

} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "------------------------------------------------------" -ForegroundColor Gray
Write-Host ""

# ============================================================
# TEST 3: Logger activite entrante (IN) apres 1 sec
# ============================================================
Write-Host "[3/3] TEST: Logger activite IN (reponse recue)" -ForegroundColor Yellow
Write-Host "   (Devrait resoudre alerte NoReply3d si existante)" -ForegroundColor Gray
Write-Host ""

Start-Sleep -Seconds 1

$body3 = @{
    leadId = $LEAD_ID_TEST
    channel = "whatsapp"
    direction = "in"
    status = "replied"
    messageSnippet = "Merci pour votre message!"
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri "$BASE_URL/api/activities/log" `
        -Method POST `
        -Body $body3 `
        -ContentType "application/json" `
        -Headers @{
            "X-Tenant" = $TENANT
        }

    Write-Host "OK Reponse loggee" -ForegroundColor Green
    Write-Host ""

    if ($response3.alerts.resolved.Count -gt 0) {
        Write-Host "Alertes resolues automatiquement:" -ForegroundColor Green
        foreach ($resolved in $response3.alerts.resolved) {
            Write-Host "   - $resolved"
        }
    }

} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "TESTS TERMINES" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "ACTIONS SUIVANTES:" -ForegroundColor Yellow
Write-Host "1. Verifier dans Supabase que les tables sont remplies:" -ForegroundColor White
Write-Host "   - lead_activities (activites loggees)" -ForegroundColor Gray
Write-Host "   - max_alerts (alertes creees/resolues)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Tester alertes sur vrais leads EspoCRM:" -ForegroundColor White
Write-Host "   - Lead cree il y a >7j sans contact -> NoContact7d" -ForegroundColor Gray
Write-Host "   - Lead avec message OUT >3j sans reponse -> NoReply3d" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Integrer dashboard frontend:" -ForegroundColor White
Write-Host "   - GET /api/alerts/active -> Widget alertes" -ForegroundColor Gray
Write-Host "   - POST /api/alerts/:id/resolve -> Marquer traite" -ForegroundColor Gray
