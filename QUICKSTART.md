# Quick Start Guide

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Android Studio (for Android) or Xcode (for iOS)
- Arduino IDE (for hardware)

## 1. Initial Setup (5 minutes)

### Install Dependencies
```bash
cd Cycleapp
npm install
```

### Install Expo CLI (if not already installed)
```bash
npm install -g expo-cli
```

## 2. Firebase Configuration (10 minutes)

See detailed guide: [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)

Quick steps:
1. Create Firebase project
2. Enable Firestore & Realtime Database
3. Copy config to `config/firebase.js`
4. Set up security rules

## 3. Google Maps Setup (5 minutes)

### Get API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable "Maps SDK for Android" and "Maps SDK for iOS"
4. Create credentials → API Key
5. Copy the API key

### Update app.json
```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
    }
  }
}
```

## 4. Run the App (2 minutes)

```bash
# Start Expo development server
npm start

# Or run directly on platform
npm run android  # For Android
npm run ios      # For iOS
```

## 5. Hardware Setup (30-60 minutes)

See detailed guide: [docs/HARDWARE_SETUP.md](docs/HARDWARE_SETUP.md)

Quick steps:
1. Connect Arduino, SIM800L, GPS, and Relay
2. Update Lock ID in Arduino code
3. Upload code to Arduino
4. Test GPS and GSM connection

## 6. Test the System

### Test User Registration
1. Open app on your device
2. Tap "Register"
3. Fill in: Name, Register No, Phone
4. Select "Cycle Owner"
5. Tap "Register"

### Test Lock Registration
1. After login, tap "+ Register Lock"
2. Enter Lock ID (e.g., "LOCK_001")
3. Enter Cycle Name (e.g., "Red Cycle")
4. Tap "Register Lock"

### Test Renting (requires 2 devices or accounts)
1. Logout and register as "Student (Renter)"
2. View map and tap on available cycle
3. Tap "Rent This Cycle"
4. Check Arduino Serial Monitor - should unlock

## Common Issues

### App won't start
```bash
# Clear cache
expo start -c

# Reset Metro bundler
npm start -- --reset-cache
```

### Can't see cycles on map
- Check Firebase config is correct
- Verify Firestore rules allow read access
- Ensure at least one cycle is registered

### Map not loading
- Verify Google Maps API key
- Enable required APIs in Google Cloud Console
- Check location permissions on device

### Arduino not connecting to Firebase
- Check SIM card has data
- Verify Firebase URL in Arduino code
- Ensure APN settings are correct for your carrier

## Project Structure

```
Cycleapp/
├── app/                    # Expo Router screens
│   ├── index.js           # Entry point
│   ├── login.js           # Login screen
│   ├── register.js        # Registration screen
│   ├── map.js            # Main map screen
│   └── owner/
│       └── register-lock.js
├── components/            # Reusable components
│   └── CycleDetailsModal.js
├── config/               # Configuration files
│   └── firebase.js       # Firebase setup
├── constants/            # App constants
│   └── index.js
├── utils/                # Utility functions
│   └── storage.js
├── arduino/              # Arduino code
│   └── cycle_lock_system.ino
├── docs/                 # Documentation
│   ├── FIREBASE_SETUP.md
│   └── HARDWARE_SETUP.md
└── README.md
```

## Development Tips

### Hot Reload
- Press `r` in Expo CLI to reload
- Shake device to open developer menu

### Debugging
- Use React Native Debugger
- Check Expo logs for errors
- Monitor Firebase console for data

### Testing on Real Device
```bash
# Install Expo Go app on your phone
# Scan QR code from terminal
npm start
```

## Next Steps

1. **Customize**: Update colors, branding in constants
2. **Features**: Add payment integration, ratings
3. **Deploy**: Build standalone APK/IPA
4. **Scale**: Add more campuses, multiple locks

## Support

- Check README.md for detailed information
- Review docs/ folder for setup guides
- Test with Arduino Serial Monitor for hardware issues

## Deployment

### Build Android APK
```bash
expo build:android
```

### Build iOS IPA
```bash
expo build:ios
```

### EAS Build (Recommended)
```bash
npm install -g eas-cli
eas build --platform android
```

---

**Ready to ride! 🚴‍♂️**
