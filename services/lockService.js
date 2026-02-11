import { ref, set, onValue, update } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

// Lock Commands for ESP8266
export const LOCK_COMMANDS = {
  UNLOCK: 'UNLOCK',
  LOCK: 'LOCK',
  STATUS: 'STATUS'
};

// Send unlock command to ESP8266
export const unlockCycle = async (lockCode) => {
  try {
    const lockRef = ref(realtimeDb, `locks/${lockCode}/command`);
    await set(lockRef, {
      action: LOCK_COMMANDS.UNLOCK,
      timestamp: Date.now(),
      executed: false
    });
    
    console.log(`Unlock command sent to ${lockCode}`);
    return true;
  } catch (error) {
    console.error('Error unlocking cycle:', error);
    throw error;
  }
};

// Send lock command to ESP8266
export const lockCycle = async (lockCode) => {
  try {
    const lockRef = ref(realtimeDb, `locks/${lockCode}/command`);
    await set(lockRef, {
      action: LOCK_COMMANDS.LOCK,
      timestamp: Date.now(),
      executed: false
    });
    
    console.log(`Lock command sent to ${lockCode}`);
    return true;
  } catch (error) {
    console.error('Error locking cycle:', error);
    throw error;
  }
};

// Listen to lock status from ESP8266
export const subscribeLockStatus = (lockCode, callback) => {
  const statusRef = ref(realtimeDb, `locks/${lockCode}/status`);
  
  const unsubscribe = onValue(statusRef, (snapshot) => {
    const status = snapshot.val();
    callback(status);
  });
  
  return unsubscribe;
};

// Update lock battery status (called by ESP8266)
export const updateLockBattery = async (lockCode, batteryLevel) => {
  try {
    const lockRef = ref(realtimeDb, `locks/${lockCode}`);
    await update(lockRef, {
      battery: batteryLevel,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error updating battery:', error);
    throw error;
  }
};

// Get lock status
export const getLockStatus = (lockCode) => {
  return new Promise((resolve, reject) => {
    const statusRef = ref(realtimeDb, `locks/${lockCode}/status`);
    onValue(statusRef, (snapshot) => {
      resolve(snapshot.val());
    }, { onlyOnce: true });
  });
};

// Update end alert status ("true" when < 2 mins remaining, "false" otherwise)
export const updateEndAlert = async (lockCode, shouldAlert) => {
  try {
    const statusRef = ref(realtimeDb, `locks/${lockCode}/status`);
    await update(statusRef, {
      endAlert: shouldAlert ? "true" : "false"
    });
    console.log(`End alert ${shouldAlert ? 'activated' : 'cleared'} for ${lockCode}`);
    return true;
  } catch (error) {
    console.error('Error updating end alert:', error);
    throw error;
  }
};

// Initialize lock in Realtime Database
export const initializeLock = async (lockCode) => {
  try {
    const lockRef = ref(realtimeDb, `locks/${lockCode}`);
    await set(lockRef, {
      status: {
        locked: true,
        online: false,
        endAlert: "false",
      },
      battery: 100,
      lastUpdated: Date.now(),
      command: {
        action: null,
        timestamp: null,
        executed: true
      }
    });
    
    console.log(`Lock ${lockCode} initialized`);
    return true;
  } catch (error) {
    console.error('Error initializing lock:', error);
    throw error;
  }
};
