@echo off
setlocal
title Tuat Live - San doc 9-16
cd /d "%~dp0"
set "TUAT_OPEN_OVERLAY=1"
echo Dang mo san doc 9:16 trong cua so rieng...
call "%~dp0Start-Tuat.cmd"
exit /b %errorlevel%
