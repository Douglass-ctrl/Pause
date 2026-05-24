@echo off
setlocal
cd /d "%~dp0"
set "PATH=%~dp0.tools\node-v24.16.0-win-x64;%PATH%"
".tools\node-v24.16.0-win-x64\node.exe" "node_modules\expo\bin\cli" start --web --localhost --port 8082 --clear > expo-web.out.log 2> expo-web.err.log
