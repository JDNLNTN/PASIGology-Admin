@echo off
setlocal
cd /d "%~dp0"
title PASIGology Admin Panel
set "NODE_DIR=%ProgramFiles%\nodejs"
set "PATH=%NODE_DIR%;%PATH%"

echo PASIGology Admin Panel launcher
echo Project folder: %CD%
echo.

if exist "%NODE_DIR%\node.exe" goto node_ready

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

:node_ready
	if not exist "%NODE_DIR%\npm.cmd" (
	echo npm was not found. Close and reopen this file after installing Node.js.
	pause
	exit /b 1
)

	if exist node_modules\ goto dependencies_ready

echo Installing project dependencies. This may take a few minutes...
	call "%NODE_DIR%\npm.cmd" ci
if errorlevel 1 (
	echo.
	echo Dependency installation failed. Check your internet connection and try again.
	pause
	exit /b 1
)

:dependencies_ready
echo Starting the admin panel at http://localhost:3000
	call "%NODE_DIR%\npm.cmd" start
	if errorlevel 1 (
		echo.
		echo The admin panel stopped unexpectedly. Review the error above and try again.
	)
pause