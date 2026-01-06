# Test End-to-End: Consent + Modify Layout
# Simule le flow complet: Demande consent -> Approuve -> Execute modifyLayout

$ErrorActionPreference = "Stop"

$API_BASE = "http://localhost:3005"

Write-Host "`n=== TEST E2E: Consent + Modify Layout ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Créer une demande de consentement pour modifier un layout
Write-Host "[1/2] Demande de consentement..." -ForegroundColor Yellow

$consentPayload = @{
    type = "layout_modification"
    description = "Test E2E: Ajout du champ testE2EField aux layouts Lead"
    details = @{
        action = "modify_layout"
        entity = "Lead"
        fieldName = "testE2EField"
        layoutTypes = @("detail", "edit", "list")
        tenantId = "macrea"
    }
} | ConvertTo-Json -Depth 5

try {
    $consentResponse = Invoke-RestMethod `
        -Uri "$API_BASE/api/consent/request" `
        -Method POST `
        -ContentType "application/json" `
        -Body $consentPayload

    $consentId = $consentResponse.consent.id
    Write-Host "   Consent ID: $consentId" -ForegroundColor Green
    Write-Host "   Status: $($consentResponse.consent.status)" -ForegroundColor Green
}
catch {
    Write-Host "   Erreur: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Exécuter l'action (consent/execute fait l'approbation automatiquement)
Write-Host "`n[2/2] Exécution de l'action via /api/consent/execute..." -ForegroundColor Yellow

try {
    $executeResponse = Invoke-RestMethod `
        -Uri "$API_BASE/api/consent/execute/$consentId" `
        -Method POST `
        -ContentType "application/json" `
        -Body "{}"

    Write-Host "   Success: $($executeResponse.success)" -ForegroundColor $(if($executeResponse.success) {"Green"} else {"Red"})

    if ($executeResponse.result) {
        Write-Host "   Preview: $($executeResponse.result.preview)" -ForegroundColor Gray

        if ($executeResponse.result.metadata) {
            Write-Host "`n   Metadata:" -ForegroundColor Gray
            Write-Host "     Layouts modifiés: $($executeResponse.result.metadata.layoutsModified)" -ForegroundColor Gray
            Write-Host "     Layouts skipped: $($executeResponse.result.metadata.layoutsSkipped)" -ForegroundColor Gray
            Write-Host "     Layouts errors: $($executeResponse.result.metadata.layoutsErrors)" -ForegroundColor Gray

            if ($executeResponse.result.metadata.results) {
                Write-Host "`n   Results:" -ForegroundColor Gray
                foreach ($result in $executeResponse.result.metadata.results) {
                    $statusColor = switch($result.status) {
                        "added" { "Green" }
                        "skipped" { "Yellow" }
                        "error" { "Red" }
                        default { "Gray" }
                    }
                    Write-Host "     - $($result.layoutType): $($result.status)" -ForegroundColor $statusColor
                }
            }
        }

        # Vérification finale
        if ($executeResponse.success -and $executeResponse.result.metadata.layoutsModified -eq 3) {
            Write-Host "`n=== SUCCESS ===" -ForegroundColor Green
            Write-Host "Les 3 layouts (detail, edit, list) ont été modifiés avec succès!" -ForegroundColor Green
            exit 0
        }
        elseif ($executeResponse.success -and $executeResponse.result.metadata.layoutsModified -gt 0) {
            Write-Host "`n=== PARTIAL SUCCESS ===" -ForegroundColor Yellow
            Write-Host "$($executeResponse.result.metadata.layoutsModified) layout(s) modifié(s) sur 3" -ForegroundColor Yellow
            exit 0
        }
        else {
            Write-Host "`n=== FAILURE ===" -ForegroundColor Red
            Write-Host "Aucun layout n'a été modifié" -ForegroundColor Red
            exit 1
        }
    }
    else {
        Write-Host "   No result in response" -ForegroundColor Red
        Write-Host "   Full response: $($executeResponse | ConvertTo-Json -Depth 10)" -ForegroundColor Gray
        exit 1
    }
}
catch {
    Write-Host "   Erreur: $_" -ForegroundColor Red
    exit 1
}
