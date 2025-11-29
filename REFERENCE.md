# 📋 Quick Reference Card

## 🚀 Essential Commands

### Start Development
```bash
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
```

### Setup
```bash
npm install        # Install dependencies
setup.bat          # Windows setup script
./setup.sh         # Linux/Mac setup script
```

## 🔑 Important Files to Configure

### 1. Firebase Config
**File:** `config/firebase.js`
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  // ... more fields
};
```

### 2. Google Maps API
**File:** `app.json`
```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
    }
  }
}
```

### 3. Arduino Lock ID
**File:** `arduino/cycle_lock_system.ino`
```cpp
const char* LOCK_ID = "LOCK_001";
const char* APN = "airtelgprs.com";
const char* FIREBASE_HOST = "your-project.firebaseio.com";
```

## 📍 Karunya Location

```javascript
Latitude:  10.9362
Longitude: 76.7441
```

## 👥 User Roles

- **owner** - Can register locks and manage cycles
- **renter** - Can browse and rent cycles

## 🔐 Lock Status Values

- `LOCKED` - Lock is secured
- `UNLOCKED` - Lock is open
- `UNLOCK_REQUESTED` - Unlock command sent

## 🚲 Cycle Status Values

- `available` - Ready to rent
- `rented` - Currently in use
- `offline` - Owner disabled

## 📊 Firebase Collections

### users
- name
- registerNo
- phoneNumber
- role
- createdAt

### cycles
- lockId (unique)
- cycleName
- ownerId
- ownerName
- ownerPhone
- status
- lockStatus
- location { latitude, longitude }
- rentedBy
- rentedAt
- createdAt
- isOnline

## 🔌 Arduino Pin Configuration

```
SIM800L RX  → Pin 10
SIM800L TX  → Pin 11
GPS RX      → Pin 4
GPS TX      → Pin 3
Relay       → Pin 7
```

## 📱 App Screens

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/index.js` | Entry/Router |
| `/login` | `app/login.js` | Login |
| `/register` | `app/register.js` | Registration |
| `/map` | `app/map.js` | Main Map |
| `/owner/register-lock` | `app/owner/register-lock.js` | Add Lock |

## 🐛 Quick Troubleshooting

### App won't start
```bash
expo start -c  # Clear cache
```

### Can't see cycles
- Check Firebase config
- Verify Firestore rules
- Ensure cycles exist in database

### Map blank
- Add Google Maps API key
- Enable Maps SDK in Google Cloud
- Grant location permission

### Arduino not connecting
- Check SIM800L power (4.0V, 2A)
- Verify APN settings
- Ensure SIM has data

## 📞 Important Links

| Resource | URL |
|----------|-----|
| Firebase Console | https://console.firebase.google.com/ |
| Google Cloud | https://console.cloud.google.com/ |
| Expo Docs | https://docs.expo.dev/ |
| Arduino Reference | https://www.arduino.cc/reference/ |

## 📚 Documentation Files

| File | Content |
|------|---------|
| `README.md` | Main documentation |
| `QUICKSTART.md` | Quick setup |
| `PROJECT_SUMMARY.md` | Complete overview |
| `docs/INSTALLATION.md` | Detailed setup |
| `docs/FIREBASE_SETUP.md` | Firebase config |
| `docs/HARDWARE_SETUP.md` | Arduino setup |
| `docs/APN_SETTINGS.md` | Carrier settings |
| `docs/ASSETS.md` | Icon creation |

## ⚡ APN Quick Reference

| Carrier | APN |
|---------|-----|
| Airtel | airtelgprs.com |
| Jio | jionet |
| Vi (Vodafone) | www |
| BSNL | bsnlnet |

## 🎨 Brand Colors

```javascript
Primary:   #1e40af  (Blue)
Secondary: #3b82f6  (Light Blue)
Success:   #10b981  (Green)
Error:     #ef4444  (Red)
```

## 📦 Key Dependencies

```json
"expo": "~51.0.0"
"react-native": "0.74.0"
"firebase": "^10.7.1"
"react-native-maps": "1.14.0"
"nativewind": "^2.0.11"
```

## 🔄 Workflow

1. User registers (owner/renter)
2. Owner registers lock
3. Arduino sends GPS location
4. Location appears on map
5. Renter taps cycle marker
6. Renter clicks "Rent"
7. Firebase updated
8. Arduino checks status
9. Lock unlocks
10. Renter picks up cycle

## ⚙️ Environment Setup

```bash
# Node.js v16+
node -v

# npm or yarn
npm -v

# Expo CLI
npm install -g expo-cli

# Arduino IDE
# Download from arduino.cc
```

## 📱 Testing

### Test on Device
1. Install Expo Go app
2. Run `npm start`
3. Scan QR code

### Test Hardware
1. Open Serial Monitor (9600 baud)
2. Check GSM connection
3. Verify GPS lock
4. Test relay/lock

## 🎯 Success Metrics

- GPS fix: <3 minutes
- Unlock response: <5 seconds
- Battery life: >8 hours
- Map load: <2 seconds

---

**Keep this card handy for quick reference!** 📌
