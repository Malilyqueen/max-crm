# Test du système de réutilisation automatique des consentements
# Ce script vérifie que le backend réutilise automatiquement un consent approuvé

Write-Host "🧪 TEST: Réutilisation automatique des consentements (10 minutes)" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://api.max.studiomacrea.cloud"

# Étape 1: Créer un consentement
Write-Host "1️⃣ Création d'un consentement pour layout_modification..." -ForegroundColor Yellow
$createConsentBody = @{
    operation = @{
        type = "layout_modification"
        description = "Test: Ajouter champ test aux layouts"
        details = @{
            entity = "Lead"
            fieldName = "testField"
        }
    }
} | ConvertTo-Json -Depth 5

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/consent/request" -Method POST -Body $createConsentBody -ContentType "application/json"
    $consentId = $createResponse.consentId
    Write-Host "   ✅ Consent créé: $consentId" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Erreur création consent: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Étape 2: Approuver le consentement (simuler l'approbation utilisateur)
Write-Host ""
Write-Host "2️⃣ Approbation du consentement..." -ForegroundColor Yellow
$approveBody = @{
    entity = "Lead"
    fieldName = "testField"
    createField = $false
} | ConvertTo-Json

try {
    $approveResponse = Invoke-RestMethod -Uri "$baseUrl/api/consent/execute/$consentId" -Method POST -Body $approveBody -ContentType "application/json"
    Write-Host "   ✅ Consent approuvé et consommé" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Approbation (peut échouer si tool pas configuré): $($_.Exception.Message)" -ForegroundColor Yellow
}

# Attendre 2 secondes
Write-Host ""
Write-Host "⏳ Attente de 2 secondes..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

# Étape 3: Tenter une DEUXIÈME opération du même type SANS consentId
Write-Host ""
Write-Host "3️⃣ Tentative d'opération layout_modification SANS consentId (test réutilisation)..." -ForegroundColor Yellow
Write-Host "   Expected: Backend devrait RÉUTILISER le consent approuvé il y a 2 secondes" -ForegroundColor Gray

# Simuler l'appel au tool configure_entity_layout sans consentId
$testBody = @{
    entity = "Lead"
    fieldName = "anotherField"
    createField = $false
    # Pas de consentId ici !
} | ConvertTo-Json

try {
    $testResponse = Invoke-RestMethod -Uri "$baseUrl/api/tools/configure_entity_layout" -Method POST -Body $testBody -ContentType "application/json"
    Write-Host "   ✅ SUCCÈS ! Opération passée sans demander nouveau consent" -ForegroundColor Green
    Write-Host "   Result: $($testResponse | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorBody.error -eq "CONSENT_REQUIRED") {
        Write-Host "   ❌ ÉCHEC: Backend a demandé un nouveau consent (pas de réutilisation)" -ForegroundColor Red
        Write-Host "   Message: $($errorBody.message)" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  Erreur inattendue: $($errorBody.error)" -ForegroundColor Yellow
        Write-Host "   Message: $($errorBody.message)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "📊 Vérifier les logs backend:" -ForegroundColor Cyan
Write-Host "   ssh root@51.159.170.20 'docker logs max-backend --tail 50 | grep ConsentGate'" -ForegroundColor Gray
Write-Host ""
Write-Host "🔍 Rechercher: '[ConsentGate] 🔄 Consent récent trouvé et réutilisé'" -ForegroundColor Cyan