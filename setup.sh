#!/bin/bash

# Karunya Cycle Rental App - Development Setup Script
# This script helps set up the development environment

echo "======================================"
echo "Karunya Cycle Rental - Setup Script"
echo "======================================"
echo ""

# Check Node.js installation
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
else
    NODE_VERSION=$(node -v)
    echo "✅ Node.js $NODE_VERSION found"
fi

# Check npm installation
echo "Checking npm installation..."
if ! command -v npm &> /dev/null
then
    echo "❌ npm is not installed."
    exit 1
else
    NPM_VERSION=$(npm -v)
    echo "✅ npm $NPM_VERSION found"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check for Firebase config
echo ""
echo "Checking Firebase configuration..."
if grep -q "YOUR_API_KEY" config/firebase.js; then
    echo "⚠️  WARNING: Firebase config not updated!"
    echo "   Please update config/firebase.js with your Firebase credentials"
    echo "   See docs/FIREBASE_SETUP.md for instructions"
else
    echo "✅ Firebase config appears to be configured"
fi

# Check for Google Maps API key
echo ""
echo "Checking Google Maps configuration..."
if grep -q "YOUR_GOOGLE_MAPS_API_KEY" app.json; then
    echo "⚠️  WARNING: Google Maps API key not updated!"
    echo "   Please update app.json with your Google Maps API key"
else
    echo "✅ Google Maps API key appears to be configured"
fi

# Install Expo CLI globally (optional)
echo ""
read -p "Do you want to install Expo CLI globally? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    npm install -g expo-cli
    echo "✅ Expo CLI installed globally"
fi

# Summary
echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Update config/firebase.js with your Firebase credentials"
echo "2. Update app.json with your Google Maps API key"
echo "3. Run 'npm start' to start the development server"
echo ""
echo "For detailed setup instructions, see:"
echo "- README.md"
echo "- QUICKSTART.md"
echo "- docs/FIREBASE_SETUP.md"
echo ""
echo "Happy coding! 🚴‍♂️"
