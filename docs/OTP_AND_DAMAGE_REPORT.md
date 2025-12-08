# OTP Registration & Damage Reporting Features

## Recently Added Features

### 1. OTP-Based Registration

Secure phone authentication using Firebase Auth with OTP verification.

**Features:**
- SMS OTP sent to user's phone number
- 6-digit verification code
- 60-second resend timer
- Automatic user profile creation
- Prevents duplicate registrations

**User Flow:**
1. Enter 10-digit phone number
2. Receive OTP via SMS
3. Enter 6-digit OTP
4. Complete profile (name, register number, role)
5. Auto-login and redirect to dashboard

**Files:**
- `app/otp-register.js` - OTP registration UI
- `services/otpService.js` - OTP sending and verification logic

**Usage:**
```javascript
import { sendOTP, verifyOTP, createUserProfile } from '../services/otpService';

// Send OTP
await sendOTP(phoneNumber); // +91XXXXXXXXXX

// Verify OTP
const result = await verifyOTP(otp); // Returns { uid, phoneNumber }

// Create profile
await createUserProfile(uid, userData);
```

### 2. Damage Reporting System

Allow renters to report cycle damage with photo evidence.

**Features:**
- Take photos or choose from gallery
- Multiple image upload (compressed to 70% quality)
- Categorize damage type (mechanical, cosmetic, safety, other)
- Severity levels (minor, moderate, severe)
- Detailed description field
- Images uploaded to Firebase Storage
- Reports stored in Firestore
- Cycle flagged with damage indicator

**User Flow:**
1. During active rental, tap "Report Damage or Issue"
2. Take/select photos (minimum 1 required)
3. Select damage type and severity
4. Write detailed description
5. Submit report (owner notified)

**Files:**
- `app/damage-report.js` - Damage reporting UI
- `services/damageReportService.js` - Photo upload and report submission

**Database Schema:**
```javascript
// Firestore: damageReports collection
{
  cycleId: string,
  userId: string,
  userName: string,
  description: string,
  damageType: 'mechanical' | 'cosmetic' | 'safety' | 'other',
  severity: 'minor' | 'moderate' | 'severe',
  imageUrls: string[], // Firebase Storage URLs
  status: 'pending' | 'acknowledged' | 'resolved',
  createdAt: ISO timestamp,
  updatedAt: ISO timestamp,
  resolvedAt: ISO timestamp | null,
  adminNotes: string
}

// Firestore: cycles collection (updated)
{
  ...existing fields,
  hasDamageReports: boolean,
  lastDamageReportAt: ISO timestamp
}
```

**Usage:**
```javascript
import { 
  pickImageFromCamera, 
  pickImageFromGallery,
  submitDamageReport 
} from '../services/damageReportService';

// Take photo
const uri = await pickImageFromCamera();

// Pick from gallery
const uri = await pickImageFromGallery();

// Submit report
const reportData = {
  userId: user.id,
  userName: user.name,
  description: 'Front brake not working',
  damageType: 'safety',
  severity: 'severe',
  imageUris: [uri1, uri2]
};

await submitDamageReport(cycleId, reportData);
```

## Installation

The required packages are already installed:

```bash
npm install expo-image-picker firebase-admin@^11.0.0
```

**Note:** `firebase-admin` is included but OTP currently uses client-side Firebase Auth. For production, consider moving OTP generation to a backend server for better security.

## Firebase Configuration

### Enable Phone Authentication:
1. Go to Firebase Console → Authentication
2. Enable "Phone" sign-in method
3. Add authorized domains (for web testing)

### Enable Firebase Storage:
1. Go to Firebase Console → Storage
2. Click "Get Started"
3. Set security rules:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /damage-reports/{cycleId}/{imageId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Optional: Add reCAPTCHA (Web Testing):
For testing OTP in web/Expo Go, you may need to set up reCAPTCHA verification in Firebase Console.

## UI Updates

### Login Screen:
- Added "Register with OTP" button (primary)
- Kept "Quick Register (No OTP)" as secondary option

### My Rental Screen:
- Added "🔧 Report Damage or Issue" button
- Positioned between "Complete Ride" and "Back to Map"
- Orange border styling for visibility

## Security Considerations

**Current Implementation:**
- Client-side OTP verification (suitable for pilot/testing)
- Phone Auth uses Firebase's built-in security

**Production Recommendations:**
1. Move OTP generation to backend (Firebase Cloud Functions)
2. Implement rate limiting (prevent SMS spam)
3. Add phone number verification cooldown
4. Validate user data server-side before account creation
5. Implement Firestore Security Rules:

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /damageReports/{reportId} {
      // Anyone can read reports
      allow read: if true;
      
      // Only authenticated users can create reports
      allow create: if request.auth != null 
                    && request.resource.data.userId == request.auth.uid;
      
      // Only admins can update reports
      allow update: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /users/{userId} {
      // Users can read their own data
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Users can create their own profile during registration
      allow create: if request.auth != null && request.auth.uid == userId;
      
      // Users can update their own data
      allow update: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Testing

### Test OTP Registration:
1. Run app: `npx expo start`
2. Navigate to Login → "Register with OTP"
3. Enter phone number (use your real number for testing)
4. Check SMS for OTP code
5. Enter OTP and complete profile
6. Verify account created in Firebase Console

**Note:** Firebase provides limited free SMS for testing. Use Test Phone Numbers in Firebase Console for unlimited testing:
- Console → Authentication → Settings → Phone numbers for testing
- Add: +91 1234567890 → OTP: 123456

### Test Damage Reporting:
1. Start an active rental
2. Navigate to My Rental screen
3. Tap "🔧 Report Damage or Issue"
4. Take/select photos
5. Fill out form and submit
6. Verify report in Firestore Console → damageReports collection
7. Check images in Storage Console → damage-reports/{cycleId}/

## Known Limitations

1. **OTP in Expo Go:** May require additional setup for reCAPTCHA on web. Works best on physical devices.
2. **Image Upload Size:** Large images are compressed to 70% quality. Adjust in `damageReportService.js` if needed.
3. **Offline Mode:** Damage reports require internet connection (no offline queue yet).
4. **Admin Dashboard:** Viewing/managing damage reports requires admin UI (pending implementation).

## Next Steps

**Recommended Enhancements:**
1. Add damage report notifications (Push Notifications)
2. Create owner dashboard to view reports
3. Add admin approval workflow for damage claims
4. Implement repair cost tracking
5. Add photo zoom/viewer in reports
6. Create damage report history for each cycle
7. Add email notifications for critical damages

## File Structure

```
app/
  ├── otp-register.js          # OTP registration flow (3 steps)
  ├── damage-report.js          # Damage reporting form
  ├── login.js                  # Updated with OTP option
  └── my-rental.js             # Added damage report button

services/
  ├── otpService.js            # OTP send/verify/profile creation
  └── damageReportService.js   # Photo picker/upload, report submission

config/
  └── firebase.js              # Added Firebase Storage export
```

## Support

For issues or questions:
- Check Firebase Console logs for OTP errors
- Verify Storage rules are configured
- Check network connectivity for image uploads
- Review Firestore Security Rules if write operations fail
