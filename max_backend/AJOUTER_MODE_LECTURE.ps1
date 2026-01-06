# Script pour ajouter l'instruction de MODE LECTURE au prompt système
# Cela permettra à M.A.X. de reconnaître automatiquement les requêtes de listing

Write-Host "=== AJOUT DE L'INSTRUCTION MODE LECTURE ===" -ForegroundColor Cyan
Write-Host ""

# Vérifier que le serveur est arrêté (port 3005)
$maxPort = netstat -ano | Select-String ":3005" | Select-String "LISTENING"
if ($maxPort) {
    Write-Host "ERREUR: Le serveur M.A.X. est encore en cours d'exécution sur le port 3005!" -ForegroundColor Red
    Write-Host "Arrêtez d'abord le serveur avec Ctrl+C" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Serveur M.A.X. arrêté" -ForegroundColor Green
Write-Host ""

# Backup
Write-Host "Création du backup..." -ForegroundColor Yellow
Copy-Item "routes\chat.js" "routes\chat.js.backup_mode_lecture" -Force
Write-Host "[OK] Backup créé: routes\chat.js.backup_mode_lecture" -ForegroundColor Green
Write-Host ""

# Lire le fichier
Write-Host "Modification de routes\chat.js..." -ForegroundColor Yellow
$content = Get-Content "routes\chat.js" -Raw

# Vérifier si déjà présent
if ($content -match "MODE_LECTURE_INSTRUCTION") {
    Write-Host "[INFO] L'instruction MODE LECTURE est déjà présente" -ForegroundColor Yellow
    exit 0
}

# Ajouter l'instruction
$oldPattern = @"
const OPERATIONAL_RULES = fs.readFileSync\(
  path\.join\(__dirname, '\.\.', 'prompts', 'max_operational_rules\.txt'\),
  'utf-8'
\);

// Combiner les prompts
const FULL_SYSTEM_PROMPT = `\$\{PROMPT_SYSTEM_MAX\}

\$\{OPERATIONAL_RULES\}`;
"@

$newContent = @"
const OPERATIONAL_RULES = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'max_operational_rules.txt'),
  'utf-8'
);

const MODE_LECTURE_INSTRUCTION = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'INSTRUCTION_MODE_LECTURE.txt'),
  'utf-8'
);

// Combiner les prompts (MODE LECTURE en premier pour priorité maximale)
const FULL_SYSTEM_PROMPT = `${MODE_LECTURE_INSTRUCTION}

${PROMPT_SYSTEM_MAX}

${OPERATIONAL_RULES}`;
"@

$content = $content -replace [regex]::Escape($oldPattern), $newContent

Set-Content "routes\chat.js" $content -NoNewline

Write-Host "[OK] routes\chat.js modifié" -ForegroundColor Green
Write-Host ""
Write-Host "=== MODIFICATION APPLIQUÉE AVEC SUCCÈS ===" -ForegroundColor Green
Write-Host ""
Write-Host "CHANGEMENT EFFECTUÉ :" -ForegroundColor Cyan
Write-Host "- Ajout de l'instruction MODE LECTURE au début du prompt" -ForegroundColor Yellow
Write-Host "- M.A.X. reconnaîtra automatiquement les requêtes de listing" -ForegroundColor Yellow
Write-Host ""
Write-Host "Exemples qui fonctionneront maintenant :" -ForegroundColor White
Write-Host "  'Liste-moi les leads'" -ForegroundColor Gray
Write-Host "  'Montre les prospects'" -ForegroundColor Gray
Write-Host "  'Donne-moi les tags'" -ForegroundColor Gray
Write-Host "  'Affiche tous les leads'" -ForegroundColor Gray
Write-Host ""
Write-Host "Redémarrez le serveur et testez !" -ForegroundColor Cyan
