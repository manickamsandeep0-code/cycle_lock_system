# Project Structure

```
Cycleapp/
│
├── app/                           # Expo Router - Main application screens
│   ├── _layout.js                # Root layout with navigation configuration
│   ├── index.js                  # Entry point - redirects to login or map
│   ├── login.js                  # Login screen for existing users
│   ├── register.js               # Registration screen with role selection
│   ├── map.js                    # Main map screen showing cycles
│   └── owner/
│       └── register-lock.js      # Screen for owners to register IoT locks
│
├── components/                    # Reusable React components
│   └── CycleDetailsModal.js      # Modal showing cycle details for renters
│
├── config/                        # Configuration files
│   └── firebase.js               # Firebase initialization and setup
│
├── constants/                     # App-wide constants
│   └── index.js                  # Karunya location, user roles, status codes
│
├── utils/                         # Utility functions
│   └── storage.js                # AsyncStorage helpers for user data
│
├── arduino/                       # Hardware/IoT code
│   └── cycle_lock_system.ino     # Arduino sketch for GSM/GPS lock
│
├── docs/                          # Documentation
│   ├── FIREBASE_SETUP.md         # Step-by-step Firebase configuration
│   ├── HARDWARE_SETUP.md         # Arduino hardware assembly guide
│   └── APN_SETTINGS.md           # Mobile carrier APN settings
│
├── assets/                        # App assets (create these)
│   ├── icon.png                  # App icon (1024x1024)
│   ├── splash.png                # Splash screen
│   ├── adaptive-icon.png         # Android adaptive icon
│   └── favicon.png               # Web favicon
│
├── node_modules/                  # Dependencies (auto-generated)
│
├── .expo/                         # Expo cache (auto-generated)
│
├── package.json                   # Node dependencies and scripts
├── app.json                      # Expo configuration
├── babel.config.js               # Babel configuration for NativeWind
├── tailwind.config.js            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── .gitignore                    # Git ignore rules
├── README.md                     # Main project documentation
├── QUICKSTART.md                 # Quick setup guide
├── setup.sh                      # Setup script (Linux/Mac)
└── setup.bat                     # Setup script (Windows)
```

## Key Files Explained

### App Screens (`app/`)

| File | Purpose | User Type |
|------|---------|-----------|
| `_layout.js` | Defines navigation structure | All |
| `index.js` | Entry point, handles authentication routing | All |
| `login.js` | Phone number-based login | All |
| `register.js` | New user registration with role selection | All |
| `map.js` | Interactive map with cycle markers | All |
| `owner/register-lock.js` | Register new IoT lock | Owners only |

### Components (`components/`)

| File | Purpose |
|------|---------|
| `CycleDetailsModal.js` | Bottom sheet modal for cycle information and rent button |

### Configuration (`config/` & Root)

| File | Purpose |
|------|---------|
| `firebase.js` | Firebase app initialization |
| `package.json` | npm dependencies and scripts |
| `app.json` | Expo app configuration, permissions, API keys |
| `babel.config.js` | Babel for NativeWind support |
| `tailwind.config.js` | Tailwind CSS theming |

### Arduino (`arduino/`)

| File | Purpose |
|------|---------|
| `cycle_lock_system.ino` | Complete Arduino code for IoT lock with GPS tracking |

### Documentation (`docs/`)

| File | Purpose |
|------|---------|
| `FIREBASE_SETUP.md` | Firebase project setup and security rules |
| `HARDWARE_SETUP.md` | Circuit diagrams and assembly instructions |
| `APN_SETTINGS.md` | Mobile carrier settings for SIM800L |

## Data Flow

```
┌─────────────────┐
│  React Native   │
│      App        │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│   Firestore     │  │   Realtime DB   │
│   (Main Data)   │  │  (Live Updates) │
└────────┬────────┘  └────────┬────────┘
         │                    │
         └──────────┬─────────┘
                    │
                    ▼
           ┌─────────────────┐
           │   SIM800L GSM   │
           │   (HTTP API)    │
           └────────┬────────┘
                    │
                    ▼
           ┌─────────────────┐
           │     Arduino     │
           │  (Controller)   │
           └────────┬────────┘
                    │
         ┌──────────┼──────────┐
         ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐
    │  GPS   │ │ Relay  │ │ Lock   │
    └────────┘ └────────┘ └────────┘
```

## Firebase Collections

### `users`
```javascript
{
  id: "auto-generated",
  name: "string",
  registerNo: "string",
  phoneNumber: "string",
  role: "owner" | "renter",
  createdAt: "ISO timestamp"
}
```

### `cycles`
```javascript
{
  id: "auto-generated",
  lockCode: "string (unique)",
  cycleName: "string",
  ownerId: "string (ref to users)",
  ownerName: "string",
  ownerPhone: "string",
  status: "available" | "rented" | "offline",
  lockStatus: "LOCKED" | "UNLOCKED" | "UNLOCK_REQUESTED",
  location: {
    latitude: number,
    longitude: number
  },
  rentedBy: "string (ref to users)",
  rentedAt: "ISO timestamp",
  createdAt: "ISO timestamp",
  isOnline: boolean
}
```

## Screens Flow

```
Start
  │
  ├─ Has User Data? ─── No ──→ Login Screen
  │                              │
  │                              ├─ New User? ──→ Register Screen
  │                              │                     │
  │                              └─────────────────────┘
  │                                                     │
  └─ Yes ──────────────────────────────────────────────┘
                                                        │
                                                        ▼
                                                   Map Screen
                                                        │
                                    ┌───────────────────┴───────────────────┐
                                    │                                       │
                                    ▼                                       ▼
                              Owner Mode                              Renter Mode
                                    │                                       │
                    ┌───────────────┴────────────────┐                     │
                    │                                │                     │
                    ▼                                ▼                     ▼
          Register Lock Screen          Toggle Availability      Cycle Details Modal
                                                                            │
                                                                            ▼
                                                                      Rent Cycle
                                                                            │
                                                                            ▼
                                                                    Unlock Request
```

## Setup Checklist

- [ ] Install Node.js v16+
- [ ] Run `npm install`
- [ ] Create Firebase project
- [ ] Enable Firestore
- [ ] Enable Realtime Database
- [ ] Update `config/firebase.js`
- [ ] Get Google Maps API key
- [ ] Update `app.json`
- [ ] Configure Firebase rules
- [ ] Assemble Arduino hardware
- [ ] Upload Arduino code
- [ ] Test GPS lock
- [ ] Test GSM connection
- [ ] Run app: `npm start`
- [ ] Test registration
- [ ] Test lock registration
- [ ] Test rental flow

---

For detailed instructions, see README.md and QUICKSTART.md
