@echo off
setlocal
title Tuat Live - Khoi dong
cd /d "%~dp0"
echo ========================================
echo          TUAT LIVE - CHO BATTLE
echo ========================================
echo Dang mo du an. Vui long doi...
echo.
call "%~dp0Start-Tuat.cmd"
exit /b %errorlevel%
