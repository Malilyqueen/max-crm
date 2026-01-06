@echo off
REM Test décisif - Dashboard Activités
REM Usage: test-decisif-curl.cmd "VOTRE_JWT_TOKEN"

setlocal

if "%1"=="" (
    echo.
    echo ❌ ERREUR: Token JWT manquant
    echo.
    echo USAGE:
    echo   1. Ouvrir le frontend: http://localhost:5173
    echo   2. Se connecter
    echo   3. Ouvrir DevTools ^(F12^) ^> Application ^> Local Storage
    echo   4. Chercher 'auth-storage'
    echo   5. Copier la valeur de 'state.token'
    echo   6. Lancer: test-decisif-curl.cmd "^<TOKEN^>"
    echo.
    echo EXEMPLE:
    echo   test-decisif-curl.cmd "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOi..."
    echo.
    exit /b 1
)

set JWT_TOKEN=%~1

echo.
echo 🔍 TEST DÉCISIF - Dashboard Activités M.A.X.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo 📋 ÉTAPE 1: Créer une action de test
echo.

curl -s -X POST "http://localhost:3005/api/action-layer/run" ^
  -H "Content-Type: application/json" ^
  -d "{\"actionType\":\"create_opportunity\",\"params\":{\"tenantId\":\"macrea\",\"name\":\"Test Décisif CMD\",\"amount\":25000,\"closeDate\":\"2025-10-01\",\"stage\":\"Prospecting\"}}" ^
  > nul

if %ERRORLEVEL% equ 0 (
    echo    ✅ Action créée
) else (
    echo    ❌ Échec création action
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo 📋 ÉTAPE 2: Vérifier actionLogger
echo.

curl -s "http://localhost:3005/api/action-layer/logs?limit=5&tenantId=macrea" > temp_logs.json

if %ERRORLEVEL% equ 0 (
    echo    ✅ Logs récupérés
    type temp_logs.json | findstr /C:"count" 2>nul
    del temp_logs.json 2>nul
) else (
    echo    ❌ Échec récupération logs
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo 📋 ÉTAPE 3: Tester /dashboard-mvp1/stats avec JWT
echo.

curl -s "http://localhost:3005/api/dashboard-mvp1/stats" ^
  -H "Authorization: Bearer %JWT_TOKEN%" ^
  -H "X-Tenant: macrea" ^
  > temp_dashboard.json

if %ERRORLEVEL% equ 0 (
    findstr /C:"error" temp_dashboard.json >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        echo    ❌ ÉCHEC - Erreur retournée:
        type temp_dashboard.json
        del temp_dashboard.json 2>nul
        echo.
        exit /b 1
    ) else (
        echo    ✅ Réponse reçue ^(200 OK^)
        echo.
        echo 📊 RÉSULTATS:
        type temp_dashboard.json | findstr /C:"maxInteractions" 2>nul
        type temp_dashboard.json | findstr /C:"recentActivity" 2>nul | findstr /V /C:"[" 2>nul | findstr /V /C:"]" 2>nul

        echo.
        echo 🔍 Aperçu complet:
        type temp_dashboard.json
        del temp_dashboard.json 2>nul
    )
) else (
    echo    ❌ Échec appel API
    exit /b 1
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo 🎉 TEST DÉCISIF: ✅ TERMINÉ
echo.
echo Vérifier ci-dessus que 'recentActivity' contient des vraies actions.
echo Si vous voyez des activités réelles ^(et non "Jean Dupont", "Marie Martin"^),
echo le Quick Fix A est validé!
echo.

endlocal