#!/bin/bash

echo "===================================================="
echo "              Stellar Fusion Launcher"
echo "===================================================="
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js was not found on your system!"
    echo "Please install Node.js (https://nodejs.org) and try again."
    echo
    exit 1
fi

# Check if node_modules is installed
if [ ! -d "node_modules" ]; then
    echo "[INFO] First time launch detected. Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] npm install failed! Please check your internet connection."
        exit 1
    fi
    echo "[SUCCESS] Dependencies installed successfully."
    echo
fi

echo "[INFO] Starting the local dev server..."
echo "[INFO] The game will open automatically in your browser."
echo
npm run dev
