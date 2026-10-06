@echo off
title Yoka Platform Launcher
echo ========================================================
echo   Starting Yoka Platform Development Services...
echo ========================================================

start "Yoka Backend API (Port 3001)" cmd /k "cd /d "%~dp0" && node server/swm/app.js"
start "Yoka SWM Admin (Port 5173)" cmd /k "cd /d "%~dp0client-swm" && npm run dev"
start "Yoka ECP Store (Port 3000)" cmd /k "cd /d "%~dp0client-ecp" && npm run dev"

echo All services launched in separate windows.
