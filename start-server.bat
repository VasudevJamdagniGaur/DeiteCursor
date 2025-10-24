@echo off
REM Deite Backend Startup Script for Windows
REM This script starts the Deite backend server with Ollama warm-up

echo 🚀 Starting Deite Backend Server...
echo 📋 Prerequisites check:

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js v14 or higher.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

REM Check if Ollama is installed
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Ollama is not installed. Please install Ollama first.
    pause
    exit /b 1
)

REM Check if Ollama is running
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Ollama is not running. Please start Ollama first:
    echo    ollama serve
    pause
    exit /b 1
)

REM Check if mistral:instruct model is available
ollama list | findstr "mistral:instruct" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  mistral:instruct model not found. Please pull it first:
    echo    ollama pull mistral:instruct
    pause
    exit /b 1
)

echo ✅ All prerequisites met!
echo.

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

echo 🔥 Starting server with Ollama warm-up...
echo 🌐 Server will be available at: http://localhost:3001
echo 💬 Health check: http://localhost:3001/health
echo.

REM Start the server
npm start

pause
