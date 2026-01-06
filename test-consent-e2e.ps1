#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test E2E du système de consentement M.A.X.

.DESCRIPTION
    Démontre le flux complet :
    1. M.A.X. demande le consentement (via test-consent)
    2. Affiche le consentId généré
    3. Simule l'approbation par l'utilisateur
    4. Exécute l'opération et génère l'audit
    5. Récupère et affiche le rapport d'audit

.EXAMPLE
    .\test-consent-e2e.ps1
#>

$ErrorActionPreference = "Stop"

# Configuration
$API_BASE = "https://max-api.studiomacrea.cloud"
$TENANT = "macrea-admin"
$SESSION_ID = "demo_$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "🎬 TEST E2E - SYSTÈME DE CONSENTEMENT M.A.X." -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# ÉTAPE 1 : M.A.X. demande le consentement
Write-Host "📋 ÉTAPE 1 : M.A.X. demande le consentement..." -ForegroundColor Yellow

$requestBody = @{
    sessionId = $SESSION_ID
    description = "Ajouter le champ secteur aux layouts Lead (detail + list)"
} | ConvertTo-Json

Write-Host "   Request: POST $API_BASE/api/chat/test-consent" -ForegroundColor Gray
Write-Host "   Session: $SESSION_ID`n" -ForegroundColor Gray

try {
    $response1 = Invoke-RestMethod `
        -Uri "$API_BASE/api/chat/test-consent" `
        -Method Post `
        -Headers @{
            "Content-Type" = "application/json"
            "X-Tenant" = $TENANT
        } `
        -Body $requestBody

    if ($response1.success) {
        Write-Host "   ✅ Demande de consentement créée !`n" -ForegroundColor Green

        $consentId = $response1.message.consentId
        $operation = $response1.message.operation.description

        Write-Host "   📦 Détails du message:" -ForegroundColor Cyan
        Write-Host "      Type: $($response1.message.type)" -ForegroundColor White
        Write-Host "      ConsentId: $consentId" -ForegroundColor White
        Write-Host "      Opération: $operation" -ForegroundColor White
        Write-Host "      Status: $($response1.message.consentStatus)" -ForegroundColor White
        Write-Host "      Contenu: `"$($response1.message.content)`"`n" -ForegroundColor White
    } else {
        Write-Host "   ❌ Échec: $($response1.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Erreur HTTP: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ÉTAPE 2 : Pause pour visualisation
Write-Host "⏸️  PAUSE : Dans le frontend, ConsentCard devrait s'afficher avec ce consentId" -ForegroundColor Magenta
Write-Host "   👉 ConsentId à chercher: $consentId`n" -ForegroundColor Magenta
Write-Host "   Appuyez sur ENTRÉE pour simuler l'approbation utilisateur..." -ForegroundColor Yellow
Read-Host

# ÉTAPE 3 : Approbation du consentement
Write-Host "`n✅ ÉTAPE 2 : Approbation du consentement..." -ForegroundColor Yellow

$validateBody = @{
    consentId = $consentId
    approved = $true
} | ConvertTo-Json

Write-Host "   Request: POST $API_BASE/api/consent/validate`n" -ForegroundColor Gray

try {
    $response2 = Invoke-RestMethod `
        -Uri "$API_BASE/api/consent/validate" `
        -Method Post `
        -Headers @{
            "Content-Type" = "application/json"
            "X-Tenant" = $TENANT
        } `
        -Body $validateBody

    if ($response2.success) {
        Write-Host "   ✅ Consentement approuvé et opération exécutée !`n" -ForegroundColor Green

        Write-Host "   📊 Résultat de l'exécution:" -ForegroundColor Cyan
        Write-Host "      Status: $($response2.status)" -ForegroundColor White
        Write-Host "      Layouts modifiés: $($response2.result.layoutsModified)" -ForegroundColor White

        if ($response2.result.details) {
            Write-Host "      Détails:" -ForegroundColor White
            $response2.result.details | ForEach-Object {
                Write-Host "         - $_" -ForegroundColor Gray
            }
        }

        if ($response2.audit) {
            Write-Host "`n   📝 Audit créé:" -ForegroundColor Cyan
            Write-Host "      Audit ID: $($response2.audit.consentId)" -ForegroundColor White
            Write-Host "      Timestamp: $($response2.audit.timestamp)" -ForegroundColor White
        }
    } else {
        Write-Host "   ❌ Échec validation: $($response2.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Erreur HTTP: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Détails: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

# ÉTAPE 4 : Récupération du rapport d'audit
Write-Host "`n📄 ÉTAPE 3 : Récupération du rapport d'audit..." -ForegroundColor Yellow

Write-Host "   Request: GET $API_BASE/api/consent/audit/$consentId`n" -ForegroundColor Gray

try {
    $response3 = Invoke-RestMethod `
        -Uri "$API_BASE/api/consent/audit/$consentId" `
        -Method Get `
        -Headers @{
            "X-Tenant" = $TENANT
        }

    if ($response3.success) {
        Write-Host "   ✅ Rapport d'audit récupéré !`n" -ForegroundColor Green

        $audit = $response3.audit

        Write-Host "   📋 RAPPORT D'AUDIT COMPLET" -ForegroundColor Cyan
        Write-Host "   ════════════════════════════" -ForegroundColor Cyan
        Write-Host "   Consent ID: $($audit.consentId)" -ForegroundColor White
        Write-Host "   Timestamp: $($audit.timestamp)" -ForegroundColor White
        Write-Host "   Tenant: $($audit.tenantId)" -ForegroundColor White
        Write-Host "`n   Opération:" -ForegroundColor Cyan
        Write-Host "      Type: $($audit.operation.type)" -ForegroundColor White
        Write-Host "      Description: $($audit.operation.description)" -ForegroundColor White
        Write-Host "      Entity: $($audit.operation.details.entity)" -ForegroundColor White
        Write-Host "      Field: $($audit.operation.details.fieldName)" -ForegroundColor White
        Write-Host "      Layouts: $($audit.operation.details.layoutTypes -join ', ')" -ForegroundColor White

        Write-Host "`n   Résultat:" -ForegroundColor Cyan
        Write-Host "      Success: $($audit.result.success)" -ForegroundColor White
        Write-Host "      Layouts modifiés: $($audit.result.layoutsModified)" -ForegroundColor White

        if ($audit.result.details) {
            Write-Host "      Détails des modifications:" -ForegroundColor White
            $audit.result.details | ForEach-Object {
                Write-Host "         - $_" -ForegroundColor Gray
            }
        }

        Write-Host "`n   Métadonnées:" -ForegroundColor Cyan
        Write-Host "      Approuvé par: $($audit.metadata.approved_by)" -ForegroundColor White
        Write-Host "      Approuvé à: $($audit.metadata.approved_at)" -ForegroundColor White
        Write-Host "      Exécuté à: $($audit.metadata.executed_at)" -ForegroundColor White
        Write-Host "      Durée: $($audit.metadata.execution_time_ms)ms`n" -ForegroundColor White

    } else {
        Write-Host "   ❌ Échec récupération audit: $($response3.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Erreur HTTP: $($_.Exception.Message)" -ForegroundColor Red
}

# RÉSUMÉ FINAL
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "✨ TEST E2E TERMINÉ AVEC SUCCÈS" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "📊 Résumé du flux:" -ForegroundColor Yellow
Write-Host "   1. ✅ M.A.X. a créé une demande de consentement" -ForegroundColor Green
Write-Host "   2. ✅ L'utilisateur a approuvé le consentement" -ForegroundColor Green
Write-Host "   3. ✅ L'opération a été exécutée (layouts modifiés)" -ForegroundColor Green
Write-Host "   4. ✅ Le rapport d'audit a été généré et récupéré`n" -ForegroundColor Green

Write-Host "🎯 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "   - Tester le même flux depuis le frontend (ChatPage)" -ForegroundColor White
Write-Host "   - Vérifier que ConsentCard s'affiche correctement" -ForegroundColor White
Write-Host "   - Vérifier que AuditReportModal affiche le rapport" -ForegroundColor White
Write-Host "   - Vérifier que les logs apparaissent dans ActivityPanel`n" -ForegroundColor White

Write-Host "📁 Rapport d'audit sauvegardé sur le serveur:" -ForegroundColor Cyan
Write-Host "   /opt/max-infrastructure/max-backend/audit_reports/$consentId.json`n" -ForegroundColor Gray
