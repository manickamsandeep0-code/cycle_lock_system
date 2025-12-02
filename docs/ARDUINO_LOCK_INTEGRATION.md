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

### Core Components:
- **Microcontroller:** Arduino Nano/Uno or ESP32
- **SIM Module:** SIM800L (2G/3G) or SIM7600 (4G LTE) with active SIM card
- **Lock Mechanism:** Solenoid lock (12V) or Servo motor (SG90)
- **Relay Module:** 5V relay for solenoid control
- **GPS Module:** NEO-6M or NEO-7M (for real-time location tracking)
- **Power Supply:** 
  - 18650 Li-ion battery (3.7V, 2600mAh) x 2 in series = 7.4V
  - Step-up converter to 12V for solenoid
  - Step-down converter to 5V for Arduino
- **Battery Monitoring:** Voltage divider circuit for battery level detection

### Why SIM Module Instead of WiFi?
✅ Works anywhere with cellular coverage (entire campus + beyond)
✅ Maintains connection while cycle moves
✅ No need for WiFi infrastructure
✅ More reliable for outdoor use
✅ Can track cycle even if taken off-campus

### Recommended SIM Module:
**SIM800L** (Budget option - 2G/3G):
- Cost: ₹200-300
- Power: 2A peak (during transmission)
- Network: 2G/3G (sufficient for Firebase commands)

**SIM7600** (Better option - 4G LTE):
- Cost: ₹1500-2000
- Power: More efficient than SIM800L
- Network: 4G LTE (faster, more reliable)
- Future-proof (2G networks being shut down)

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

## Arduino Code Example (with SIM800L/SIM7600)

### Required Libraries:
```cpp
// Install these libraries in Arduino IDE:
// - TinyGSM (for SIM module)
// - ArduinoHttpClient
// - ArduinoJson
```

### Complete Arduino Code:

```cpp
#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>
#include <SoftwareSerial.h>

// SIM Module Configuration
#define SIM_RX 10  // Connect to SIM module TX
#define SIM_TX 11  // Connect to SIM module RX
#define SIM_RESET 9

// APN Configuration (Update for your SIM provider)
const char apn[] = "airtelgprs.com";  // Airtel
// const char apn[] = "internet";      // Jio
// const char apn[] = "www";           // Vodafone/Idea
const char gprsUser[] = "";
const char gprsPass[] = "";

// Firebase Configuration
const char server[] = "karunya-cycle-rental-default-rtdb.firebaseio.com";
const int port = 443;  // HTTPS
const char firebaseAuth[] = "YOUR_DATABASE_SECRET";  // Get from Firebase Console

// Lock Configuration
#define LOCK_ID "LOCK_0001"  // ← UNIQUE FOR EACH DEVICE
#define LOCK_PIN 7           // Relay control pin
#define BATTERY_PIN A0       // Battery voltage monitoring

// GPS Module (Optional but recommended)
#define GPS_RX 4
#define GPS_TX 3

// Initialize SIM module
SoftwareSerial SimSerial(SIM_RX, SIM_TX);
TinyGsm modem(SimSerial);
TinyGsmClient client(modem);
HttpClient http(client, server, port);

bool isLocked = true;
unsigned long lastCommandCheck = 0;
unsigned long lastLocationUpdate = 0;
unsigned long lastBatteryUpdate = 0;

void setup() {
  Serial.begin(9600);
  SimSerial.begin(9600);
  
  pinMode(LOCK_PIN, OUTPUT);
  pinMode(SIM_RESET, OUTPUT);
  pinMode(BATTERY_PIN, INPUT);
  
  // Start locked
  digitalWrite(LOCK_PIN, HIGH);
  
  Serial.println("Initializing modem...");
  
  // Reset SIM module
  digitalWrite(SIM_RESET, HIGH);
  delay(100);
  digitalWrite(SIM_RESET, LOW);
  delay(3000);
  digitalWrite(SIM_RESET, HIGH);
  delay(3000);
  
  // Initialize modem
  if (!modem.restart()) {
    Serial.println("Failed to restart modem");
    return;
  }
  
  Serial.print("Modem: ");
  Serial.println(modem.getModemInfo());
  
  // Connect to GPRS network
  Serial.print("Connecting to APN: ");
  Serial.println(apn);
  
  if (!modem.gprsConnect(apn, gprsUser, gprsPass)) {
    Serial.println("GPRS connection failed");
    return;
  }
  
  Serial.println("GPRS connected!");
  Serial.print("IP: ");
  Serial.println(modem.getLocalIP());
  
  // Update initial status
  updateStatus(true, true);
  updateBatteryLevel();
  
  Serial.println("Lock system ready");
}

void loop() {
  // Check for unlock/lock commands every 5 seconds
  if (millis() - lastCommandCheck > 5000) {
    checkForCommands();
    lastCommandCheck = millis();
  }
  
  // Update GPS location every 30 seconds (if GPS module connected)
  if (millis() - lastLocationUpdate > 30000) {
    updateLocation();
    lastLocationUpdate = millis();
  }
  
  // Update battery status every 5 minutes
  if (millis() - lastBatteryUpdate > 300000) {
    updateBatteryLevel();
    lastBatteryUpdate = millis();
  }
  
  delay(100);
}

void checkForCommands() {
  String path = "/locks/" + String(LOCK_ID) + "/command.json?auth=" + firebaseAuth;
  
  http.get(path);
  int statusCode = http.responseStatusCode();
  String response = http.responseBody();
  
  if (statusCode == 200) {
    // Parse JSON response
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      const char* action = doc["action"];
      bool executed = doc["executed"];
      
      if (action && !executed) {
        Serial.print("Received command: ");
        Serial.println(action);
        
        if (strcmp(action, "UNLOCK") == 0) {
          unlockCycle();
          markCommandExecuted();
        } else if (strcmp(action, "LOCK") == 0) {
          lockCycle();
          markCommandExecuted();
        }
      }
    }
  }
  
  http.stop();
}

void unlockCycle() {
  digitalWrite(LOCK_PIN, LOW);  // Activate relay (unlock solenoid)
  isLocked = false;
  Serial.println("✓ Cycle UNLOCKED");
  updateStatus(false, true);
  
  // For servo lock, use:
  // servoLock.write(90);  // Unlock position
}

void lockCycle() {
  digitalWrite(LOCK_PIN, HIGH);  // Deactivate relay (lock solenoid)
  isLocked = true;
  Serial.println("✓ Cycle LOCKED");
  updateStatus(true, true);
  
  // For servo lock, use:
  // servoLock.write(0);  // Lock position
}

void updateStatus(bool locked, bool online) {
  String path = "/locks/" + String(LOCK_ID) + "/status.json?auth=" + firebaseAuth;
  String jsonData = "{\"locked\":" + String(locked ? "true" : "false") + 
                    ",\"online\":" + String(online ? "true" : "false") + "}";
  
  http.put(path, "application/json", jsonData);
  http.stop();
  
  // Update timestamp
  path = "/locks/" + String(LOCK_ID) + "/lastUpdated.json?auth=" + firebaseAuth;
  jsonData = String(millis());
  http.put(path, "application/json", jsonData);
  http.stop();
}

void markCommandExecuted() {
  String path = "/locks/" + String(LOCK_ID) + "/command/executed.json?auth=" + firebaseAuth;
  http.put(path, "application/json", "true");
  http.stop();
}

void updateBatteryLevel() {
  int rawValue = analogRead(BATTERY_PIN);
  
  // Convert to voltage (assuming voltage divider R1=10K, R2=10K)
  float voltage = (rawValue / 1023.0) * 5.0 * 2.0;  // *2 for voltage divider
  
  // Convert to percentage (7.4V full, 6.0V empty for 2S Li-ion)
  int percentage = map(voltage * 100, 600, 740, 0, 100);
  percentage = constrain(percentage, 0, 100);
  
  String path = "/locks/" + String(LOCK_ID) + "/battery.json?auth=" + firebaseAuth;
  http.put(path, "application/json", String(percentage));
  http.stop();
  
  Serial.print("Battery: ");
  Serial.print(percentage);
  Serial.println("%");
  
  // Low battery warning
  if (percentage < 20) {
    Serial.println("⚠️ LOW BATTERY!");
    // Could send notification via Firebase
  }
}

void updateLocation() {
  // If GPS module is connected, read and update location
  // For now, sending a static location or reading from GPS
  
  // Example: Read from GPS module (requires TinyGPS++ library)
  // float lat = gps.location.lat();
  // float lng = gps.location.lng();
  
  // For testing, use static location
  float lat = 10.9362;
  float lng = 76.7441;
  
  String path = "/locks/" + String(LOCK_ID) + "/location.json?auth=" + firebaseAuth;
  String jsonData = "{\"latitude\":" + String(lat, 6) + 
                    ",\"longitude\":" + String(lng, 6) + "}";
  
  http.put(path, "application/json", jsonData);
  http.stop();
}
```

### APN Settings for Indian SIM Providers:

```cpp
// Airtel
const char apn[] = "airtelgprs.com";

// Jio
const char apn[] = "jionet";

// Vodafone/Vi
const char apn[] = "www";

// BSNL
const char apn[] = "bsnlnet";
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

### Battery System for Mobile Cycle Lock:

**Recommended Setup:**
- 2x 18650 Li-ion batteries (3.7V, 2600mAh) in series = 7.4V
- Capacity: ~2600mAh at 7.4V
- Expected runtime: 2-3 days with periodic checks

**Power Distribution:**
```
7.4V Battery Pack
    │
    ├──► Step-up (MT3608) → 12V → Solenoid Lock
    │
    ├──► Step-down (LM2596) → 5V → Arduino Nano
    │
    └──► Direct → SIM Module (accepts 3.4-4.4V)
```

**Power Consumption:**
- Arduino Nano: ~20mA (idle), 50mA (active)
- SIM800L: 100mA (idle), 2A (peak during transmission)
- Solenoid: 1-2A (only during unlock/lock - 1 second)
- GPS Module: 40mA

**Battery Life Optimization:**

1. **Sleep Mode Between Commands:**
```cpp
// Check commands every 30 seconds instead of continuously
void loop() {
  checkForCommands();
  updateLocationIfNeeded();
  
  // Sleep for 30 seconds to save power
  LowPower.powerDown(SLEEP_8S, ADC_OFF, BOD_OFF);  // Repeat 4 times for ~30s
}
```

2. **Disable SIM Module When Not Needed:**
```cpp
// Turn off SIM module after sending data
modem.gprsDisconnect();
modem.poweroff();

// Turn on only when needed
modem.restart();
modem.gprsConnect(apn, gprsUser, gprsPass);
```

3. **Solar Panel Option (Recommended for Long-term):**
- 6V 1W solar panel on cycle basket/seat
- TP4056 charging module
- Keeps battery topped up during day
- Cost: ₹200-300 additional

**Charging:**
- Remove battery pack and charge with standard Li-ion charger
- Or use TP4056 module with micro-USB charging
- Charge time: 2-3 hours

## Security Considerations

1. **SIM Security**: 
   - Use prepaid SIM with limited balance (₹50-100 recharge)
   - Block voice calls, only allow data
   - Use VPN/encrypted connection if possible

2. **Firebase Rules**: Set proper security rules (see firestore.rules)

3. **Physical Tamper Detection**: 
   - Add reed switch to detect enclosure opening
   - Send alert to owner if tamper detected

4. **Backup Power**: 
   - Small capacitor (2200µF) to complete ongoing lock/unlock during power loss

5. **SIM Card Lock**: 
   - Use SIM PIN to prevent SIM theft usage
   - Embed SIM inside sealed enclosure

6. **HTTPS Communication**: 
   - Always use HTTPS (port 443) for Firebase communication
   - Prevents command interception

## Troubleshooting

### Lock not responding:
- **Check SIM signal**: AT+CSQ command (should return >10)
- **Check GPRS connection**: AT+CGATT? (should return 1)
- **Verify Firebase auth key**: Check Firebase Console → Database → Settings
- **Check power supply**: Measure battery voltage (should be >6.5V)
- **Verify lock ID**: Must match exactly in Arduino and Firestore

### Lock unlocks but app shows locked:
- **Check Firebase Realtime Database rules**: Must allow read/write
- **Verify `executed` flag**: Should change to `true` after unlock
- **Check app's real-time listeners**: May need to restart app

### Battery drains quickly:
- **Implement sleep mode**: Check for commands every 30s, not continuously
- **Check for poor signal**: Weak signal causes more power drain
- **Reduce transmission frequency**: Update location every 2-5 minutes
- **Check for SIM module overheating**: May indicate short circuit

### SIM module not connecting:
- **Check APN settings**: Must match your SIM provider
- **Verify SIM activation**: Data plan must be active
- **Check antenna**: SIM modules often need external antenna for good signal
- **Try different location**: Some areas have poor cellular coverage

### Commands delayed:
- **Network latency**: 2G/3G can have 5-10 second delays
- **Check Firebase location**: Use Mumbai/Singapore region for India
- **Increase check frequency**: Reduce sleep time between checks

---

## 💰 Cost Breakdown (Per Lock Unit)

### Budget Build (~₹1,500):
| Component | Cost (₹) |
|-----------|----------|
| Arduino Nano | 150 |
| SIM800L Module | 250 |
| Solenoid Lock (12V) | 300 |
| 5V Relay Module | 40 |
| 2x 18650 Batteries | 200 |
| Battery Holder | 30 |
| Step-up Converter (MT3608) | 30 |
| Step-down Converter (LM2596) | 40 |
| GPS Module (NEO-6M) | 200 |
| Enclosure Box | 100 |
| Wires, Connectors | 50 |
| PCB (optional) | 100 |
| **Total** | **₹1,490** |

### Premium Build (~₹2,500):
| Component | Cost (₹) |
|-----------|----------|
| ESP32 | 400 |
| SIM7600 (4G LTE) | 1,500 |
| High-security Solenoid | 500 |
| GPS Module (NEO-7M) | 300 |
| Solar Panel + Charger | 300 |
| Other components | 500 |
| **Total** | **₹2,500** |

### Recurring Costs:
- **SIM Recharge**: ₹50-100/month (data only plan)
- **Battery Replacement**: ₹200/year (if no solar panel)
- **Maintenance**: Minimal

---

## 🚀 Quick Start Guide

### Step 1: Buy Components
```
Order from:
- Amazon.in
- Robu.in
- ElectronicSpices.com
- Local electronics market
```

### Step 2: Assemble Hardware
```
1. Connect SIM module to Arduino:
   SIM_TX → Arduino Pin 10
   SIM_RX → Arduino Pin 11
   VCC → 3.7-4.2V (direct from battery or use regulator)
   GND → GND

2. Connect Relay to Arduino:
   IN → Arduino Pin 7
   VCC → 5V
   GND → GND
   
3. Connect Solenoid to Relay:
   Relay COM → 12V+
   Relay NO → Solenoid +
   Solenoid - → 12V GND

4. Connect GPS (optional):
   GPS_TX → Arduino Pin 4
   GPS_RX → Arduino Pin 3
   VCC → 5V
   GND → GND

5. Power distribution:
   Battery 7.4V → Step-up → 12V (for solenoid)
   Battery 7.4V → Step-down → 5V (for Arduino)
   Battery 7.4V → Direct to SIM module
```

### Step 3: Get Firebase Database Secret
```
1. Go to Firebase Console
2. Select your project
3. Click Settings (gear icon)
4. Go to Project Settings → Service Accounts
5. Click "Database Secrets"
6. Copy the secret key
7. Paste in Arduino code: const char firebaseAuth[]
```

### Step 4: Program Arduino
```
1. Install Arduino IDE
2. Install libraries:
   - TinyGSM
   - ArduinoHttpClient
   - ArduinoJson
   
3. Update Arduino code:
   - Set LOCK_ID (unique for each device)
   - Set APN for your SIM provider
   - Set Firebase auth key
   
4. Upload to Arduino
```

### Step 5: Test
```
1. Open Serial Monitor (9600 baud)
2. Should see:
   "Modem: SIM800L"
   "Connecting to APN..."
   "GPRS connected!"
   "Lock system ready"

3. Test unlock from Firebase Console:
   Realtime Database → locks → LOCK_0001 → command
   Set: {"action": "UNLOCK", "executed": false, "timestamp": 1234567890}

4. Arduino should print: "✓ Cycle UNLOCKED"
```

### Step 6: Register in App
```
1. Run: node scripts/setup-locks.js
2. Open app → Owner Dashboard → Register Lock
3. Enter: LOCK_0001
4. Enter cycle name
5. Lock now appears in dashboard with online status
```

---

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
