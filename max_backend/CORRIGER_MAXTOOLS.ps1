# Script pour corriger la définition de l'outil configure_entity_layout
# CORRECTION CRITIQUE pour résoudre les bulles vides

Write-Host "=== CORRECTION CRITIQUE : maxTools.js ===" -ForegroundColor Cyan
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
Copy-Item "lib\maxTools.js" "lib\maxTools.js.backup" -Force
Write-Host "[OK] Backup créé: lib\maxTools.js.backup" -ForegroundColor Green
Write-Host ""

# Remplacement
Write-Host "Application de la correction..." -ForegroundColor Yellow
if (Test-Path "lib\maxTools_FIXED.js") {
    Copy-Item "lib\maxTools_FIXED.js" "lib\maxTools.js" -Force
    Write-Host "[OK] maxTools.js corrigé" -ForegroundColor Green
} else {
    Write-Host "[ERREUR] Fichier maxTools_FIXED.js introuvable!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== CORRECTION APPLIQUÉE AVEC SUCCÈS ===" -ForegroundColor Green
Write-Host ""
Write-Host "CHANGEMENTS EFFECTUÉS :" -ForegroundColor Cyan
Write-Host "1. Outil configure_entity_layout:" -ForegroundColor White
Write-Host "   - Ajout du paramètre OBLIGATOIRE 'fieldName'" -ForegroundColor Yellow
Write-Host "   - Description clarifiée: 'OPÉRATION STRUCTURELLE (PHP)'" -ForegroundColor Yellow
Write-Host "   - Suppression du paramètre 'operation' (source de confusion)" -ForegroundColor Yellow
Write-Host "   - Ajout de l'avertissement: 'JAMAIS pour lire/lister des données'" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Effet sur M.A.X.:" -ForegroundColor White
Write-Host "   - M.A.X. devra maintenant TOUJOURS fournir fieldName" -ForegroundColor Green
Write-Host "   - M.A.X. comprendra que cet outil est pour STRUCTURE, pas DONNÉES" -ForegroundColor Green
Write-Host "   - M.A.X. utilisera query_espo_leads pour lister" -ForegroundColor Green
Write-Host ""
Write-Host "Redémarrez le serveur et testez :" -ForegroundColor Cyan
Write-Host "- 'Liste-moi tous les leads avec leurs tags'" -ForegroundColor White
Write-Host ""
Write-Host "Les bulles vides devraient maintenant être résolues." -ForegroundColor Green
