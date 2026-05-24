@echo off
echo ====================================================
echo               Stellar Fusion Launcher
echo ====================================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if errorlevel 1 goto NONODE

:: Check if node_modules exists
if exist node_modules goto STARTAPP

echo [INFO] First time launch detected. Installing dependencies...
call npm install
if errorlevel 1 goto INSTALLFAIL
echo [SUCCESS] Dependencies installed successfully.
echo.

:STARTAPP
echo [INFO] Starting the local dev server...
echo [INFO] The game will open automatically in your browser.
echo.
call npm run dev
pause
exit /b 0

:NONODE
echo [ERROR] Node.js was not found on your system!
echo Please install Node.js (https://nodejs.org) and try again.
echo.
pause
exit /b 1

:INSTALLFAIL
echo [ERROR] npm install failed! Please check your internet connection.
echo.
pause
exit /b 1
