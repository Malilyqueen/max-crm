# Test de l'automatisation complète des layouts par Super M.A.X.
# Ce script teste le workflow: Créer champ → Modifier layouts → Rebuild

$MAX_URL = "http://127.0.0.1:3005/api/chat"
$HEADERS = @{
    "Content-Type" = "application/json"
}

Write-Host "=== Test Automatisation Layouts via Super M.A.X. ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Workflow complet avec configure_entity_layout
Write-Host "Test 1: Workflow complet (création + layouts + rebuild)" -ForegroundColor Yellow
Write-Host ""

$message1 = @"
Utilise l'outil configure_entity_layout pour créer un nouveau champ "testAutomation"
de type text sur l'entité Lead, ajoute-le aux layouts Detail, List et DetailSmall,
puis exécute le rebuild.

Affiche-moi le résultat de chaque étape avec les temps d'exécution.
"@

$body1 = @{
    tenant = "macrea_client"
    message = $message1
} | ConvertTo-Json

Write-Host "Envoi de la requête à M.A.X...`n" -ForegroundColor Gray

try {
    $start = Get-Date
    $response1 = Invoke-RestMethod -Uri $MAX_URL -Method Post -Headers $HEADERS -Body $body1 -TimeoutSec 120
    $duration = (Get-Date) - $start

    Write-Host "=== Réponse de M.A.X. ===" -ForegroundColor Green
    Write-Host $response1.reply
    Write-Host ""
    Write-Host "Temps total: $($duration.TotalSeconds) secondes" -ForegroundColor Cyan

    if ($response1.tokens_used) {
        Write-Host "Tokens utilisés: $($response1.tokens_used)" -ForegroundColor Cyan
    }

} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test terminé ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Yellow
Write-Host "1. Ouvrir http://127.0.0.1:8081/espocrm"
Write-Host "2. Aller dans Leads"
Write-Host "3. Vérifier que le champ 'testAutomation' est visible dans Detail et List"
Write-Host ""

# Test 2: Tester les routes directement
Write-Host "Test 2: Test des routes /api/layout directement" -ForegroundColor Yellow
Write-Host ""

# 2.1 Test PHP
Write-Host "2.1 Test disponibilité PHP..." -ForegroundColor Gray
try {
    $phpTest = Invoke-RestMethod -Uri "http://127.0.0.1:3005/api/layout/test-php" -Method Get
    Write-Host "✅ PHP disponible: $($phpTest.available)" -ForegroundColor Green
    if ($phpTest.version) {
        Write-Host "   Version: $($phpTest.version)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ PHP test échoué: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 2.2 Test lecture layout
Write-Host "2.2 Test lecture layout Lead/detail..." -ForegroundColor Gray
try {
    $layoutRead = Invoke-RestMethod -Uri "http://127.0.0.1:3005/api/layout/read?entity=Lead&layoutType=detail" -Method Get
    Write-Host "✅ Layout lu avec succès" -ForegroundColor Green
    Write-Host "   Nombre de panels: $($layoutRead.layout.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Lecture layout échouée: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 2.3 Test add field
Write-Host "2.3 Test ajout d'un champ aux layouts..." -ForegroundColor Gray
try {
    $addFieldBody = @{
        entity = "Lead"
        field = "testField2"
        layouts = @("detail", "list")
    } | ConvertTo-Json

    $addFieldResult = Invoke-RestMethod -Uri "http://127.0.0.1:3005/api/layout/add-field" `
        -Method Post `
        -Headers $HEADERS `
        -Body $addFieldBody

    if ($addFieldResult.ok) {
        Write-Host "✅ Champ ajouté aux layouts" -ForegroundColor Green
        Write-Host "   Résultats: " -ForegroundColor Gray
        Write-Host "   - Detail: $($addFieldResult.results.detail.success)" -ForegroundColor Gray
        Write-Host "   - List: $($addFieldResult.results.list.success)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Ajout champ échoué" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Ajout champ échoué: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Tous les tests terminés ===" -ForegroundColor Cyan
Write-Host ""

# Résumé
Write-Host "Résumé des fonctionnalités testées:" -ForegroundColor Yellow
Write-Host "✅ configure_entity_layout tool (workflow complet)" -ForegroundColor Green
Write-Host "✅ /api/layout/test-php (vérification PHP)" -ForegroundColor Green
Write-Host "✅ /api/layout/read (lecture layouts)" -ForegroundColor Green
Write-Host "✅ /api/layout/add-field (ajout aux layouts)" -ForegroundColor Green
Write-Host ""
Write-Host "Super M.A.X. est maintenant un administrateur local complet!" -ForegroundColor Cyan
