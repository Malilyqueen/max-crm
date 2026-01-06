# Script de test pour vérifier le système de logging d'activités M.A.X.

Write-Host "=== TEST ACTIVITY LOGGER ===" -ForegroundColor Cyan
Write-Host ""

$logFile = "d:\Macrea\CRM\max_backend\logs\max_activity.jsonl"
$logsDir = Split-Path $logFile -Parent

# Créer le dossier logs s'il n'existe pas
if (-not (Test-Path $logsDir)) {
    Write-Host "[1/4] Création du dossier logs..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    Write-Host "✓ Dossier créé : $logsDir" -ForegroundColor Green
} else {
    Write-Host "[1/4] Dossier logs existe déjà" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/4] Ajout d'activités de test..." -ForegroundColor Yellow

# Créer quelques activités de test
$testActivities = @(
    @{
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        actor = "M.A.X."
        type = "field_created"
        entity = "Lead"
        fieldName = "testField"
        fieldType = "varchar"
        details = "Champ testField (varchar) créé et ajouté aux layouts"
    },
    @{
        timestamp = (Get-Date).AddMinutes(-5).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        actor = "M.A.X."
        type = "data_listed"
        entity = "Lead"
        count = 15
        total = 42
        details = "Listage de 15 lead(s) sur 42 total"
    },
    @{
        timestamp = (Get-Date).AddMinutes(-10).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        actor = "M.A.X."
        type = "data_updated"
        entity = "Lead"
        count = 3
        leadIds = @("lead-001", "lead-002", "lead-003")
        updates = @{ status = "In Process" }
        details = "Mise à jour de 3 lead(s), création de 0 lead(s)"
    }
)

# Écrire chaque activité sur une ligne
foreach ($activity in $testActivities) {
    $jsonLine = ($activity | ConvertTo-Json -Compress)
    Add-Content -Path $logFile -Value $jsonLine
}

Write-Host "✓ $($testActivities.Count) activités de test ajoutées" -ForegroundColor Green

Write-Host ""
Write-Host "[3/4] Lecture du fichier de logs..." -ForegroundColor Yellow

if (Test-Path $logFile) {
    $lines = Get-Content $logFile
    Write-Host "✓ Fichier contient $($lines.Count) ligne(s)" -ForegroundColor Green

    Write-Host ""
    Write-Host "[4/4] Aperçu des dernières activités :" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Cyan

    $lines | Select-Object -Last 5 | ForEach-Object {
        $activity = $_ | ConvertFrom-Json
        $time = [DateTime]::Parse($activity.timestamp).ToString("HH:mm:ss")
        Write-Host "[$time] $($activity.type) - $($activity.details)" -ForegroundColor White
    }

    Write-Host "----------------------------------------" -ForegroundColor Cyan
} else {
    Write-Host "✗ Fichier de log non trouvé !" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== TEST TERMINÉ ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour voir les activités dans le Reporting :" -ForegroundColor Yellow
Write-Host "1. Redémarrez le serveur M.A.X. (npm start)" -ForegroundColor White
Write-Host "2. Ouvrez l'onglet Reporting dans le frontend" -ForegroundColor White
Write-Host "3. Les activités devraient apparaître dans la liste" -ForegroundColor White
Write-Host ""
