@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js 20 or newer is required.
 pause
 exit /b 1
)
if not exist "web\vendor\three.module.js" (
 if not exist "node_modules\three\package.json" (
  call npm install --no-audit --no-fund
  if errorlevel 1 (
   echo Dependency installation failed. Check your network and try again.
   pause
   exit /b 1
  )
 )
)
node scripts/start.mjs
pause
