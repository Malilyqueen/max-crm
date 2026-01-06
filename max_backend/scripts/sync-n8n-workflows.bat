@echo off
REM Script de synchronisation des workflows n8n
REM Usage: scripts\sync-n8n-workflows.bat

echo.
echo ================================================================================
echo SYNCHRONISATION DES WORKFLOWS N8N
echo ================================================================================
echo.

cd /d "%~dp0.."
set N8N_USER_FOLDER=D:\Macrea\CRM\n8n_local\.n8n
set WORKFLOWS_DIR=D:\Macrea\CRM\max_backend\n8n_workflows

echo Repertoire n8n: %N8N_USER_FOLDER%
echo Repertoire workflows: %WORKFLOWS_DIR%
echo.

REM Import de chaque workflow
for %%f in ("%WORKFLOWS_DIR%\*.json") do (
    echo Importation: %%~nxf
    npx n8n import:workflow --input="%%f" --separate > nul 2>&1
    if errorlevel 1 (
        echo   [ERREUR] Echec de l'import
    ) else (
        echo   [OK] Importe avec succes
    )
)

echo.
echo ================================================================================
echo TERMINE
echo ================================================================================
echo.
echo IMPORTANT: Redemarrez n8n pour que les changements prennent effet
echo.

pause
