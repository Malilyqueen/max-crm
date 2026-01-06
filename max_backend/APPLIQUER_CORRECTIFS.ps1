# Script pour appliquer les correctifs M.A.X. (PHP vs API REST)
# Exécuter ce script APRÈS avoir arrêté le serveur M.A.X.

Write-Host "=== APPLICATION DES CORRECTIFS M.A.X. ===" -ForegroundColor Cyan
Write-Host ""

# Vérifier que le serveur M.A.X. est arrêté (port 3005)
$maxPort = netstat -ano | Select-String ":3005" | Select-String "LISTENING"
if ($maxPort) {
    Write-Host "ERREUR: Le serveur M.A.X. est encore en cours d'exécution sur le port 3005!" -ForegroundColor Red
    Write-Host "Arrêtez d'abord le serveur avec Ctrl+C" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Serveur M.A.X. arrêté" -ForegroundColor Green
Write-Host ""

# Backup des fichiers originaux
Write-Host "Création des backups..." -ForegroundColor Yellow
Copy-Item "data\agent_identity.json" "data\agent_identity.json.backup" -Force
Copy-Item "prompts\max_system_prompt_v2.txt" "prompts\max_system_prompt_v2.txt.backup" -Force
Write-Host "[OK] Backups créés" -ForegroundColor Green
Write-Host ""

# Correctif 1 : Remplacer agent_identity.json par agent_identity_FIXED.json
Write-Host "Application du correctif 1/2 : agent_identity.json" -ForegroundColor Yellow
if (Test-Path "data\agent_identity_FIXED.json") {
    Copy-Item "data\agent_identity_FIXED.json" "data\agent_identity.json" -Force
    Write-Host "[OK] agent_identity.json mis à jour" -ForegroundColor Green
} else {
    Write-Host "[ERREUR] Fichier agent_identity_FIXED.json introuvable!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Correctif 2 : Ajouter la section PHP vs API REST au début du prompt
Write-Host "Application du correctif 2/2 : max_system_prompt_v2.txt" -ForegroundColor Yellow

$promptContent = Get-Content "prompts\max_system_prompt_v2.txt" -Raw

# Vérifier si la section existe déjà
if ($promptContent -match "RÈGLE CRITIQUE : PHP vs API REST") {
    Write-Host "[INFO] La section PHP vs API REST existe déjà" -ForegroundColor Yellow
} else {
    # Ajouter la section après la première ligne
    $newSection = @"

# ⚡ RÈGLE CRITIQUE : PHP vs API REST

## UTILISE API REST pour les opérations de DONNÉES :
- Lister des leads → query_espo_leads
- Lire un lead spécifique → get_lead_snapshot
- Mettre à jour des données → update_lead_fields
- ❌ JAMAIS configure_entity_layout pour lire/lister des données

## UTILISE PHP LOCAL pour les opérations STRUCTURELLES :
- Créer un champ custom → configure_entity_layout avec createField: true
- Modifier les layouts (list/detail/detailSmall) → configure_entity_layout
- ⚠️ TOUJOURS fournir fieldName (string non-vide, jamais "undefined")

Si tu appelles configure_entity_layout SANS fieldName ou pour lister des données, tu recevras une erreur.

"@

    $lines = $promptContent -split "`r`n"
    $newContent = $lines[0] + "`r`n" + $newSection + "`r`n" + ($lines[1..($lines.Length-1)] -join "`r`n")

    Set-Content "prompts\max_system_prompt_v2.txt" $newContent -NoNewline
    Write-Host "[OK] Prompt système mis à jour" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== CORRECTIFS APPLIQUÉS AVEC SUCCÈS ===" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines étapes :" -ForegroundColor Cyan
Write-Host "1. Redémarrez le serveur M.A.X. (npm start ou node server.js)" -ForegroundColor White
Write-Host "2. Testez avec : 'Liste-moi tous les leads avec leurs tags'" -ForegroundColor White
Write-Host ""
Write-Host "Les backups sont disponibles :" -ForegroundColor Yellow
Write-Host "- data\agent_identity.json.backup" -ForegroundColor Gray
Write-Host "- prompts\max_system_prompt_v2.txt.backup" -ForegroundColor Gray
