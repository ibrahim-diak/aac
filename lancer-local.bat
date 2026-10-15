@echo off
chcp 65001 >nul
title Lancement de la Plateforme Z

echo =======================================================
echo          PLATEFORME Z - DIVERTISSEMENT & FUN
echo =======================================================
echo.
echo Verification de l'environnement local...

where npm >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Node.js et npm detectes.
    echo Lancement du serveur local avec Vite (Port 3000)...
    start http://localhost:3000
    npm run dev
    goto fin
)

where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Python detecte.
    echo Lancement du serveur HTTP integre (Port 3000)...
    start http://localhost:3000
    python -m http.server 3000
    goto fin
)

where py >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Python (py) detecte.
    echo Lancement du serveur HTTP integre (Port 3000)...
    start http://localhost:3000
    py -m http.server 3000
    goto fin
)

echo.
echo [ATTENTION] Ni Node.js ni Python n'ont ete trouves dans le PATH.
echo Vous pouvez ouvrir directement index.html dans votre navigateur
echo ou installer l'extension "Live Server" dans VS Code.
echo.
pause

:fin
