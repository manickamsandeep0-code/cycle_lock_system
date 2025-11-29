# Karunya Cycle Rental System

A comprehensive React Native Expo application for managing cycle rentals at Karunya Institute of Technology, integrated with IoT-enabled smart locks.

## 🚴‍♂️ Features

### For Students (Renters)
- **Interactive Map**: View all available cycles on campus with real-time location
- **Easy Rental**: Tap on a cycle marker to view details and rent instantly
- **One-Tap Unlock**: Unlock cycles remotely through the app
- **Real-time Updates**: See cycle availability in real-time

### For Cycle Owners
- **Lock Registration**: Register your IoT lock with a unique ID
- **Availability Control**: Toggle your cycle online/offline
- **Rental Tracking**: Monitor when your cycle is rented

### Hardware Integration
- **IoT Lock System**: Arduino-based lock with GPS tracking
- **Real-time Location**: GPS module sends location every 10 seconds
- **Remote Control**: GSM module communicates with Firebase
- **Automatic Unlocking**: Solenoid lock controlled remotely

## 📱 Tech Stack

- **Framework**: React Native with Expo
- **Routing**: Expo Router
- **Backend**: Firebase (Firestore & Realtime Database)
- **Maps**: react-native-maps
- **Styling**: NativeWind (Tailwind CSS)
- **Storage**: AsyncStorage

## 🛠️ Hardware Requirements

- Arduino Uno/Nano
- SIM800L GSM Module
- Neo 6M GPS Module
- Solenoid Lock
- Relay Module
- Power Supply (suitable for GSM and solenoid)

## 📦 Installation

### 1. Clone the Repository
```bash
cd Cycleapp
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database and Realtime Database
3. Copy your Firebase config and update `config/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  databaseURL: "YOUR_DATABASE_URL"
};
```

### 4. Google Maps API (Android)

1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Update `app.json`:

```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
    }
  }
}
```

### 5. Run the App

```bash
# Start Expo
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## 🔧 Arduino Setup

### 1. Install Required Libraries
- TinyGPS++
- SoftwareSerial (included with Arduino IDE)

### 2. Hardware Connections

```
SIM800L GSM Module:
- RX -> Arduino Pin 10
- TX -> Arduino Pin 11
- VCC -> 3.7-4.2V (Use separate power supply)
- GND -> Common Ground

Neo 6M GPS Module:
- RX -> Arduino Pin 4
- TX -> Arduino Pin 3
- VCC -> 5V
- GND -> GND

Relay Module:
- Signal -> Arduino Pin 7
- VCC -> 5V
- GND -> GND
- Load -> Solenoid Lock
```

### 3. Configure Arduino Code

Open `arduino/cycle_lock_system.ino` and update:

```cpp
const char* LOCK_ID = "LOCK_001";  // Your unique lock ID
const char* APN = "internet";      // Your mobile network APN
const char* FIREBASE_HOST = "your-project.firebaseio.com";
```

### 4. Upload to Arduino

1. Open the `.ino` file in Arduino IDE
2. Select your board (Arduino Uno/Nano)
3. Select the correct COM port
4. Click Upload

## 📊 Firebase Database Structure

### Firestore Collections

#### users
```json
{
  "name": "John Doe",
  "registerNo": "123456",
  "phoneNumber": "9876543210",
  "role": "owner" | "renter",
  "createdAt": "2025-11-28T..."
}
```

#### cycles
```json
{
  "lockId": "LOCK_001",
  "cycleName": "Red Cycle",
  "ownerId": "user_id",
  "ownerName": "John Doe",
  "ownerPhone": "9876543210",
  "status": "available" | "rented" | "offline",
  "lockStatus": "LOCKED" | "UNLOCKED" | "UNLOCK_REQUESTED",
  "location": {
    "latitude": 10.9362,
    "longitude": 76.7441
  },
  "rentedBy": "user_id",
  "rentedAt": "2025-11-28T...",
  "createdAt": "2025-11-28T...",
  "isOnline": true
}
```

### Realtime Database Structure
```json
{
  "cycles": {
    "LOCK_001": {
      "location": {
        "latitude": 10.9362,
        "longitude": 76.7441,
        "timestamp": "123456789"
      },
      "lockStatus": "LOCKED"
    }
  }
}
```

## 🎯 Usage Flow

### For Renters

1. **Register/Login**: Create account as "Student (Renter)"
2. **Browse Map**: View available cycles on Karunya campus
3. **Select Cycle**: Tap on green marker to view details
4. **Rent**: Click "Rent This Cycle" button
5. **Unlock**: Lock automatically unlocks after successful rental
6. **Pick Up**: Collect the cycle from its location

### For Owners

1. **Register/Login**: Create account as "Cycle Owner"
2. **Register Lock**: Enter your unique Lock ID from Arduino
3. **Add Details**: Name your cycle
4. **Go Online**: Your cycle appears on the map
5. **Monitor**: Track rentals through the app

## 🔐 Security Features

- Phone number-based authentication
- Unique Lock ID verification
- Real-time status updates
- Owner contact information visible to renters
- Automated lock/unlock mechanism

## 📍 Karunya Campus Location

The app is centered on Karunya Institute of Technology:
- **Latitude**: 10.9362
- **Longitude**: 76.7441

## 🐛 Troubleshooting

### App Issues

**Can't see cycles on map:**
- Ensure Firebase is configured correctly
- Check internet connection
- Verify Firestore rules allow read access

**Map not loading:**
- Verify Google Maps API key
- Check location permissions

### Arduino Issues

**GSM not connecting:**
- Check SIM card has active data plan
- Verify APN settings for your network
- Ensure adequate power supply (SIM800L needs 2A)

**GPS not getting location:**
- GPS needs clear sky view
- First fix can take 2-5 minutes
- Check antenna connection

**Lock not unlocking:**
- Verify relay connections
- Check solenoid power supply
- Test relay manually

## 📝 Development Notes

- The app uses Expo Router for navigation
- NativeWind is configured for Tailwind-style styling
- Real-time updates use Firestore listeners
- AsyncStorage handles local user data

## 🚀 Future Enhancements

- Payment integration
- Rental history
- Cycle damage reporting
- Rating system
- Push notifications
- Return location tracking
- Multi-campus support

## 📄 License

This project is for educational purposes at Karunya Institute of Technology.

## 👥 Support

For issues or questions, contact the development team at Karunya Institute.

---

**Made with ❤️ for Karunya Institute of Technology**
