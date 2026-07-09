@echo off
REM Double-click this file (Windows) to launch the FGA Inspection Studio.
REM It installs dependencies on first run, then starts the app and opens
REM your browser.

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js / npm was not found on your PATH.
  echo Install Node.js from https://nodejs.org and try again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo First run - installing dependencies ^(this may take a minute^)...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting FGA Inspection Studio...
call npm start
