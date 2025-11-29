# 📱 Building Standalone APK - Complete Guide

## 🎯 Build Options

### Option 1: EAS Build (Cloud Build - Recommended) ⭐
Build your APK on Expo's servers - easiest and fastest!

### Option 2: Local Build (Your PC)
Build on your own computer - more control but requires setup.

---

## ✅ Option 1: EAS Cloud Build (Recommended)

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

If you don't have an Expo account:
- Create one at: https://expo.dev/signup
- It's FREE for basic usage!

### Step 3: Configure Your Project

```bash
eas build:configure
```

This will set up your project for building.

### Step 4: Build APK

```bash
npm run build:android
```

Or directly:
```bash
eas build --platform android --profile preview
```

### Step 5: Download Your APK

1. EAS will show a build URL in the terminal
2. Wait for build to complete (10-20 minutes)
3. Click the URL to download your APK
4. Transfer APK to your Android phone
5. Install it!

**Cost: FREE** (Expo gives free build credits!)

---

## 💻 Option 2: Local Build (Advanced)

### Requirements:
- Android Studio installed
- Java JDK 17
- 8GB+ RAM
- 20GB+ free disk space

### Step 1: Install Android Studio

1. Download from: https://developer.android.com/studio
2. Install Android SDK
3. Install Android NDK
4. Set up environment variables:
   ```
   ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
   ```

### Step 2: Install Dependencies

```bash
npm install -g eas-cli
npm install
```

### Step 3: Generate Native Code

```bash
npx expo prebuild
```

This creates `android/` folder with native code.

### Step 4: Build APK Locally

```bash
cd android
.\gradlew assembleRelease
```

Your APK will be in:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 🚀 Quick Build (Easiest Method)

### Using EAS Build (Cloud):

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login
eas login

# 3. Build APK
npm run build:android

# 4. Download from the provided URL
```

**That's it!** You'll get a download link for your APK.

---

## 📦 APK Details

Your built APK will be:
- **Name**: Karunya Cycle Rental
- **Package**: com.karunya.cyclerental
- **Size**: ~50-80 MB
- **Min Android**: 5.0 (API 21)
- **Target Android**: Latest

---

## 📲 Installing Your APK

### On Android Phone:

1. **Download APK** to your phone
2. **Enable Unknown Sources**:
   - Settings → Security → Unknown Sources → Enable
   - Or: Settings → Apps → Special Access → Install Unknown Apps
3. **Open APK file** from Downloads
4. **Tap Install**
5. **Open app** and test!

---

## 🔧 Build Profiles Explained

### Preview Profile (Default)
```json
"preview": {
  "android": {
    "buildType": "apk"  // Creates installable APK
  }
}
```
- ✅ Easy to share and install
- ✅ No Google Play needed
- ✅ Perfect for testing

### Production Profile
```json
"production": {
  "android": {
    "buildType": "app-bundle"  // For Play Store
  }
}
```
- Used for Google Play Store
- Creates AAB (not APK)
- Requires Play Store upload

---

## 💰 Costs

### EAS Build (Cloud):
- **Free Tier**: 30 builds/month
- **Paid**: $29/month for unlimited
- **First-time**: Free credits available!

### Local Build:
- **Cost**: $0 (completely free)
- **Trade-off**: Complex setup, slower

---

## ⚡ Fastest Way to Get Your APK

Run these 3 commands:

```bash
npm install -g eas-cli
eas login
npm run build:android
```

Wait 15-20 minutes, download APK, done! 🎉

---

## 🆘 Troubleshooting

### "eas: command not found"
```bash
npm install -g eas-cli
```

### "Not logged in"
```bash
eas login
```

### Build fails with Java error (local build)
- Install Java JDK 17
- Set JAVA_HOME environment variable

### APK won't install
- Enable "Install from Unknown Sources"
- Check Android version (needs 5.0+)

---

## 🎯 After Building

### Test Your APK:
- ✅ Install on real Android device
- ✅ Test all features
- ✅ Check Firebase connection
- ✅ Test map loading
- ✅ Test cycle rental flow

### Share Your APK:
- Upload to Google Drive
- Share via WhatsApp
- Email to users
- Host on your website

---

## 📊 Build Status Tracking

When building with EAS:
1. Visit: https://expo.dev/accounts/[your-account]/projects/cycle-rental-app/builds
2. See build progress
3. Download completed builds
4. View build logs

---

## 🚀 Next Steps After APK

1. **Test thoroughly** on multiple devices
2. **Collect feedback** from users
3. **Fix bugs** and rebuild
4. **Publish to Play Store** (optional)
   ```bash
   eas build --platform android --profile production
   eas submit --platform android
   ```

---

## ✅ Recommended: Use EAS Cloud Build

**Why?**
- ✅ No complex setup
- ✅ Fast and reliable
- ✅ Works on any computer
- ✅ Free tier available
- ✅ Professional builds

**Just run:**
```bash
npm install -g eas-cli
eas login
npm run build:android
```

**Your real Android app will be ready in 20 minutes!** 📱
