@echo off
setlocal
cd /d "%~dp0"
set "PATH=%~dp0.tools\node-v24.16.0-win-x64;%PATH%"
".tools\node-v24.16.0-win-x64\node.exe" "backend\coachServer.js"
