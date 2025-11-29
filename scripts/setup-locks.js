/**
 * Setup Script: Pre-register Lock Codes in Firebase
 * 
 * This script adds lock devices to Firestore before selling them to owners.
 * Each lock gets a unique code that will be given to the owner at purchase.
 * 
 * Usage:
 * 1. Install dependencies: npm install firebase
 * 2. Update the firebaseConfig below with your credentials
 * 3. Run: node scripts/setup-locks.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, query, where, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAoyHayOYX2z09Fm2bpa61ebMiAPH6jH-I",
  authDomain: "karunya-cycle-rental.firebaseapp.com",
  projectId: "karunya-cycle-rental",
  storageBucket: "karunya-cycle-rental.firebasestorage.app",
  messagingSenderId: "953501174214",
  appId: "1:953501174214:web:c802e73356b00549964ac7",
  databaseURL: "https://karunya-cycle-rental-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Karunya Institute coordinates (default location for unregistered locks)
const KARUNYA_LOCATION = {
  latitude: 10.9362,
  longitude: 76.7441,
};

/**
 * Generate a unique lock code
 * Format: LOCK_XXXX where XXXX is a 4-digit number
 */
function generateLockCode(number) {
  return `LOCK_${String(number).padStart(4, '0')}`;
}

/**
 * Add a new lock to Firestore
 */
async function addLock(lockCode) {
  try {
    const cyclesRef = collection(db, 'cycles');
    
    // Check if lock code already exists
    const q = query(cyclesRef, where('lockCode', '==', lockCode));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      console.log(`⚠️  Lock ${lockCode} already exists`);
      return false;
    }
    
    // Create new lock entry
    const lockData = {
      lockCode: lockCode,
      ownerId: null, // Will be set when owner registers
      ownerName: null,
      ownerPhone: null,
      cycleName: null,
      status: 'offline', // offline until registered
      lockStatus: 'LOCKED',
      location: {
        latitude: KARUNYA_LOCATION.latitude,
        longitude: KARUNYA_LOCATION.longitude,
      },
      createdAt: new Date().toISOString(),
      isOnline: false,
      registeredAt: null,
    };
    
    await addDoc(cyclesRef, lockData);
    console.log(`✅ Added lock: ${lockCode}`);
    return true;
  } catch (error) {
    console.error(`❌ Error adding lock ${lockCode}:`, error);
    return false;
  }
}

/**
 * Main function to add multiple locks
 */
async function setupLocks() {
  console.log('🚀 Starting lock setup...\n');
  
  // Add locks LOCK_0001 to LOCK_0010
  const startNumber = 1;
  const endNumber = 10;
  
  let successCount = 0;
  let skipCount = 0;
  
  for (let i = startNumber; i <= endNumber; i++) {
    const lockCode = generateLockCode(i);
    const added = await addLock(lockCode);
    
    if (added) {
      successCount++;
    } else {
      skipCount++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ Successfully added: ${successCount}`);
  console.log(`   ⚠️  Skipped (already exists): ${skipCount}`);
  console.log(`   📝 Total processed: ${successCount + skipCount}`);
  console.log('\n✨ Lock setup complete!');
  console.log('\n📋 Next steps:');
  console.log('   1. Print these lock codes and give them to buyers');
  console.log('   2. Program each Arduino with its corresponding lock code');
  console.log('   3. When owner registers, they will use this lock code');
  
  process.exit(0);
}

// Run the setup
setupLocks().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
