# Karunya Cycle Rental System

## Project Draft

The Karunya Cycle Rental System is an IoT-enabled campus bicycle sharing platform built for Karunya Institute of Technology. It combines a React Native mobile app, Firebase backend services, and an ESP8266-based smart lock to support real-time cycle discovery, rental, locking, unlocking, and live tracking.

The system is designed around two user roles: owners and renters. Owners register their cycle lock, publish availability windows, and monitor cycle status. Renters browse available cycles on a live map, inspect cycle details, start a rental, and interact with the lock during the ride. The project also includes damage reporting, review submission, geofence monitoring, battery tracking, and automatic expiration of cycle availability.

## 1. Project Objective

The main goal of the project is to digitize campus cycle sharing with live hardware control and centralized status management. The system aims to:

- make cycles discoverable on a campus map in real time
- allow owners to control whether a cycle is available for rent
- allow renters to start and complete rides through the app
- connect the app to a physical lock using an IoT device
- keep the database synchronized with live lock and location updates
- prevent invalid rentals by checking availability, duration, and current status

## 2. Problem Statement

Manual cycle sharing systems often suffer from poor visibility, lack of accountability, and no live tracking. Users cannot easily know whether a cycle is available, how long it will stay available, or whether the lock has actually responded to a rental request. This project addresses those issues by creating a connected rental system with a single source of truth for status, live map tracking, and automated ride completion logic.

## 3. System Overview

The project is split into three major parts:

### Mobile Application

Built with React Native and Expo Router, the app handles registration, login, map browsing, rental flow, ride completion, review submission, damage reporting, and owner dashboards.

### Cloud Backend

Firebase Firestore stores the main application data such as users, cycles, rentals, reviews, and history. Firebase Realtime Database stores live lock data such as GPS coordinates, battery status, commands, and lock status updates.

### IoT Lock Controller

An ESP8266 NodeMCU-based lock reads GPS data, connects to Firebase over WiFi, receives lock/unlock commands, controls the relay, and publishes live location updates.

## 4. Key Features

### For Renters

- phone number login and role-based access
- interactive live map centered on Karunya campus
- cycle detail modal with owner name, contact, battery, and availability time
- duration-based filtering so users only see cycles that can support their selected rental duration
- one-tap rental flow with automatic unlock command
- lock and unlock buttons during an active rental
- ride completion with review submission
- damage reporting with photo upload support
- time remaining display and warning handling near ride end

### For Owners

- lock registration using a unique lock code
- cycle naming and owner profile association
- availability setting for a fixed time window
- manual lock and unlock controls for the owner's cycle when it is not rented
- live battery and location visibility in the owner dashboard
- rental tracking and cycle status monitoring
- prevention of availability changes while the cycle is actively rented

### Platform and Safety Features

- Firestore used as the source of truth for cycle rental status
- Realtime Database used for live hardware communication
- automatic cycle availability expiration when time runs out
- end-alert flag that becomes true when less than 2 minutes remain in a ride
- geofence warnings during active rides
- rental expiration checks and automatic ride completion
- cleanup of realtime listeners to reduce memory leaks
- validation before renting to avoid invalid state transitions

## 5. Screens and Modules

### Application Screens

- `app/index.js` - entry routing based on saved user data
- `app/login.js` - phone-based login
- `app/register.js` - new user registration with role selection
- `app/map.js` - live map and cycle discovery screen
- `app/rent-cycle.js` - rental confirmation and unlock action
- `app/my-rental.js` - active rental control, review, and completion
- `app/damage-report.js` - damage complaint submission with images
- `app/owner/dashboard.js` - owner cycle dashboard
- `app/owner/register-lock.js` - lock registration screen
- `app/owner/set-availability.js` - owner availability timer setup

### Reusable Components

- `components/CycleDetailsModal.js` - cycle detail popup used from the map
- `components/DurationSelectionModal.js` - rental duration picker shown before browsing

### Services

- `services/lockService.js` - lock/unlock commands and lock status helpers
- `services/expirationService.js` - rental expiration and availability expiration
- `services/locationService.js` - GPS tracking helpers
- `services/geofenceService.js` - campus boundary checks
- `services/damageReportService.js` - damage record handling
- `services/otpService.js` - user profile / OTP-related flow helpers

### Utilities

- `utils/storage.js` - local storage for user and role data
- `utils/timeHelpers.js` - time calculations and formatting

## 6. Current Technical Stack

### Frontend

- React Native 0.74.5
- Expo 51
- Expo Router 3.5
- react-native-webview
- expo-location
- expo-image-picker
- NativeWind

### Backend

- Firebase Firestore
- Firebase Realtime Database
- Firebase Admin dependencies for backend support

### Hardware

- ESP8266 NodeMCU
- Neo-6M GPS module
- relay module
- bicycle lock / solenoid mechanism
- WiFi-based cloud communication

## 7. Core Data Flow

1. A user registers and is saved in Firestore and local storage.
2. An owner registers a lock code and creates a cycle entry.
3. The ESP8266 publishes live GPS and battery data to Realtime Database.
4. The map screen merges Firestore cycle metadata with Realtime Database live data.
5. A renter selects a cycle and requests a duration.
6. The app validates availability, current rental state, and duration fit.
7. The rental request writes an unlock command to Realtime Database.
8. The ESP8266 executes the command, updates lock status, and marks the command executed.
9. Rental expiration logic closes the ride automatically when the time ends.
10. Availability expiration logic marks a cycle unavailable when its publishing window ends.

## 8. Database Design

### Firestore Collections

#### `users`

Stores registered app users.

```json
{
  "name": "Student Name",
  "registerNo": "REG12345",
  "phoneNumber": "9876543210",
  "role": "owner",
  "createdAt": "2026-02-11T10:00:00.000Z"
}
```

#### `cycles`

Stores cycle metadata and rental state.

```json
{
  "lockCode": "LOCK_0002",
  "cycleName": "Red Cycle",
  "ownerId": "user_id",
  "ownerName": "Owner Name",
  "ownerPhone": "9876543210",
  "status": "available",
  "currentRenter": null,
  "currentRenterName": null,
  "currentRenterPhone": null,
  "rentedAt": null,
  "rentalDuration": null,
  "rentalPrice": null,
  "rentalEndTime": null,
  "availableMinutes": 0,
  "availableUntil": null,
  "registeredAt": "2026-02-11T10:00:00.000Z"
}
```

#### `rentalHistory`

Stores completed ride and review records.

```json
{
  "cycleId": "cycle_doc_id",
  "cycleName": "Red Cycle",
  "lockCode": "LOCK_0002",
  "ownerId": "owner_user_id",
  "ownerName": "Owner Name",
  "renterId": "renter_user_id",
  "renterName": "Renter Name",
  "renterPhone": "9876543210",
  "rentedAt": "2026-02-11T10:00:00.000Z",
  "completedAt": "2026-02-11T10:45:00.000Z",
  "duration": 45,
  "price": 10,
  "rating": 5,
  "review": "Good ride",
  "autoCompleted": false
}
```

### Realtime Database

#### `locks/{lockCode}`

Stores live hardware state.

```json
{
  "status": {
    "locked": true,
    "online": true,
    "endAlert": "false"
  },
  "battery": 87,
  "lastUpdated": 1710000000000,
  "location": {
    "latitude": 10.9362,
    "longitude": 76.7441
  },
  "command": {
    "action": "UNLOCK",
    "timestamp": 1710000000000,
    "executed": true
  }
}
```

## 9. Important Business Rules

- A cycle can only be rented if its Firestore status is `available`.
- A renter cannot start a second rental while already having an active rented cycle.
- A cycle is shown on the map only if it is available.
- If a user selects a duration, only cycles with enough remaining availability are shown.
- If availability time expires, the cycle automatically becomes `not_available`.
- If ride time is less than 2 minutes, `endAlert` becomes the string `"true"`.
- When a ride ends manually or automatically, `endAlert` is reset to `"false"`.
- Firestore status is the source of truth; the hardware lock status is supplementary live state.

## 10. Hardware Draft

The current hardware implementation uses an ESP8266 NodeMCU rather than a GSM-based controller. The lock controller:

- connects to campus WiFi
- reads GPS coordinates from the GPS module
- sends location updates every 10 seconds
- polls Firebase Realtime Database for lock/unlock commands
- toggles the relay to open or close the lock
- pushes live status, battery, and command execution state to the database

### Core Hardware Behavior

- `LOCK` command turns the relay off and secures the lock
- `UNLOCK` command turns the relay on temporarily to release the lock
- after executing a command, the device marks the command as executed
- the device also updates `status.locked`, `status.online`, and `status.endAlert`

## 11. Current Reliability Improvements

Recent fixes included:

- cleanup of realtime listeners to reduce memory leaks
- removal of hardcoded status strings in app logic
- prevention of invalid rentals caused by stale map state
- availability expiration automation
- end-of-ride alert support for the hardware
- smoother WebView map updates without white-screen remounts
- proper remaining-time calculation in the cycle details modal
- safer rental validation and duplicate rental checks

## 12. Development and Run Instructions

### Install Dependencies

```bash
npm install
```

### Run the App Locally

```bash
npm start
```

### Build Android APK

```bash
npx eas build --platform android --profile preview
```

### Important Setup Requirements

- configure Firebase credentials in `config/firebase.js`
- add Google Maps API key in `app.config.js`
- create or verify Firebase security rules
- configure ESP8266 WiFi and Firebase credentials in `arduino/cycle_lock_system.ino`

## 13. Project Summary

This project provides a complete smart cycle rental experience for a campus environment. It is not only a mobile app, but a connected system where cloud data, real-time hardware state, and ride workflow are synchronized. The result is a practical campus mobility platform with owner controls, renter controls, live tracking, automatic expiry, and lock automation.

## 14. Future Scope

Possible enhancements include:

- payment integration
- push notifications for unlock, expiry, and end-alert events
- richer analytics for owners
- QR-based cycle check-in and check-out
- stronger anti-abuse and device binding measures
- multi-campus support
- maintenance and service scheduling

## 15. Final Note

The current codebase already supports a working end-to-end rental flow with live map tracking, rental validation, hardware lock control, owner availability management, rental completion, damage reporting, and time-based automation.
