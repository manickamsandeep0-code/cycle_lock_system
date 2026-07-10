/**
 * Lock Service — BLE-based lock/unlock operations
 *
 * Refactored from Firebase RTDB command dispatch to direct BLE communication.
 * The React Native app now acts as the bridge between Firebase and the physical lock.
 */

import { unlockCycleBLE, lockCycleBLE, disconnectDevice } from './bleService';

/**
 * Send an unlock command to the cycle's BLE lock.
 *
 * @param {string} macAddress - BLE MAC address of the HM-10/JDY-08 module
 * @param {string} lockPin - 4-digit auth PIN for this lock
 * @returns {Promise<boolean>} - true if unlock was successful
 */
export const unlockCycle = async (macAddress, lockPin) => {
  try {
    const success = await unlockCycleBLE(macAddress, lockPin);
    console.log(`Unlock command sent successfully to ${macAddress}`);
    return success;
  } catch (error) {
    console.error('Error unlocking cycle:', error);
    throw error;
  }
};

/**
 * Send a lock command to the cycle's BLE lock.
 *
 * @param {string} macAddress - BLE MAC address of the HM-10/JDY-08 module
 * @param {string} lockPin - 4-digit auth PIN for this lock
 * @returns {Promise<boolean>} - true if lock was successful
 */
export const lockCycle = async (macAddress, lockPin) => {
  try {
    const success = await lockCycleBLE(macAddress, lockPin);
    console.log(`Lock command sent successfully to ${macAddress}`);
    return success;
  } catch (error) {
    console.error('Error locking cycle:', error);
    throw error;
  }
};

/**
 * Disconnect from the BLE lock device.
 * Call this after completing a ride or when cleaning up.
 */
export const disconnectLock = async () => {
  try {
    await disconnectDevice();
    console.log('Lock disconnected');
  } catch (error) {
    console.warn('Error disconnecting lock (non-fatal):', error);
  }
};
