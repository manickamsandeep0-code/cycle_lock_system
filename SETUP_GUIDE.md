# 🔥 Firebase Project Setup - Step by Step Guide

## Part 1: Create Firebase Project (10 minutes)

### Step 1: Access Firebase Console

1. Open your web browser
2. Go to: **https://console.firebase.google.com/**
3. Click **"Sign in"** with your Google account
4. If you don't have a Google account, create one first

---

### Step 2: Create New Project

1. Click the **"Add project"** or **"Create a project"** button
   - You'll see a large **"+"** icon if you have no projects

2. **Project Name:**
   - Enter: `karunya-cycle-rental` (or any name you prefer)
   - Click **"Continue"**

3. **Google Analytics (Optional):**
   - Toggle **OFF** if you don't need analytics (recommended for simplicity)
   - Or toggle **ON** and select your Analytics account
   - Click **"Continue"**

4. **Wait for Creation:**
   - Firebase will create your project (takes 30-60 seconds)
   - Click **"Continue"** when done

---

### Step 3: Enable Firestore Database

1. In the left sidebar, find and click **"Firestore Database"**
   - Under "Build" section

2. Click **"Create database"** button

3. **Secure Rules:**
   - Select **"Start in test mode"** (easier for development)
   - Click **"Next"**

4. **Cloud Firestore Location:**
   - Select: **"asia-south1 (Mumbai)"** (closest to India)
   - Or choose the region closest to you
   - Click **"Enable"**

5. **Wait for Setup:**
   - Firestore will be created (takes 1-2 minutes)

6. **Set Security Rules:**
   - Click **"Rules"** tab at the top
   - Replace the content with:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if true;
       }
       match /cycles/{cycleId} {
         allow read, write: if true;
       }
     }
   }
   ```
   - Click **"Publish"**

---

### Step 4: Enable Realtime Database

1. In the left sidebar, click **"Realtime Database"**
   - Under "Build" section

2. Click **"Create Database"** button

3. **Database Location:**
   - It will use the same region as Firestore
   - Click **"Next"**

4. **Security Rules:**
   - Select **"Start in test mode"**
   - Click **"Enable"**

5. **Wait for Creation:**
   - Database will be created (takes 30 seconds)

6. **Set Security Rules:**
   - Click **"Rules"** tab
   - Replace with:
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
   - Click **"Publish"**

---

### Step 5: Get Firebase Configuration

1. Click the **⚙️ Gear icon** (Settings) next to "Project Overview" in the left sidebar
2. Select **"Project settings"**

3. Scroll down to **"Your apps"** section
4. Click the **Web icon** `</>`  (looks like HTML tags)

5. **Register Web App:**
   - App nickname: `Karunya Cycle Rental`
   - ❌ Don't check "Firebase Hosting" (not needed)
   - Click **"Register app"**

6. **Copy Configuration:**
   - You'll see a code snippet like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "karunya-cycle-rental.firebaseapp.com",
     projectId: "karunya-cycle-rental",
     storageBucket: "karunya-cycle-rental.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef123456",
     databaseURL: "https://karunya-cycle-rental-default-rtdb.firebaseio.com"
   };
   ```

7. **Copy This Entire Object!**
   - Select all the text inside `firebaseConfig = { ... }`
   - Copy it (Ctrl+C or Cmd+C)

8. Click **"Continue to console"**

---

### Step 6: Update Your App

1. Open your project folder: `C:\Users\sandeep.m.k\Desktop\Cycleapp`

2. Open file: `config\firebase.js`

3. **Replace the placeholder values:**

   **BEFORE:**
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

   **AFTER:** (paste your copied values)
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "karunya-cycle-rental.firebaseapp.com",
     projectId: "karunya-cycle-rental",
     storageBucket: "karunya-cycle-rental.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef123456",
     databaseURL: "https://karunya-cycle-rental-default-rtdb.firebaseio.com"
   };
   ```

4. **Save the file** (Ctrl+S)

---

### Step 7: Verify Firebase Setup

1. In Firebase Console, go to **"Firestore Database"**
2. You should see empty collections (this is normal)
3. Go to **"Realtime Database"**
4. You should see `null` (this is normal)

✅ **Firebase is now configured!**

---

## 🎉 Firebase Setup Complete!

### What You've Done:
✅ Created Firebase project  
✅ Enabled Firestore Database  
✅ Enabled Realtime Database  
✅ Configured security rules  
✅ Got Firebase configuration  
✅ Updated `config/firebase.js`  

### Next: Get Google Maps API Key →

---

# 🗺️ Google Maps API Key - Step by Step Guide

## Part 2: Get Google Maps API Key (10 minutes)

### Step 1: Access Google Cloud Console

1. Open your web browser
2. Go to: **https://console.cloud.google.com/**
3. Sign in with the **same Google account** you used for Firebase

---

### Step 2: Create or Select Project

**Option A: Use Existing Firebase Project (Recommended)**

1. At the top of the page, click the **project dropdown**
2. Find and select: `karunya-cycle-rental` (your Firebase project)
3. Skip to Step 3

**Option B: Create New Project**

1. Click the **project dropdown** at the top
2. Click **"New Project"**
3. Enter project name: `Karunya Maps`
4. Click **"Create"**
5. Wait for creation (30 seconds)

---

### Step 3: Enable Required APIs

1. In the left sidebar, click **"APIs & Services"**
2. Click **"Library"**

3. **Enable Maps SDK for Android:**
   - In the search box, type: `Maps SDK for Android`
   - Click on **"Maps SDK for Android"**
   - Click the blue **"Enable"** button
   - Wait for it to enable (10 seconds)

4. **Go back to Library** (click "< Library" or use browser back)

5. **Enable Maps SDK for iOS:**
   - In the search box, type: `Maps SDK for iOS`
   - Click on **"Maps SDK for iOS"**
   - Click the blue **"Enable"** button
   - Wait for it to enable (10 seconds)

---

### Step 4: Create API Key

1. In the left sidebar, click **"APIs & Services"**
2. Click **"Credentials"**

3. Click the **"+ CREATE CREDENTIALS"** button at the top
4. Select **"API key"** from the dropdown

5. **API Key Created!**
   - A popup will show: "API key created"
   - You'll see something like: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXX`
   - Click **"COPY"** to copy the key
   - **Keep this popup open!**

---

### Step 5: Restrict API Key (Important for Security)

1. In the popup, click **"EDIT API KEY"** or **"RESTRICT KEY"**

2. **API Key Name:**
   - Change name to: `Maps Key - Karunya Cycle App`

3. **Application Restrictions:**
   - Select: **"Android apps"**
   - Click **"+ Add an item"**
   - Package name: `com.karunya.cyclerental`
   - SHA-1 certificate fingerprint: Leave empty for now (you'll add later)
   - Click **"Done"**

4. **API Restrictions:**
   - Select: **"Restrict key"**
   - Check ✅ **"Maps SDK for Android"**
   - Check ✅ **"Maps SDK for iOS"**

5. Click **"SAVE"** at the bottom

---

### Step 6: Update Your App

1. Open your project folder: `C:\Users\sandeep.m.k\Desktop\Cycleapp`

2. Open file: `app.json`

3. **Find this section:**
   ```json
   "android": {
     "config": {
       "googleMaps": {
         "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
       }
     }
   }
   ```

4. **Replace with your API key:**
   ```json
   "android": {
     "config": {
       "googleMaps": {
         "apiKey": "AIzaSyXXXXXXXXXXXXXXXXXXXXXXX"
       }
     }
   }
   ```

5. **Save the file** (Ctrl+S)

---

### Step 7: Verify API Key

1. Go back to Google Cloud Console
2. Click **"APIs & Services"** → **"Credentials"**
3. You should see your API key listed
4. Status should show as **"Active"**

✅ **Google Maps API Key is configured!**

---

## 🎉 Complete Setup Done!

### What You've Done:
✅ Accessed Google Cloud Console  
✅ Created/Selected project  
✅ Enabled Maps SDK for Android  
✅ Enabled Maps SDK for iOS  
✅ Created API key  
✅ Restricted API key for security  
✅ Updated `app.json`  

---

## 📋 Quick Verification Checklist

### Firebase Configuration ✅
- [ ] Firebase project created
- [ ] Firestore Database enabled
- [ ] Realtime Database enabled
- [ ] Security rules published
- [ ] `config/firebase.js` updated

### Google Maps Configuration ✅
- [ ] Google Cloud project selected
- [ ] Maps SDK for Android enabled
- [ ] Maps SDK for iOS enabled
- [ ] API key created
- [ ] API key restricted
- [ ] `app.json` updated

---

## 🚀 Ready to Run!

Now you can start your app:

```bash
cd C:\Users\sandeep.m.k\Desktop\Cycleapp
npm install
npm start
```

---

## 📸 Visual Reference (What You Should See)

### Firebase Console:
```
Project Overview
├── Firestore Database (enabled)
├── Realtime Database (enabled)
└── Project Settings (config copied)
```

### Google Cloud Console:
```
APIs & Services
├── Library
│   ├── Maps SDK for Android (enabled)
│   └── Maps SDK for iOS (enabled)
└── Credentials
    └── API Key (created & restricted)
```

### Your Files:
```
config/firebase.js ✅ Updated
app.json ✅ Updated
```

---

## ⚠️ Important Notes

### Security
- ✅ Never share your API keys publicly
- ✅ Always restrict API keys
- ✅ Use environment variables in production

### Costs
- 🆓 Firebase has generous free tier (Spark plan)
- 🆓 Google Maps: $200 free credit per month
- 📊 Monitor usage in both consoles

### Testing
- Test with small data first
- Monitor Firebase database in console
- Check Maps load correctly in app

---

## 🆘 Troubleshooting

### Firebase Issues

**"Permission denied" error:**
- ✅ Check security rules are published
- ✅ Verify rules allow read/write
- ✅ Ensure `config/firebase.js` is correct

**Can't see database:**
- ✅ Wait 1-2 minutes after creation
- ✅ Refresh the browser
- ✅ Check correct project is selected

### Google Maps Issues

**Map not loading:**
- ✅ Verify API key is correct in `app.json`
- ✅ Check APIs are enabled
- ✅ Wait 5 minutes after enabling APIs

**"API key not valid" error:**
- ✅ Copy the entire key (no spaces)
- ✅ Check key restrictions
- ✅ Verify package name matches

---

## 📞 Need Help?

1. **Firebase Issues:**
   - Docs: https://firebase.google.com/docs
   - Check Firestore/Realtime DB sections

2. **Maps Issues:**
   - Docs: https://developers.google.com/maps/documentation
   - Check Android/iOS SDK sections

3. **App Issues:**
   - See: `docs/INSTALLATION.md`
   - Check: `QUICKSTART.md`

---

## ✅ You're All Set!

Your Firebase and Google Maps are now configured. Run the app and test:

```bash
npm start
```

**Happy Coding! 🚴‍♂️**
