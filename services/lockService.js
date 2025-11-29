import { ref, set, get, onValue, off } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

/**
 * Lock Control Service for Arduino IoT Integration
 * Uses Firebase Realtime Database for real-time communication with smart locks
 */

// Lock command structure
export const LOCK_COMMANDS = {
  UNLOCK: 'unlock',
  LOCK: 'lock',
  STATUS: 'status',
};

export const LOCK_STATES = {
  LOCKED: 'locked',
  UNLOCKED: 'unlocked',
  ERROR: 'error',
  OFFLINE: 'offline',
};

/**
 * Send unlock command to Arduino lock
 * @param {string} lockId - The lock ID (e.g., LOCK_0001)
 * @param {string} renterId - User ID who is renting
 * @param {string} rentalId - Rental transaction ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const unlockCycle = async (lockId, renterId, rentalId) => {
  try {
    const lockRef = ref(realtimeDb, `locks/${lockId}`);
    
    await set(lockRef, {
      command: LOCK_COMMANDS.UNLOCK,
      renterId,
      rentalId,
      timestamp: Date.now(),
      status: LOCK_STATES.UNLOCKED,
      lastUpdated: new Date().toISOString(),
    });

    return { success: true, message: 'Unlock command sent successfully' };
  } catch (error) {
    console.error('Error unlocking cycle:', error);
    return { success: false, message: 'Failed to unlock cycle' };
  }
};

/**
 * Send lock command to Arduino lock
 * @param {string} lockId - The lock ID (e.g., LOCK_0001)
 * @param {string} renterId - User ID who rented (for verification)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const lockCycle = async (lockId, renterId = null) => {
  try {
    const lockRef = ref(realtimeDb, `locks/${lockId}`);
    
    await set(lockRef, {
      command: LOCK_COMMANDS.LOCK,
      renterId: renterId || null,
      timestamp: Date.now(),
      status: LOCK_STATES.LOCKED,
      lastUpdated: new Date().toISOString(),
    });

    return { success: true, message: 'Lock command sent successfully' };
  } catch (error) {
    console.error('Error locking cycle:', error);
    return { success: false, message: 'Failed to lock cycle' };
  }
};

/**
 * Get current lock status
 * @param {string} lockId - The lock ID
 * @returns {Promise<{success: boolean, status: string, data: object}>}
 */
export const getLockStatus = async (lockId) => {
  try {
    const lockRef = ref(realtimeDb, `locks/${lockId}`);
    const snapshot = await get(lockRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return { 
        success: true, 
        status: data.status || LOCK_STATES.OFFLINE,
        data 
      };
    } else {
      return { 
        success: false, 
        status: LOCK_STATES.OFFLINE,
        data: null 
      };
    }
  } catch (error) {
    console.error('Error getting lock status:', error);
    return { 
      success: false, 
      status: LOCK_STATES.ERROR,
      data: null 
    };
  }
};

/**
 * Listen to lock status changes in real-time
 * @param {string} lockId - The lock ID
 * @param {function} callback - Callback function(status, data)
 * @returns {function} Unsubscribe function
 */
export const subscribeLockStatus = (lockId, callback) => {
  const lockRef = ref(realtimeDb, `locks/${lockId}`);
  
  const listener = onValue(lockRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      callback(data.status || LOCK_STATES.OFFLINE, data);
    } else {
      callback(LOCK_STATES.OFFLINE, null);
    }
  });

  // Return unsubscribe function
  return () => off(lockRef, 'value', listener);
};

/**
 * Initialize lock in Realtime Database
 * @param {string} lockId - The lock ID
 * @returns {Promise<{success: boolean}>}
 */
export const initializeLock = async (lockId) => {
  try {
    const lockRef = ref(realtimeDb, `locks/${lockId}`);
    const snapshot = await get(lockRef);
    
    if (!snapshot.exists()) {
      await set(lockRef, {
        command: LOCK_COMMANDS.STATUS,
        status: LOCK_STATES.LOCKED,
        timestamp: Date.now(),
        renterId: null,
        lastUpdated: new Date().toISOString(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error initializing lock:', error);
    return { success: false };
  }
};

/**
 * Emergency lock all cycles (admin function)
 * @param {array} lockIds - Array of lock IDs
 * @returns {Promise<{success: boolean, results: array}>}
 */
export const emergencyLockAll = async (lockIds) => {
  try {
    const results = await Promise.all(
      lockIds.map(lockId => lockCycle(lockId, null))
    );
    
    return { 
      success: true, 
      results 
    };
  } catch (error) {
    console.error('Error in emergency lock:', error);
    return { success: false, results: [] };
  }
};

/**
 * Get battery status from Arduino (if supported)
 * @param {string} lockId - The lock ID
 * @returns {Promise<{success: boolean, battery: number}>}
 */
export const getBatteryStatus = async (lockId) => {
  try {
    const lockRef = ref(realtimeDb, `locks/${lockId}/battery`);
    const snapshot = await get(lockRef);
    
    if (snapshot.exists()) {
      return { 
        success: true, 
        battery: snapshot.val() 
      };
    } else {
      return { 
        success: false, 
        battery: null 
      };
    }
  } catch (error) {
    console.error('Error getting battery status:', error);
    return { success: false, battery: null };
  }
};
