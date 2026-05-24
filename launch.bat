@echo off
echo ====================================================
echo               Stellar Fusion Launcher
echo ====================================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js was not found on your system!
    echo Please install Node.js (https://nodejs.org) and try again.
    echo.
    pause
    exit /b 1
)

:: Check if node_modules is installed, if not, run npm install
if not exist node_modules (
    echo [INFO] First time launch detected. Installing dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] npm install failed! Please check your internet connection.
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed successfully.
    echo.
)

echo [INFO] Starting the local dev server...
echo [INFO] The game will open automatically in your browser.
echo.
call npm run dev
