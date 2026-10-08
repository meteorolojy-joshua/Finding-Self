@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo This prototype needs Node.js installed. Install Node.js, then open this file again.
  pause
  exit /b 1
)
echo Finding Self is starting. Keep this window open while you use the app.
echo Open http://127.0.0.1:4173/app/index.html in your browser.
start "" "http://127.0.0.1:4173/app/index.html"
node server.js
pause
