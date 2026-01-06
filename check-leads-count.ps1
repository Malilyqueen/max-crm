# Script pour surveiller le nombre de leads dans EspoCRM
# Affiche le total et les 10 derniers leads créés

$apiKey = "c306b76bd7e981305569b63e8bb4d157"
$espoUrl = "https://crm.studiomacrea.cloud/api/v1"

$headers = @{
    "X-Api-Key" = $apiKey
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "Vérification des leads dans EspoCRM" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$espoUrl/Lead?maxSize=50&orderBy=createdAt&order=desc" -Headers $headers

    Write-Host "Total de leads dans EspoCRM: $($response.total)" -ForegroundColor Green
    Write-Host ""

    Write-Host "10 derniers leads créés:" -ForegroundColor Yellow
    Write-Host ""

    $count = 1
    foreach ($lead in $response.list | Select-Object -First 10) {
        $company = if ($lead.accountName) { "($($lead.accountName))" } else { "(Pas d'entreprise)" }
        $createdAt = $lead.createdAt
        Write-Host "  $count. $($lead.name) $company" -ForegroundColor White
        Write-Host "     Créé: $createdAt" -ForegroundColor Gray
        $count++
    }

    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Cyan

} catch {
    Write-Host "Erreur lors de la récupération des leads: $_" -ForegroundColor Red
}