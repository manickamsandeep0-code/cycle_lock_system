// Firebase configuration
// Karunya Cycle Rental - Firebase Setup
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAoyHayOYX2z09Fm2bpa61ebMiAPH6jH-I",
  authDomain: "karunya-cycle-rental.firebaseapp.com",
  projectId: "karunya-cycle-rental",
  storageBucket: "karunya-cycle-rental.firebasestorage.app",
  messagingSenderId: "953501174214",
  appId: "1:953501174214:web:c802e73356b00549964ac7",
  measurementId: "G-2YLGZS04WM",
  databaseURL: "https://karunya-cycle-rental-default-rtdb.firebaseio.com" // For Arduino IoT communication
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);

export default app;
