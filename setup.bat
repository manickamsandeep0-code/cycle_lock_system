@echo off
REM Karunya Cycle Rental App - Development Setup Script (Windows)
REM This script helps set up the development environment

echo ======================================
echo Karunya Cycle Rental - Setup Script
echo ======================================
echo.

REM Check Node.js installation
echo Checking Node.js installation...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo X Node.js is not installed. Please install Node.js v16 or higher.
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
    echo √ Node.js %NODE_VERSION% found
)

REM Check npm installation
echo Checking npm installation...
npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo X npm is not installed.
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
    echo √ npm %NPM_VERSION% found
)

REM Install dependencies
echo.
echo Installing dependencies...
call npm install

if %errorlevel% equ 0 (
    echo √ Dependencies installed successfully
) else (
    echo X Failed to install dependencies
    exit /b 1
)

REM Check for Firebase config
echo.
echo Checking Firebase configuration...
findstr /C:"YOUR_API_KEY" config\firebase.js >nul
if %errorlevel% equ 0 (
    echo ! WARNING: Firebase config not updated!
    echo    Please update config/firebase.js with your Firebase credentials
    echo    See docs/FIREBASE_SETUP.md for instructions
) else (
    echo √ Firebase config appears to be configured
)

REM Check for Google Maps API key
echo.
echo Checking Google Maps configuration...
findstr /C:"YOUR_GOOGLE_MAPS_API_KEY" app.json >nul
if %errorlevel% equ 0 (
    echo ! WARNING: Google Maps API key not updated!
    echo    Please update app.json with your Google Maps API key
) else (
    echo √ Google Maps API key appears to be configured
)

REM Install Expo CLI globally (optional)
echo.
set /p INSTALL_EXPO="Do you want to install Expo CLI globally? (y/n): "
if /i "%INSTALL_EXPO%"=="y" (
    call npm install -g expo-cli
    echo √ Expo CLI installed globally
)

REM Summary
echo.
echo ======================================
echo Setup Complete!
echo ======================================
echo.
echo Next steps:
echo 1. Update config/firebase.js with your Firebase credentials
echo 2. Update app.json with your Google Maps API key
echo 3. Run 'npm start' to start the development server
echo.
echo For detailed setup instructions, see:
echo - README.md
echo - QUICKSTART.md
echo - docs/FIREBASE_SETUP.md
echo.
echo Happy coding! 🚴‍♂️
echo.
pause
