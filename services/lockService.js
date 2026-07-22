/**
 * Lock Service — Classic Bluetooth lock/unlock with PIN rotation support
 *
 * Delegates to bluetoothService.js for HC-05 communication.
 * Supports the Two-Generals PIN fallback and PIN change commands.
 */

import {
  connectToDevice,
  sendWithFallback,
  changePinOnHardware,
  disconnectDevice,
  sendCommand,
} from './bluetoothService';
import { BT_CONFIG } from '../constants';

/**
 * Unlock the cycle via Classic Bluetooth with PIN fallback.
 *
 * @param {string} macAddress - HC-05 Bluetooth MAC address
 * @param {string} currentPin - Current PIN from Firestore authPin.currentPin
 * @param {string} previousPin - Fallback PIN from Firestore authPin.previousPin
 * @returns {Promise<{success: boolean, usedPin: string}>}
 */
export const unlockCycle = async (macAddress, currentPin, previousPin) => {
  try {
    await connectToDevice(macAddress);
    const result = await sendWithFallback(currentPin, previousPin, BT_CONFIG.COMMANDS.UNLOCK);
    console.log(`Cycle unlocked successfully (used ${result.usedPin === currentPin ? 'current' : 'previous'} PIN)`);
    return result;
  } catch (error) {
    console.error('Error unlocking cycle:', error);
    throw error;
  }
};

/**
 * Lock the cycle via Classic Bluetooth with PIN fallback.
 *
 * @param {string} macAddress - HC-05 Bluetooth MAC address
 * @param {string} currentPin - Current PIN from Firestore authPin.currentPin
 * @param {string} previousPin - Fallback PIN from Firestore authPin.previousPin
 * @returns {Promise<{success: boolean, usedPin: string}>}
 */
export const lockCycle = async (macAddress, currentPin, previousPin) => {
  try {
    await connectToDevice(macAddress);
    const result = await sendWithFallback(currentPin, previousPin, BT_CONFIG.COMMANDS.LOCK);
    console.log(`Cycle locked successfully (used ${result.usedPin === currentPin ? 'current' : 'previous'} PIN)`);
    return result;
  } catch (error) {
    console.error('Error locking cycle:', error);
    throw error;
  }
};

/**
 * Change the PIN on the hardware.
 * Used during ride completion for PIN rotation.
 *
 * @param {string} macAddress - HC-05 Bluetooth MAC address
 * @param {string} oldPin - Current PIN on the hardware (may differ from Firestore if desync)
 * @param {string} newPin - New PIN to set on hardware
 * @returns {Promise<boolean>}
 */
export const changeLockPin = async (macAddress, oldPin, newPin) => {
  try {
    await connectToDevice(macAddress);
    const success = await changePinOnHardware(oldPin, newPin);
    console.log('Lock PIN changed successfully on hardware');
    return success;
  } catch (error) {
    console.error('Error changing lock PIN:', error);
    throw error;
  }
};

/**
 * Lock the cycle using a specific known PIN (no fallback).
 * Used after PIN change when we know the exact new PIN.
 *
 * @param {string} pin - The PIN to use
 * @returns {Promise<boolean>}
 */
export const lockWithPin = async (pin) => {
  try {
    const response = await sendCommand(`${pin}${BT_CONFIG.COMMANDS.LOCK}`);
    if (response === 'ERR') {
      throw new Error('Lock rejected the command with the new PIN.');
    }
    return true;
  } catch (error) {
    console.error('Error locking with specific PIN:', error);
    throw error;
  }
};

/**
 * Disconnect from the Bluetooth lock device.
 */
export const disconnectLock = async () => {
  try {
    await disconnectDevice();
    console.log('Lock disconnected');
  } catch (error) {
    console.warn('Error disconnecting lock (non-fatal):', error);
  }
};
