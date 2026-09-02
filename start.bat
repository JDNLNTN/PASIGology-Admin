@echo off
setlocal EnableDelayedExpansion
title Admin Panel Launcher

REM ============================================================
REM  Admin Panel - Startup Script
REM  Assumes this file lives in the project's root folder
REM  (same folder as package.json / package-lock.json).
REM ============================================================

REM --- 2. Move into the project folder (folder this script is in) ---
cd /d "%~dp0"

echo ============================================
echo   Admin Panel - Startup Script
echo ============================================
echo.

REM --- 3. Check whether Node.js exists ---
echo [1/5] Checking for Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js not found.
    echo.

    REM --- 4. Install Node.js LTS via winget if missing ---
    echo Installing Node.js LTS via winget, this may take a minute...
    winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
    if !errorlevel! neq 0 (
        echo.
        echo ERROR: winget installation failed.
        echo Please install Node.js manually from https://nodejs.org and re-run this script.
        pause
        exit /b 1
    )
) else (
    echo Node.js found.
)

REM --- 5. Add Node.js to the temporary (session-only) PATH ---
echo.
echo [2/5] Refreshing PATH for this session...
set "NODE_PATH1=%ProgramFiles%\nodejs"
set "NODE_PATH2=%LocalAppData%\Programs\nodejs"
if exist "%NODE_PATH1%\node.exe" set "PATH=%NODE_PATH1%;%PATH%"
if exist "%NODE_PATH2%\node.exe" set "PATH=%NODE_PATH2%;%PATH%"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Node.js still not found after installation.
    echo Try closing this window and re-opening start.bat, or restart your computer.
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODE_VERSION=%%v
echo Using Node.js !NODE_VERSION!

REM --- 6. Check whether npm is available ---
echo.
echo [3/5] Checking for npm...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ERROR: npm was not found even though Node.js is installed.
    echo Try reinstalling Node.js manually from https://nodejs.org
    pause
    exit /b 1
)
for /f "delims=" %%v in ('npm -v') do set NPM_VERSION=%%v
echo Using npm !NPM_VERSION!

REM --- 7 & 8. Check node_modules; run npm ci if dependencies are missing ---
echo.
echo [4/5] Checking dependencies...
if not exist "node_modules\" (
    echo node_modules not found. Running npm ci to install exact versions from package-lock.json...
    call npm ci
    if !errorlevel! neq 0 (
        echo.
        echo ERROR: npm ci failed. Check package-lock.json and your internet connection.
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed. Skipping npm ci.
)

REM --- 10 & 11. Open the admin panel in the default browser once the server is up ---
echo.
echo [5/5] Launching admin panel...
start "" cmd /c "timeout /t 6 >nul && start http://localhost:3000"

REM --- 9. Start the webpack dev server (keeps this window running) ---
echo Starting webpack dev server (npm start)...
echo.
call npm start

endlocal