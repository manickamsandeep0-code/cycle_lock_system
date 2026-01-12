# Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name: `karunya-cycle-rental`
4. Enable Google Analytics (optional)
5. Click "Create Project"

## Step 2: Enable Firestore Database

1. In Firebase Console, click "Firestore Database"
2. Click "Create Database"
3. Select "Start in test mode" (we'll configure rules later)
4. Choose location closest to India (e.g., `asia-south1`)
5. Click "Enable"

## Step 3: Enable Realtime Database

1. Click "Realtime Database" in the sidebar
2. Click "Create Database"
3. Select "Start in test mode"
4. Click "Enable"

## Step 4: Get Firebase Configuration

1. Click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps"
4. Click the web icon (`</>`) to add a web app
5. Register app name: `Karunya Cycle Rental`
6. Copy the `firebaseConfig` object
7. Paste it into `config/firebase.js`

## Step 5: Configure Security Rules

### Firestore Rules

In Firebase Console → Firestore Database → Rules, paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if true;
      allow update, delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Cycles collection
    match /cycles/{cycleId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && 
                      resource.data.ownerId == request.auth.uid;
    }
  }
}
```

### Realtime Database Rules

In Firebase Console → Realtime Database → Rules, paste:

```json
{
  "rules": {
    "cycles": {
      "$lockCode": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

## Step 6: Update App Configuration

1. Open `config/firebase.js`
2. Replace placeholder values with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "karunya-cycle-rental.firebaseapp.com",
  projectId: "karunya-cycle-rental",
  storageBucket: "karunya-cycle-rental.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:...",
  databaseURL: "https://karunya-cycle-rental-default-rtdb.firebaseio.com"
};
```

## Step 7: Test Connection

1. Run the app: `npm start`
2. Try to register a new user
3. Check Firebase Console → Firestore → users collection
4. You should see the new user document

## Troubleshooting

### "Firebase not initialized" error
- Verify all config values are correct
- Check that Firebase SDK version is compatible

### "Permission denied" error
- Check Firestore rules are published
- Verify database is in test mode or rules allow access

### Can't write to Realtime Database
- Check Realtime Database URL is correct
- Verify rules allow write access

## Optional: Enable Authentication

For production, you may want to enable Firebase Authentication:

1. Go to Firebase Console → Authentication
2. Click "Get Started"
3. Enable "Phone" authentication
4. Follow setup instructions

This will add an extra layer of security beyond just storing user data in Firestore.
