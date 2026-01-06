# Test Lead Import via MAX Backend API
# Simule l'importation d'un lead depuis le CSV

$backendUrl = "https://max-api.studiomacrea.cloud"

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "Test Import Lead via MAX Backend" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Simuler un lead comme celui que MAX essaie d'importer
$leadData = @{
    firstName = "Sophie"
    lastName = "Martin"
    accountName = "SM Consulting"
    phoneNumber = "+33612345678"
    emailAddress = "sophie.martin@gmail.com"
    addressCity = "Paris"
    addressCountry = "France"
    description = "Souhaite automatiser la gestion de ses prospects."
    status = "New"
} | ConvertTo-Json

Write-Host "Données du lead:" -ForegroundColor Yellow
Write-Host $leadData
Write-Host ""

Write-Host "Envoi au backend MAX..." -ForegroundColor Yellow

try {
    # Headers requis pour le backend
    $headers = @{
        "X-Tenant" = "macrea-admin"
        "Content-Type" = "application/json"
    }

    # Tester l'endpoint direct de création de lead
    $response = Invoke-RestMethod -Uri "$backendUrl/api/leads" `
        -Method Post `
        -Headers $headers `
        -Body $leadData `
        -ErrorAction Stop

    Write-Host "SUCCESS: Lead créé via backend" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor White
    Write-Host ($response | ConvertTo-Json -Depth 5)
    Write-Host ""
} catch {
    Write-Host "FAILED: Erreur lors de la création" -ForegroundColor Red
    Write-Host "Status Code:" $_.Exception.Response.StatusCode.Value__ -ForegroundColor Red
    Write-Host "Error:" $_ -ForegroundColor Red

    # Essayer de lire le body de l'erreur
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $body = $reader.ReadToEnd()
    Write-Host "Response Body:" -ForegroundColor Red
    Write-Host $body
    Write-Host ""
}

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "Test terminé" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
