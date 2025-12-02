# Lock-to-Owner Connection System

## Complete Connection Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: PRE-REGISTRATION (Admin/Manufacturer)                  │
└─────────────────────────────────────────────────────────────────┘
           │
           ├─► Run: node scripts/setup-locks.js
           │   Creates: LOCK_0001, LOCK_0002, LOCK_0003...
           │   in Firestore (ownerId = null, status = offline)
           │
           ├─► Print lock codes on physical devices
           │
           ├─► Program Arduino with unique LOCK_ID
           │   #define LOCK_ID "LOCK_0001"
           │
           └─► Sell lock to owner with code

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: OWNER REGISTRATION (Cycle Owner)                       │
└─────────────────────────────────────────────────────────────────┘
           │
           ├─► Owner downloads app
           │
           ├─► Registers as "Cycle Owner"
           │   Name: "Raj Kumar"
           │   Phone: "+919876543210"
           │   Email: "raj@karunya.edu"
           │
           └─► Gets Owner ID: "919876543210"

┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: LOCK CLAIMING (Owner Dashboard → Register Lock)        │
└─────────────────────────────────────────────────────────────────┘
           │
           ├─► Owner navigates to "Register Lock" screen
           │
           ├─► Enters Lock Code: "LOCK_0001"
           │   Enters Cycle Name: "My Hero Cycle"
           │
           ├─► App validates:
           │   ✓ Lock code exists in Firestore
           │   ✓ Lock not already owned
           │
           ├─► Updates Firestore:
           │   lockId: "LOCK_0001"
           │   ownerId: "919876543210" ← LINKED!
           │   ownerName: "Raj Kumar"
           │   cycleName: "My Hero Cycle"
           │   status: "available"
           │
           └─► Lock now appears in Owner Dashboard

┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: ARDUINO CONNECTION (Hardware Powers On)                │
└─────────────────────────────────────────────────────────────────┘
           │
           ├─► Arduino connects to WiFi
           │
           ├─► Connects to Firebase Realtime Database
           │   Path: /locks/LOCK_0001/
           │
           ├─► Updates status:
           │   status.online: true
           │   battery: 100
           │   lastUpdated: timestamp
           │
           ├─► Starts listening for commands at:
           │   /locks/LOCK_0001/command
           │
           └─► Status shown in Owner Dashboard
               "🟢 Online" or "🔴 Offline"

┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: RENTAL FLOW (When Renter Books)                        │
└─────────────────────────────────────────────────────────────────┘
           │
           ├─► Renter selects "My Hero Cycle" on map
           │
           ├─► Clicks "Rent This Cycle"
           │
           ├─► App calls: unlockCycle("LOCK_0001")
           │
           ├─► Writes to Firebase Realtime DB:
           │   /locks/LOCK_0001/command = {
           │     action: "UNLOCK",
           │     timestamp: 1701234567890,
           │     executed: false
           │   }
           │
           ├─► Arduino receives command
           │   digitalWrite(LOCK_PIN, LOW) // Unlock
           │   Updates: command.executed = true
           │
           ├─► Lock physically unlocks! 🔓
           │
           └─► Location tracking starts
               Updates every 30s to:
               /cycles/LOCK_0001/location
```

---

## Detailed Step-by-Step Implementation

### **STEP 1: Pre-Register Locks (One-Time Setup)**

#### 1.1 Run Lock Setup Script
```bash
cd Cycleapp
node scripts/setup-locks.js
```

This creates 10 locks (LOCK_0001 to LOCK_0010) in Firestore:
```javascript
// Firestore: cycles collection
{
  lockId: "LOCK_0001",
  lockCode: "LOCK_0001",  // Used for owner registration
  ownerId: null,           // No owner yet
  ownerName: null,
  ownerPhone: null,
  cycleName: null,
  status: "offline",
  location: { latitude: 10.9362, longitude: 76.7441 },
  registeredAt: null
}
```

#### 1.2 Program Each Arduino
Upload this code to each device with unique LOCK_ID:

**For LOCK_0001:**
```cpp
#define LOCK_ID "LOCK_0001"
```

**For LOCK_0002:**
```cpp
#define LOCK_ID "LOCK_0002"
```

...and so on.

---

### **STEP 2: Owner Claims Lock**

#### 2.1 Owner Registration
Owner opens app → Registers with role "owner":
```
Name: Raj Kumar
Phone: +919876543210
Email: raj@karunya.edu
Role: owner
```

#### 2.2 Owner Dashboard
After registration, owner sees:
```
┌─────────────────────────────────┐
│  Owner Dashboard                │
├─────────────────────────────────┤
│  My Cycles: 0                   │
│                                 │
│  [+ Register New Lock]          │
└─────────────────────────────────┘
```

#### 2.3 Register Lock Screen
Owner clicks "Register New Lock" and enters:
```
Lock Code: LOCK_0001
Cycle Name: My Hero Cycle
```

App validates and updates Firestore:
```javascript
// Updates the existing LOCK_0001 document
{
  lockId: "LOCK_0001",
  ownerId: "919876543210",     // ← Owner linked!
  ownerName: "Raj Kumar",
  ownerPhone: "+919876543210",
  cycleName: "My Hero Cycle",
  status: "available",
  registeredAt: "2025-12-02T10:30:00Z"
}
```

---

### **STEP 3: Arduino Connects to Firebase**

#### 3.1 Power On Arduino
When Arduino powers on with WiFi:

```cpp
void setup() {
  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  // Connect to Firebase
  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
  
  // Update online status
  updateStatus(true, true);  // locked=true, online=true
}

void updateStatus(bool locked, bool online) {
  String path = "/locks/" + String(LOCK_ID) + "/status";
  FirebaseJson json;
  json.set("locked", locked);
  json.set("online", online);
  Firebase.setJSON(firebaseData, path, json);
}
```

Firebase Realtime Database now shows:
```javascript
// Realtime DB: /locks/LOCK_0001/
{
  status: {
    locked: true,
    online: true     // ← Arduino is connected!
  },
  battery: 100,
  lastUpdated: 1701234567890
}
```

#### 3.2 Owner Sees Online Status
In Owner Dashboard:
```
┌─────────────────────────────────┐
│  My Cycles                      │
├─────────────────────────────────┤
│  🚲 My Hero Cycle               │
│  📍 Karunya Campus              │
│  🟢 Online | 🔋 100%            │ ← Shows lock is connected
│  Status: Available              │
└─────────────────────────────────┘
```

---

### **STEP 4: Rental Flow**

#### 4.1 Renter Selects Cycle
Renter sees "My Hero Cycle" on map → Clicks marker

#### 4.2 App Unlocks Cycle
When renter confirms rental:

```javascript
// services/lockService.js
export const unlockCycle = async (lockId) => {
  const lockRef = ref(realtimeDb, `locks/${lockId}/command`);
  await set(lockRef, {
    action: 'UNLOCK',
    timestamp: Date.now(),
    executed: false
  });
};
```

Firebase Realtime DB:
```javascript
// /locks/LOCK_0001/command
{
  action: "UNLOCK",
  timestamp: 1701234567890,
  executed: false
}
```

#### 4.3 Arduino Receives Command
Arduino's stream listener detects change:

```cpp
void loop() {
  if (Firebase.readStream(firebaseData)) {
    String action = firebaseData.jsonObject().get("action");
    bool executed = firebaseData.jsonObject().get("executed");
    
    if (!executed && action == "UNLOCK") {
      unlockCycle();  // digitalWrite(LOCK_PIN, LOW)
      
      // Mark as executed
      Firebase.setBool(firebaseData, 
        "/locks/LOCK_0001/command/executed", true);
    }
  }
}
```

🔓 **Lock physically unlocks!**

---

## 🔍 How to Find Lock-Owner Connection

### In Firestore Console:
```
cycles collection → Document ID: (auto-generated)
{
  lockId: "LOCK_0001",
  ownerId: "919876543210",  ← This links lock to owner
  cycleName: "My Hero Cycle"
}
```

### In Realtime Database Console:
```
locks/
  └── LOCK_0001/
      ├── status/
      │   ├── locked: true
      │   └── online: true  ← Arduino connection status
      ├── battery: 100
      └── command/
          ├── action: "UNLOCK"
          └── executed: false
```

### In App Code:
```javascript
// Owner's cycles are fetched with:
const q = query(
  collection(db, 'cycles'),
  where('ownerId', '==', user.id)  ← Finds all owner's locks
);

// For unlock command:
await unlockCycle(cycle.lockId);  ← Uses lockId from Firestore
```

---

## 🛡️ Security: One Lock = One Owner

### Validation in `register-lock.js`:
```javascript
if (existingCycle.ownerId) {
  if (existingCycle.ownerId !== user.id) {
    Alert.alert('Error', 
      'This Lock Code is already registered to another owner.');
    return;
  }
}
```

### Multiple Cycles per Owner:
```javascript
// Owner can register multiple locks:
Owner "Raj Kumar" (ID: 919876543210)
  ├── LOCK_0001 → "My Hero Cycle"
  ├── LOCK_0002 → "My Atlas Cycle"
  └── LOCK_0003 → "My Avon Cycle"
```

---

## 🧪 Testing the Connection

### Test 1: Verify Lock Registration
```bash
# In Firebase Console → Firestore → cycles
# Find document with lockId: "LOCK_0001"
# Check: ownerId should be your phone number
```

### Test 2: Verify Arduino Connection
```bash
# In Firebase Console → Realtime Database → locks → LOCK_0001
# Check: status.online should be true
# Check: battery should show percentage
```

### Test 3: Test Unlock Command
```bash
# In Firebase Console → Realtime Database
# Manually set: locks/LOCK_0001/command
{
  "action": "UNLOCK",
  "timestamp": 1701234567890,
  "executed": false
}
# Watch Arduino serial monitor - should see "Cycle unlocked"
# Check: command.executed should change to true
```

---

## 📞 Troubleshooting

### Lock not appearing in Owner Dashboard?
✓ Check Firestore: Is `ownerId` set correctly?
✓ Check lock code: Must match exactly (case-sensitive)
✓ Try logout/login to refresh data

### Arduino not receiving unlock command?
✓ Check WiFi connection
✓ Verify LOCK_ID matches Firestore `lockId`
✓ Check Firebase Realtime Database rules
✓ Verify database URL in Arduino code

### "Lock already registered" error?
✓ Check Firestore: Lock may already have an `ownerId`
✓ Contact admin to reset lock if needed
✓ Ensure you're using correct lock code

---

# Arduino Lock Integration Guide

## Overview
This document explains how to integrate ESP8266/Arduino-based smart locks with the Karunya Cycle Rental System.

## Hardware Requirements
- ESP8266 NodeMCU or similar WiFi-enabled microcontroller
- Solenoid lock or servo motor for locking mechanism
- 12V power supply for solenoid (if using solenoid lock)
- Relay module (5V)
- GPS module (optional, for cycle location tracking)
- Battery monitoring circuit

## Firebase Realtime Database Structure

Each lock has this structure in Firebase Realtime Database:

```
locks/
  └── LOCK_0001/
      ├── status/
      │   ├── locked: true/false
      │   └── online: true/false
      ├── battery: 85 (percentage)
      ├── lastUpdated: 1701234567890 (timestamp)
      └── command/
          ├── action: "UNLOCK" | "LOCK" | null
          ├── timestamp: 1701234567890
          └── executed: false
```

## Arduino Code Example

```cpp
#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>

// WiFi credentials
#define WIFI_SSID "YourWiFiSSID"
#define WIFI_PASSWORD "YourWiFiPassword"

// Firebase credentials
#define FIREBASE_HOST "karunya-cycle-rental-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "YourDatabaseSecret"

// Lock hardware pins
#define LOCK_PIN D1  // Relay pin for solenoid/servo
#define LOCK_ID "LOCK_0001"

FirebaseData firebaseData;

bool isLocked = true;

void setup() {
  Serial.begin(115200);
  pinMode(LOCK_PIN, OUTPUT);
  digitalWrite(LOCK_PIN, HIGH); // Start locked
  
  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
  
  // Initialize Firebase
  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
  Firebase.reconnectWiFi(true);
  
  // Set initial status
  updateStatus(true, true);
  
  // Start listening for commands
  String commandPath = String("/locks/") + LOCK_ID + "/command";
  if (!Firebase.beginStream(firebaseData, commandPath)) {
    Serial.println("Stream begin error: " + firebaseData.errorReason());
  }
}

void loop() {
  // Listen for lock/unlock commands
  if (Firebase.readStream(firebaseData)) {
    if (firebaseData.dataType() == "json") {
      FirebaseJson &json = firebaseData.jsonObject();
      String action;
      bool executed;
      
      json.get(firebaseData, "action", action);
      json.get(firebaseData, "executed", executed);
      
      if (!executed && action.length() > 0) {
        if (action == "UNLOCK") {
          unlockCycle();
        } else if (action == "LOCK") {
          lockCycle();
        }
        
        // Mark command as executed
        String commandPath = String("/locks/") + LOCK_ID + "/command/executed";
        Firebase.setBool(firebaseData, commandPath, true);
      }
    }
  }
  
  // Update battery status every 5 minutes
  static unsigned long lastBatteryUpdate = 0;
  if (millis() - lastBatteryUpdate > 300000) {
    int batteryLevel = readBatteryLevel();
    updateBattery(batteryLevel);
    lastBatteryUpdate = millis();
  }
  
  delay(100);
}

void unlockCycle() {
  digitalWrite(LOCK_PIN, LOW);  // Activate relay (unlock)
  isLocked = false;
  updateStatus(false, true);
  Serial.println("Cycle unlocked");
  
  // For servo lock, use this instead:
  // servoLock.write(90); // Unlock position
}

void lockCycle() {
  digitalWrite(LOCK_PIN, HIGH); // Deactivate relay (lock)
  isLocked = true;
  updateStatus(true, true);
  Serial.println("Cycle locked");
  
  // For servo lock, use this instead:
  // servoLock.write(0); // Lock position
}

void updateStatus(bool locked, bool online) {
  String statusPath = String("/locks/") + LOCK_ID + "/status";
  FirebaseJson json;
  json.set("locked", locked);
  json.set("online", online);
  Firebase.setJSON(firebaseData, statusPath, json);
  
  String timePath = String("/locks/") + LOCK_ID + "/lastUpdated";
  Firebase.setInt(firebaseData, timePath, millis());
}

void updateBattery(int level) {
  String batteryPath = String("/locks/") + LOCK_ID + "/battery";
  Firebase.setInt(firebaseData, batteryPath, level);
}

int readBatteryLevel() {
  // Read battery voltage and calculate percentage
  // This depends on your battery monitoring circuit
  int analogValue = analogRead(A0);
  int percentage = map(analogValue, 0, 1023, 0, 100);
  return constrain(percentage, 0, 100);
}
```

## Testing the Lock System

### 1. Initialize Lock in Firestore
Run this script to register your locks:

```bash
cd Cycleapp
node scripts/setup-locks.js
```

### 2. Test Unlock Command
From Firebase Console or the app:
```javascript
// This happens automatically when a user rents a cycle
await unlockCycle('LOCK_0001');
```

### 3. Monitor Lock Status
Check Firebase Realtime Database console to see:
- Lock status updates
- Battery level
- Online/offline status
- Command execution

## Power Management

### For Battery-Powered Locks:
1. Use deep sleep when idle
2. Wake up every 30 seconds to check for commands
3. Monitor battery voltage
4. Send low battery alert when <20%

```cpp
// Add to setup()
ESP.deepSleep(30e6); // Sleep for 30 seconds

// Wake up, check commands, go back to sleep
```

## Security Considerations

1. **WiFi Security**: Use WPA2 encryption for campus WiFi
2. **Firebase Rules**: Set proper security rules (see firestore.rules)
3. **Physical Tamper Detection**: Add tamper switch to detect lock removal
4. **Backup Power**: Use capacitor or small battery for power failure

## Troubleshooting

### Lock not responding:
- Check WiFi connection
- Verify Firebase credentials
- Check power supply
- Verify lock ID matches Firestore

### Lock unlocks but app shows locked:
- Check Firebase Realtime Database rules
- Verify `executed` flag is being set
- Check app's real-time listeners

### Battery drains quickly:
- Implement deep sleep
- Reduce status update frequency
- Check for WiFi connection drops (reconnecting drains battery)

## Production Deployment Checklist

- [ ] Test lock mechanism 100+ times for reliability
- [ ] Waterproof enclosure for electronics
- [ ] Backup power system (12+ hours)
- [ ] Low battery alert system
- [ ] Tamper detection circuit
- [ ] Strong physical attachment to cycle
- [ ] Unique lock ID for each unit
- [ ] Firebase security rules configured
- [ ] Emergency manual unlock method
- [ ] Monitoring dashboard for all locks

## Support

For technical support or custom lock integration:
- Email: support@karunya.edu
- GitHub: [Your repo link]
