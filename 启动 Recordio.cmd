@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\vite\bin\vite.js" (
	echo Missing project dependencies. Please repair the Node.js installation and run npm install first.
	pause
	exit /b 1
)

node ".\node_modules\vite\bin\vite.js" --config vite.config.ts
if errorlevel 1 pause
