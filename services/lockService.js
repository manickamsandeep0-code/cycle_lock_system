import { ref, set, onValue, update } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

// Lock Commands for Arduino
export const LOCK_COMMANDS = {
  UNLOCK: 'UNLOCK',
  LOCK: 'LOCK',
  STATUS: 'STATUS'
};

// Send unlock command to Arduino
export const unlockCycle = async (lockId) => {
  try {
    const lockRef = ref(realtimeDb, `locks/${lockId}/command`);
    await set(lockRef, {
      action: LOCK_COMMANDS.UNLOCK,
      timestamp: Date.now(),
      executed: false
    });
    
    console.log(`Unlock command sent to ${lockId}`);
    return true;
  } catch (error) {
    console.error('Error unlocking cycle:', error);
    throw error;
  }
};

// Send lock command to Arduino
export const lockCycle = async (lockId) => {
  try {
    const lockRef = ref(realtimeDb, `locks/${lockId}/command`);
    await set(lockRef, {
      action: LOCK_COMMANDS.LOCK,
      timestamp: Date.now(),
      executed: false
    });
    
    console.log(`Lock command sent to ${lockId}`);
    return true;
  } catch (error) {
    console.error('Error locking cycle:', error);
    throw error;
  }
};

// Listen to lock status from Arduino
export const subscribeLockStatus = (lockId, callback) => {
  const statusRef = ref(realtimeDb, `locks/${lockId}/status`);
  
  const unsubscribe = onValue(statusRef, (snapshot) => {
    const status = snapshot.val();
    callback(status);
  });
  
  return unsubscribe;
};

// Update lock battery status (called by Arduino)
export const updateLockBattery = async (lockId, batteryLevel) => {
  try {
    const lockRef = ref(realtimeDb, `locks/${lockId}`);
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
export const getLockStatus = (lockId) => {
  return new Promise((resolve, reject) => {
    const statusRef = ref(realtimeDb, `locks/${lockId}/status`);
    onValue(statusRef, (snapshot) => {
      resolve(snapshot.val());
    }, { onlyOnce: true });
  });
};

// Initialize lock in Realtime Database
export const initializeLock = async (lockId) => {
  try {
    const lockRef = ref(realtimeDb, `locks/${lockId}`);
    await set(lockRef, {
      status: {
        locked: true,
        online: false
      },
      battery: 100,
      lastUpdated: Date.now(),
      command: {
        action: null,
        timestamp: null,
        executed: true
      }
    });
    
    console.log(`Lock ${lockId} initialized`);
    return true;
  } catch (error) {
    console.error('Error initializing lock:', error);
    throw error;
  }
};
