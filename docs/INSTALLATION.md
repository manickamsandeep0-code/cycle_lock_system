# Complete Installation & Testing Guide

This guide walks you through the entire setup process from scratch to a working system.

## Part 1: Software Setup (30 minutes)

### Step 1: Prerequisites

Install the following software:

1. **Node.js** (v16 or higher)
   - Download: https://nodejs.org/
   - Verify: `node -v` and `npm -v`

2. **Git** (optional, for version control)
   - Download: https://git-scm.com/

3. **Expo Go App** (on your mobile device)
   - iOS: App Store
   - Android: Google Play Store

4. **Arduino IDE** (for hardware)
   - Download: https://www.arduino.cc/en/software

### Step 2: Project Setup

```bash
# Navigate to project directory
cd Cycleapp

# Run setup script (Windows)
setup.bat

# OR (Linux/Mac)
chmod +x setup.sh
./setup.sh

# OR manually
npm install
```

### Step 3: Firebase Configuration

1. **Create Project**
   - Go to https://console.firebase.google.com/
   - Click "Add Project"
   - Name: `karunya-cycle-rental`
   - Click through setup

2. **Enable Services**
   - Click "Firestore Database" → "Create Database" → "Test mode" → "Enable"
   - Click "Realtime Database" → "Create Database" → "Test mode" → "Enable"

3. **Get Configuration**
   - Click ⚙️ → "Project Settings"
   - Scroll to "Your apps" → Web icon (</>)
   - Copy `firebaseConfig` object

4. **Update App**
   - Open `config/firebase.js`
   - Replace placeholder values with your config

5. **Set Security Rules**

   **Firestore Rules:**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if true;
         allow create: if true;
         allow update, delete: if true;
       }
       match /cycles/{cycleId} {
         allow read: if true;
         allow create: if true;
         allow update: if true;
         allow delete: if true;
       }
     }
   }
   ```

   **Realtime Database Rules:**
   ```json
   {
     "rules": {
       "cycles": {
         "$lockId": {
           ".read": true,
           ".write": true
         }
       }
     }
   }
   ```

### Step 4: Google Maps Setup

1. **Get API Key**
   - Go to https://console.cloud.google.com/
   - Create project or select existing
   - Enable "Maps SDK for Android" and "Maps SDK for iOS"
   - Create API Key

2. **Update Configuration**
   - Open `app.json`
   - Find `android.config.googleMaps.apiKey`
   - Replace `YOUR_GOOGLE_MAPS_API_KEY` with your key

### Step 5: Run the App

```bash
# Start development server
npm start

# Scan QR code with Expo Go app on your phone
# OR
# Press 'a' for Android emulator
# Press 'i' for iOS simulator
```

## Part 2: Hardware Setup (60 minutes)

### Step 1: Gather Components

- [ ] Arduino Uno/Nano
- [ ] SIM800L GSM Module
- [ ] Neo 6M GPS Module
- [ ] Relay Module (5V)
- [ ] Solenoid Lock (12V)
- [ ] LM2596 Buck Converter
- [ ] 12V Battery/Power Supply
- [ ] Breadboard and jumper wires
- [ ] SIM card with data plan

### Step 2: Wire Connections

**Power Setup:**
```
12V Battery → Buck Converter Input
Buck Converter Output (4.0V) → SIM800L VCC
12V Battery → Arduino Vin
Arduino 5V → GPS VCC, Relay VCC
All GND → Common Ground
```

**Data Connections:**
```
SIM800L TX → Arduino Pin 10
SIM800L RX → Arduino Pin 11
GPS TX     → Arduino Pin 3
GPS RX     → Arduino Pin 4
Relay IN   → Arduino Pin 7
```

**Lock Circuit:**
```
Relay COM  → +12V
Relay NO   → Solenoid Lock (+)
Lock (-)   → GND
```

### Step 3: Configure Arduino Code

1. Open Arduino IDE
2. Install library: Sketch → Include Library → Manage Libraries
3. Search and install "TinyGPS++"
4. Open `arduino/cycle_lock_system.ino`
5. Update configuration:

```cpp
const char* LOCK_ID = "LOCK_001";  // Make this unique
const char* APN = "airtelgprs.com"; // Your carrier APN
const char* FIREBASE_HOST = "your-project.firebaseio.com";
```

6. Select board: Tools → Board → Arduino Uno
7. Select port: Tools → Port → COM[X]
8. Upload: Sketch → Upload

### Step 4: Test Hardware

1. **Open Serial Monitor** (115200 baud)

2. **Check GSM:**
   ```
   Expected output:
   AT
   OK
   AT+SAPBR=2,1
   +SAPBR: 1,1,"10.xxx.xxx.xxx"
   ```

3. **Check GPS:**
   - Wait 2-5 minutes for GPS lock
   - Should show latitude/longitude

4. **Test Lock:**
   - Manually trigger relay
   - Should hear click
   - Solenoid should activate

## Part 3: End-to-End Testing (15 minutes)

### Test 1: User Registration (Owner)

1. Open app
2. Tap "Register"
3. Fill in:
   - Name: "Test Owner"
   - Register No: "123456"
   - Phone: "9876543210"
   - Role: "Cycle Owner"
4. Tap "Register"
5. Verify: Redirects to map screen

**Verification:**
- Check Firebase Console → Firestore → users
- Should see new user document

### Test 2: Register Lock

1. On map screen, tap "+ Register Lock"
2. Fill in:
   - Lock ID: "LOCK_001" (must match Arduino)
   - Cycle Name: "Test Cycle"
3. Tap "Register Lock"

**Verification:**
- Check Firebase Console → Firestore → cycles
- Should see new cycle document

### Test 3: Arduino Location Update

1. Ensure Arduino has GPS lock
2. Watch Serial Monitor
3. Should see: "Sending location update..."

**Verification:**
- Check Firebase Console → Realtime Database
- Should see: `cycles/LOCK_001/location` with lat/lng

### Test 4: Rent Cycle (Renter)

1. Logout from app
2. Register new user:
   - Name: "Test Renter"
   - Register No: "654321"
   - Phone: "9876543211"
   - Role: "Student (Renter)"
3. On map, tap green cycle marker
4. View details modal
5. Tap "Rent This Cycle"

**Verification:**
- Alert: "Cycle unlocked!"
- Check Firestore: cycle status = "rented"
- Check Realtime DB: lockStatus = "UNLOCK_REQUESTED"
- Arduino Serial Monitor: "UNLOCK REQUEST RECEIVED"
- Relay should activate
- Solenoid lock should open

## Part 4: Troubleshooting

### App Issues

**Error: "No cycles visible on map"**
- Check Firebase config is correct
- Verify cycles collection has data
- Check location is near Karunya (10.9362, 76.7441)

**Error: "Map not loading"**
- Verify Google Maps API key
- Check API is enabled in Google Cloud
- Grant location permission to app

**Error: "Cannot register user"**
- Check Firebase connection
- Verify Firestore rules allow writes
- Check internet connection

### Hardware Issues

**SIM800L not responding**
- Check power: Needs 3.7-4.2V, 2A
- Verify RX/TX connections (may be swapped)
- Ensure SIM card inserted properly
- Check AT commands: Send "AT", expect "OK"

**GPS no location**
- Place GPS antenna outdoors with sky view
- Wait 2-5 minutes for first fix
- Check GPS LED is blinking
- Verify RX/TX connections

**Lock not unlocking**
- Check relay is clicking
- Verify 12V supply to solenoid
- Test relay with digitalWrite manually
- Check Firebase DB shows UNLOCK_REQUESTED

**HTTP requests failing**
- Verify APN settings for your carrier
- Check SIM has active data plan
- Ensure Firebase URL is correct
- Monitor network signal strength

## Part 5: Production Checklist

Before deploying:

- [ ] Firebase rules properly configured (not test mode)
- [ ] Google Maps API key restricted (not public)
- [ ] Custom app icons created
- [ ] Tested on real devices
- [ ] Battery optimization tested
- [ ] Error handling implemented
- [ ] Lock mechanism tested 100+ times
- [ ] GPS accuracy verified
- [ ] Network failover tested
- [ ] User feedback collected

## Performance Benchmarks

Expected performance:

| Metric | Target | Acceptable |
|--------|--------|------------|
| GPS First Fix | <3 min | <5 min |
| Location Update | Every 10s | Every 30s |
| Unlock Response | <5s | <10s |
| Map Load Time | <2s | <5s |
| Battery Life | >8 hours | >4 hours |

## Support Resources

- **Firebase Issues**: https://firebase.google.com/support
- **Expo Issues**: https://docs.expo.dev/
- **Arduino Issues**: https://forum.arduino.cc/
- **React Native**: https://reactnative.dev/help

## Next Steps

After successful testing:

1. **Customize Branding**
   - Update colors in `constants/index.js`
   - Add custom assets
   - Update app name in `app.json`

2. **Add Features**
   - Payment integration
   - Rental history
   - Push notifications
   - Rating system

3. **Deploy**
   - Build APK: `eas build --platform android`
   - Submit to Play Store
   - Distribute to users

---

**Congratulations!** 🎉 Your Karunya Cycle Rental System is now operational!
