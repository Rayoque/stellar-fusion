@echo off
title Stop Stellar Fusion Dev Server
echo ====================================================
echo             Stopping Stellar Fusion Server
echo ====================================================
echo.

:: Find and kill any node processes running on port 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr 5173') do (
    taskkill /f /pid %%a >nul 2>&1
)

:: General fallback to kill node if needed
taskkill /f /im node.exe >nul 2>&1

echo [SUCCESS] Stellar Fusion Dev Server stopped successfully.
echo.
timeout /t 3 >nul
exit /b 0
