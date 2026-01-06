# Script de test des endpoints d'enrichissement
Write-Host "=== Test des endpoints d'enrichissement ===" -ForegroundColor Cyan

$baseUrl = "http://localhost:3005/api"
$headers = @{
    "X-Tenant" = "damath"
    "X-Role" = "admin"
    "X-Preview" = "true"
    "Content-Type" = "application/json"
}

Write-Host "`n1. Test GET /api/enrichments/stats" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/enrichments/stats" -Headers $headers -UseBasicParsing
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "   Total Reports: $($json.stats.totalReports)" -ForegroundColor Green
    Write-Host "   Leads Analyzed: $($json.stats.totalLeadsAnalyzed)" -ForegroundColor Green
    Write-Host "   Success Rate: $($json.stats.successRate)%" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Test GET /api/enrichments" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/enrichments?limit=5" -Headers $headers -UseBasicParsing
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "   Reports count: $($json.reports.Length)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Test GET /api/leads-modified" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/leads-modified?limit=10" -Headers $headers -UseBasicParsing
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "   Leads Modified: $($json.totalCount)" -ForegroundColor Green
    if ($json.leadsModified.Length -gt 0) {
        Write-Host "   Premier lead: $($json.leadsModified[0].leadName)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. Vérification du fichier enrichments.json" -ForegroundColor Yellow
if (Test-Path "d:\Macrea\CRM\max_backend\reports\enrichments.json") {
    $content = Get-Content "d:\Macrea\CRM\max_backend\reports\enrichments.json" -Raw | ConvertFrom-Json
    Write-Host "✅ Fichier trouvé avec $($content.Length) rapport(s)" -ForegroundColor Green
} else {
    Write-Host "❌ Fichier enrichments.json non trouvé" -ForegroundColor Red
}

Write-Host "`n=== Test terminé ===" -ForegroundColor Cyan
