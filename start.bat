@echo off
setlocal
cd /d "%~dp0"
title PASIGology Admin Panel

where node >nul 2>&1
if not errorlevel 1 goto node_ready

echo Node.js is not installed. Installing the Node.js LTS release...
where winget >nul 2>&1
if errorlevel 1 (
	echo.
	echo Windows Package Manager (winget) is unavailable.
	echo Install Node.js LTS from https://nodejs.org, then run this file again.
	pause
	exit /b 1
)
winget install --id OpenJS.NodeJS.LTS --exact --source winget
if errorlevel 1 (
	echo.
	echo Node.js installation failed. Install Node.js LTS from https://nodejs.org.
	pause
	exit /b 1
)

set "PATH=C:\Program Files\nodejs;%PATH%"

:node_ready
set "PATH=C:\Program Files\nodejs;%PATH%"
where npm >nul 2>&1
if errorlevel 1 (
	echo npm was not found. Close and reopen this file after installing Node.js.
	pause
	exit /b 1
)

if exist node_modules\ (goto dependencies_ready)

echo Installing project dependencies. This may take a few minutes...
call npm ci
if errorlevel 1 (
	echo.
	echo Dependency installation failed. Check your internet connection and try again.
	pause
	exit /b 1
)

:dependencies_ready
echo Starting the admin panel at http://localhost:3000
call npm start
pause