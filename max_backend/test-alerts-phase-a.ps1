# Test Phase A - Integration logActivity() WhatsApp
# Teste avec un VRAI lead EspoCRM

Write-Host "TEST PHASE A - INTEGRATION WHATSAPP + ALERTES" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$BASE_URL = "http://localhost:3005"
$TENANT = "macrea"

# ============================================================
# STEP 1: Utiliser un lead ID reel EspoCRM
# ============================================================
Write-Host "[1/4] STEP: Configuration lead ID pour test" -ForegroundColor Yellow
Write-Host ""

# IMPORTANT: Remplacez par un vrai lead ID de votre EspoCRM
# Vous pouvez le recuperer en ouvrant EspoCRM et en copiant l'ID d'un lead existant
$LEAD_ID = "694d0bed15df5b9e1"  # Exemple - MODIFIER avec votre lead ID
$LEAD_NAME = "Lead Test Phase A"

Write-Host "Lead configure pour test:" -ForegroundColor Green
Write-Host "   ID: $LEAD_ID"
Write-Host "   Nom: $LEAD_NAME"
Write-Host ""
Write-Host "NOTE: Pour utiliser un autre lead, modifiez la variable LEAD_ID" -ForegroundColor Gray
Write-Host ""

Write-Host "------------------------------------------------------" -ForegroundColor Gray
Write-Host ""

# ============================================================
# STEP 2: Logger une activite sortante (OUT)
# ============================================================
Write-Host "[2/4] STEP: Logger activite OUT (message envoye)" -ForegroundColor Yellow
Write-Host ""

$body2 = @{
    leadId = $LEAD_ID
    channel = "whatsapp"
    direction = "out"
    status = "sent"
    messageSnippet = "Test Phase A - Message WhatsApp sortant"
    meta = @{
        source = "test_phase_a"
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

    Write-Host "OK Activite OUT loggee:" -ForegroundColor Green
    Write-Host "   ID: $($response2.activity.id)"
    Write-Host "   Lead: $($response2.activity.lead_id)"
    Write-Host "   Channel: $($response2.activity.channel) ($($response2.activity.direction))"
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
# STEP 3: Recuperer alertes actives
# ============================================================
Write-Host "[3/4] STEP: Recuperer alertes actives" -ForegroundColor Yellow
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
Write-Host "------------------------------------------------------" -ForegroundColor Gray
Write-Host ""

# ============================================================
# STEP 4: Logger activite entrante (IN)
# ============================================================
Write-Host "[4/4] STEP: Logger activite IN (reponse recue)" -ForegroundColor Yellow
Write-Host "   (Devrait resoudre alerte NoReply3d si existante)" -ForegroundColor Gray
Write-Host ""

$body4 = @{
    leadId = $LEAD_ID
    channel = "whatsapp"
    direction = "in"
    status = "replied"
    messageSnippet = "Test Phase A - Reponse du lead"
} | ConvertTo-Json

try {
    $response4 = Invoke-RestMethod -Uri "$BASE_URL/api/activities/log" `
        -Method POST `
        -Body $body4 `
        -ContentType "application/json" `
        -Headers @{
            "X-Tenant" = $TENANT
        }

    Write-Host "OK Reponse IN loggee:" -ForegroundColor Green
    Write-Host "   ID: $($response4.activity.id)"
    Write-Host ""

    if ($response4.alerts.resolved -and $response4.alerts.resolved.Count -gt 0) {
        Write-Host "Alertes resolues automatiquement:" -ForegroundColor Green
        foreach ($resolved in $response4.alerts.resolved) {
            Write-Host "   - $resolved"
        }
    }

} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "TESTS PHASE A TERMINES" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "VERIFICATION DANS SUPABASE:" -ForegroundColor Yellow
Write-Host "1. Ouvrir Supabase SQL Editor" -ForegroundColor White
Write-Host "2. Executer:" -ForegroundColor White
Write-Host ""
Write-Host "   SELECT * FROM lead_activities" -ForegroundColor Gray
Write-Host "   WHERE lead_id = '$LEAD_ID'" -ForegroundColor Gray
Write-Host "   ORDER BY created_at DESC;" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Vous devriez voir 2 activites:" -ForegroundColor White
Write-Host "   - 1 OUT (message envoye)" -ForegroundColor Gray
Write-Host "   - 1 IN (reponse recue)" -ForegroundColor Gray
Write-Host ""
Write-Host "PROCHAINE ETAPE:" -ForegroundColor Yellow
Write-Host "- Phase B: Integrer dans routes/chat.js (M.A.X. AI)" -ForegroundColor White
Write-Host "- Frontend: Widget AlertsWidget.tsx" -ForegroundColor White
