# 🔥 Your Firebase Project Configuration

## ✅ Project Information (Confirmed)

```
Project Name:     karunya-cycle-rental
Project ID:       karunya-cycle-rental
Project Number:   953501174214
Organization:     karunya.edu.in
```

---

## 📋 Next Steps to Get Your Firebase Config

### Step 1: Get Web App Configuration

1. In Firebase Console, click the **⚙️ gear icon** next to "Project Overview"
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. If you see a web app already, click on it
5. If NOT, click the **`</>`** icon to add a web app

### Step 2: Register Web App (if needed)

1. App nickname: **`Karunya Cycle Rental Web`**
2. Don't check Firebase Hosting
3. Click **"Register app"**

### Step 3: Copy Your Config

You'll see something like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "karunya-cycle-rental.firebaseapp.com",
  projectId: "karunya-cycle-rental",
  storageBucket: "karunya-cycle-rental.appspot.com",
  messagingSenderId: "953501174214",
  appId: "1:953501174214:web:...",
  databaseURL: "https://karunya-cycle-rental-default-rtdb.firebaseio.com"
};
```

### Step 4: Update Your App

Copy the entire `firebaseConfig` object and paste it into:
**`config/firebase.js`**

---

## 🗺️ Google Cloud Setup

Since your Firebase project is under **karunya.edu.in** organization, you'll need to:

### For Google Maps API Key:

1. Go to: https://console.cloud.google.com/
2. Select project: **karunya-cycle-rental**
3. Enable APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
4. Create API Key
5. Copy and paste into **`app.json`**

---

## ⚠️ Important Note

Since this is an **organization project** (karunya.edu.in), you may need:
- Admin permissions from your organization
- Approval to enable billing (if required)
- Permission to create API keys

Contact your IT admin if you face permission issues.

---

## 🚀 Ready to Configure?

Once you have the Firebase config values, I can help you update the files!
