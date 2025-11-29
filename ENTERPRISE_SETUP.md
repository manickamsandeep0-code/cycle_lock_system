# Karunya Cycle Rental - Enterprise Setup Guide

## Phase 1 Implementation Complete ✓

### ✅ Completed Features:

1. **Firebase Authentication with OTP**
   - Phone number verification
   - Secure login flow
   - User profile management

2. **IoT Lock Control System**
   - Real-time unlock/lock commands via Firebase Realtime Database
   - Arduino integration ready
   - Lock status monitoring

3. **Payment Gateway Integration (Razorpay)**
   - Payment order creation
   - Payment authorization and hold
   - Payment capture on ride completion
   - Refund system

4. **Firestore Security Rules**
   - Role-based access control
   - Data validation
   - Admin privileges

---

## 🔧 Setup Instructions

### 1. Firebase Configuration

#### Enable Phone Authentication:
1. Go to Firebase Console → Authentication → Sign-in method
2. Enable "Phone" provider
3. Add your app's SHA-256 certificate fingerprint (for Android)
4. For testing, add test phone numbers in Authentication settings

#### Deploy Security Rules:
```bash
# Firestore Rules
firebase deploy --only firestore:rules

# Realtime Database Rules
firebase deploy --only database
```

Or manually copy rules from:
- `firestore.rules` → Firebase Console → Firestore → Rules
- `database.rules.json` → Firebase Console → Realtime Database → Rules

### 2. Razorpay Setup

1. Sign up at https://razorpay.com/
2. Get API keys from Dashboard → Settings → API Keys
3. Update `services/paymentService.js`:
   ```javascript
   const RAZORPAY_KEY_ID = 'rzp_live_YOUR_KEY_ID'; // Replace with your key
   ```
4. **Important**: Never commit secret keys to Git
5. For production, implement backend API for order creation and signature verification

### 3. Configure Phone Authentication

Update `app.json` or `eas.json`:
```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json",
      "permissions": [
        "READ_PHONE_STATE"
      ]
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

### 4. Test Authentication Flow

1. Start with test phone numbers in Firebase Console
2. Test OTP flow: login-otp.js
3. Verify user creation in Firestore users collection
4. Test role-based navigation

---

## 🔐 Security Best Practices

### API Keys Protection:
- Never hardcode API keys in source code
- Use environment variables:
  ```javascript
  import Constants from 'expo-constants';
  const RAZORPAY_KEY = Constants.expoConfig.extra.razorpayKey;
  ```
- Add to `app.config.js`:
  ```javascript
  export default {
    extra: {
      razorpayKey: process.env.RAZORPAY_KEY_ID,
    },
  };
  ```

### Firestore Rules:
- Already implemented role-based access
- Users can only modify their own data
- Admins have elevated privileges
- Transactions are read-only from client

### Payment Security:
- **Always verify payments on backend**
- Implement signature verification
- Use webhooks for payment confirmation
- Never trust client-side payment status alone

---

## 📱 Arduino IoT Integration

### Hardware Requirements:
- ESP8266 or ESP32 microcontroller
- Solenoid lock or servo motor
- Power supply (battery + voltage regulator)
- GPS module (optional for location tracking)

### Arduino Code Template:
```cpp
#include <Firebase_ESP_Client.h>
#include <WiFi.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Firebase
#define DATABASE_URL "karunya-cycle-rental-default-rtdb.firebaseio.com"
#define API_KEY "AIzaSyAoyHayOYX2z09Fm2bpa61ebMiAPH6jH-I"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

String lockId = "LOCK_0001"; // Unique lock ID

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  // Configure Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  Firebase.begin(&config, &auth);
  
  // Setup lock pin
  pinMode(LOCK_PIN, OUTPUT);
  digitalWrite(LOCK_PIN, LOW); // Locked by default
}

void loop() {
  // Listen for lock commands
  if (Firebase.RTDB.getString(&fbdo, "/locks/" + lockId + "/command")) {
    String command = fbdo.stringData();
    
    if (command == "unlock") {
      digitalWrite(LOCK_PIN, HIGH); // Unlock
      updateLockStatus("unlocked");
    } else if (command == "lock") {
      digitalWrite(LOCK_PIN, LOW); // Lock
      updateLockStatus("locked");
    }
  }
  
  delay(1000); // Check every second
}

void updateLockStatus(String status) {
  Firebase.RTDB.setString(&fbdo, "/locks/" + lockId + "/status", status);
  Firebase.RTDB.setInt(&fbdo, "/locks/" + lockId + "/timestamp", millis());
}
```

---

## 🚀 Production Deployment Checklist

### Before Going Live:

#### 1. Backend API (Required for Production)
- [ ] Create Node.js/Python backend
- [ ] Implement Razorpay order creation API
- [ ] Add payment signature verification
- [ ] Setup webhook endpoints
- [ ] Implement refund API

#### 2. Firebase Configuration
- [ ] Enable Firebase App Check
- [ ] Setup Firebase Cloud Functions for:
  - Auto-expiring rentals
  - Payment webhook handling
  - Email/SMS notifications
- [ ] Configure backup and recovery

#### 3. Security Hardening
- [ ] Enable SSL pinning
- [ ] Implement rate limiting
- [ ] Add fraud detection
- [ ] Setup monitoring and alerts
- [ ] Implement logging (Sentry/Firebase Crashlytics)

#### 4. Testing
- [ ] Unit tests for payment flow
- [ ] Integration tests for lock control
- [ ] Load testing (100+ concurrent users)
- [ ] Security penetration testing
- [ ] UAT with real users

#### 5. Legal & Compliance
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Liability waiver
- [ ] Insurance coverage
- [ ] GDPR compliance (if applicable)

#### 6. Arduino Production Setup
- [ ] Flash firmware to all locks
- [ ] Test each lock individually
- [ ] Setup monitoring for offline locks
- [ ] Implement battery alerts
- [ ] Create lock maintenance schedule

---

## 🔄 Migration from Old Auth to New Auth

### For Existing Users:

1. **Data Migration Script**:
```javascript
// Run once to migrate existing users
const migrateUsers = async () => {
  const usersSnapshot = await getDocs(collection(db, 'users'));
  
  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    
    // Create Firebase Auth user
    try {
      const userRecord = await admin.auth().createUser({
        uid: userDoc.id,
        phoneNumber: `+91${userData.phoneNumber}`,
        displayName: userData.name,
      });
      
      console.log('Migrated:', userRecord.uid);
    } catch (error) {
      console.error('Failed to migrate:', userDoc.id, error);
    }
  }
};
```

2. **Gradual Rollout**:
- Keep old login temporarily
- Add "Try New Login" option
- Monitor adoption rate
- Remove old login after 100% migration

---

## 📊 Monitoring & Analytics

### Key Metrics to Track:
- Active rentals per hour
- Average rental duration
- Payment success rate
- Lock unlock/lock success rate
- User retention rate
- Revenue per cycle per day

### Setup:
```bash
npm install --save firebase/analytics
```

Add to app:
```javascript
import { logEvent } from 'firebase/analytics';
import { analytics } from './config/firebase';

// Track events
logEvent(analytics, 'rental_completed', {
  cycle_id: cycleId,
  duration: minutes,
  price: amount,
});
```

---

## 🆘 Support & Troubleshooting

### Common Issues:

**OTP not received:**
- Check Firebase Console → Authentication → Phone numbers quota
- Verify test numbers are added for development
- Check phone number format (+91XXXXXXXXXX)

**Payment failed:**
- Verify Razorpay keys are correct
- Check test mode vs live mode
- Verify webhook URL is configured

**Lock not responding:**
- Check Arduino WiFi connection
- Verify Firebase Realtime Database rules
- Check lock status in Firebase Console

**Security rules blocking access:**
- Verify user is authenticated
- Check user role in Firestore
- Review rules in Firebase Console

---

## 📞 Next Steps

### Immediate:
1. Test OTP login flow
2. Setup Razorpay test account
3. Configure security rules
4. Test one cycle end-to-end

### This Week:
1. Flash firmware to 3 test locks
2. Run pilot with 10 users
3. Monitor for bugs
4. Collect feedback

### Phase 2 (Next Implementation):
- Real-time location tracking
- Auto-expiring rentals
- Geofencing
- Damage reporting
- Admin dashboard

---

## 📝 Notes

- Current payment integration is client-side only (NOT PRODUCTION READY)
- Must implement backend for payment security
- Test thoroughly before deploying to students
- Keep test environment separate from production
- Document all issues and resolutions

