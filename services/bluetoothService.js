/**
 * Bluetooth Classic Service — HC-05 SPP communication
 *
 * This service handles all Classic Bluetooth (SPP) operations for the
 * Karunya Cycle Rental System using the HC-05 module connected to STM8.
 *
 * Key Features:
 * - Connect to a pre-paired HC-05 by MAC address
 * - Send authenticated UART commands (PIN + command)
 * - Two-Generals PIN fallback (try currentPin, fallback to previousPin)
 * - PIN change command for rotation
 * - Clean disconnect
 *
 * IMPORTANT: The HC-05 must be paired via Android Bluetooth Settings FIRST.
 * Classic Bluetooth requires manual pairing (default HC-05 PIN: 1234 or 0000).
 */

import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { BT_CONFIG } from '../constants';

let connectedDevice = null;

/**
 * Check if Bluetooth is enabled on the device.
 * @returns {Promise<boolean>}
 */
export const isBluetoothEnabled = async () => {
  try {
    return await RNBluetoothClassic.isBluetoothEnabled();
  } catch (error) {
    console.error('[BT] Error checking Bluetooth status:', error);
    return false;
  }
};

/**
 * Request to enable Bluetooth (Android only).
 * Opens the system Bluetooth enable dialog.
 * @returns {Promise<boolean>}
 */
export const requestBluetoothEnable = async () => {
  try {
    return await RNBluetoothClassic.requestBluetoothEnabled();
  } catch (error) {
    console.error('[BT] Error requesting Bluetooth enable:', error);
    throw new Error('Please enable Bluetooth manually in Settings.');
  }
};

/**
 * Get list of paired Bluetooth devices.
 * The HC-05 must already be paired via Android Settings.
 * @returns {Promise<Array>}
 */
export const getPairedDevices = async () => {
  try {
    const paired = await RNBluetoothClassic.getBondedDevices();
    return paired;
  } catch (error) {
    console.error('[BT] Error getting paired devices:', error);
    return [];
  }
};

/**
 * Connect to a paired HC-05 device by its MAC address.
 *
 * @param {string} macAddress - Bluetooth MAC address (e.g., "00:11:22:33:44:55")
 * @returns {Promise<object>} - The connected device object
 */
export const connectToDevice = async (macAddress) => {
  try {
    // Step 1: Check Bluetooth is on
    const enabled = await isBluetoothEnabled();
    if (!enabled) {
      const userEnabled = await requestBluetoothEnable();
      if (!userEnabled) {
        throw new Error('Bluetooth is not enabled. Please turn on Bluetooth and try again.');
      }
    }

    // Step 2: If already connected to this device, return it
    if (connectedDevice) {
      try {
        const isConnected = await connectedDevice.isConnected();
        if (isConnected && connectedDevice.address.toUpperCase() === macAddress.toUpperCase()) {
          console.log('[BT] Already connected to device');
          return connectedDevice;
        }
      } catch {
        // Connection check failed, reconnect
      }
      await disconnectDevice();
    }

    // Step 3: Check if device is paired
    const pairedDevices = await getPairedDevices();
    const targetDevice = pairedDevices.find(
      d => d.address.toUpperCase() === macAddress.toUpperCase()
    );

    if (!targetDevice) {
      throw new Error(
        `HC-05 device (${macAddress}) is not paired. Please go to Android Bluetooth Settings, pair the device first (PIN: 1234), then try again.`
      );
    }

    // Step 4: Connect
    console.log(`[BT] Connecting to ${targetDevice.name || targetDevice.address}...`);
    connectedDevice = await RNBluetoothClassic.connectToDevice(macAddress, {
      connectorType: 'rfcomm',
      delimiter: '\n',
      charset: 'utf-8',
    });

    console.log(`[BT] Connected to ${connectedDevice.name || connectedDevice.address}`);
    return connectedDevice;
  } catch (error) {
    console.error('[BT] Connection error:', error.message);
    connectedDevice = null;
    throw error;
  }
};

/**
 * Send a raw string command to the connected HC-05 and wait for a response.
 *
 * @param {string} commandString - The full command string (e.g., "1234U")
 * @param {number} [timeoutMs] - Response timeout in ms
 * @returns {Promise<string>} - The response ("OK" or "ERR")
 */
export const sendCommand = async (commandString, timeoutMs = BT_CONFIG.RESPONSE_TIMEOUT) => {
  if (!connectedDevice) {
    throw new Error('Not connected to any Bluetooth device.');
  }

  try {
    const isConnected = await connectedDevice.isConnected();
    if (!isConnected) {
      throw new Error('Bluetooth connection lost. Please reconnect.');
    }

    console.log(`[BT] Sending: ${commandString.replace(/^\d{4}/, '****')}`); // Mask PIN in logs

    // Write the command string
    await connectedDevice.write(commandString);

    // Wait for response with timeout
    const response = await waitForResponse(timeoutMs);
    return response;
  } catch (error) {
    console.error('[BT] Send command error:', error.message);
    throw error;
  }
};

/**
 * Wait for a newline-delimited response from the HC-05.
 *
 * @param {number} timeoutMs - How long to wait
 * @returns {Promise<string>} - Trimmed response string
 */
const waitForResponse = (timeoutMs) => {
  return new Promise((resolve, reject) => {
    if (!connectedDevice) {
      reject(new Error('Not connected'));
      return;
    }

    const timeout = setTimeout(() => {
      if (subscription) subscription.remove();
      // No response — assume success for HC-05 modules that don't echo back
      console.log('[BT] No response received, assuming success');
      resolve('OK');
    }, timeoutMs);

    const subscription = connectedDevice.onDataReceived((data) => {
      clearTimeout(timeout);
      if (subscription) subscription.remove();

      const response = (data.data || '').trim();
      console.log(`[BT] Response: ${response}`);
      resolve(response);
    });
  });
};

/**
 * Two-Generals PIN Fallback: Try currentPin first, if hardware responds ERR,
 * automatically retry with previousPin.
 *
 * This handles the case where:
 * - Firebase has a new PIN (currentPin) but the hardware still has the old PIN
 *   because a previous PIN sync was interrupted (app crash, BT disconnect, etc.)
 *
 * @param {string} currentPin - The current PIN from Firestore authPin.currentPin
 * @param {string} previousPin - The fallback PIN from Firestore authPin.previousPin
 * @param {string} command - Single character command ('U' or 'L')
 * @returns {Promise<{success: boolean, usedPin: string}>}
 */
export const sendWithFallback = async (currentPin, previousPin, command) => {
  // Attempt 1: Try with current PIN
  console.log(`[BT] Attempting command '${command}' with current PIN`);
  const commandStr1 = `${currentPin}${command}`;
  const response1 = await sendCommand(commandStr1);

  if (response1 === 'OK') {
    return { success: true, usedPin: currentPin };
  }

  // Attempt 2: Current PIN failed (ERR) — try previous PIN
  if (previousPin && previousPin !== currentPin) {
    console.log(`[BT] Current PIN rejected, falling back to previous PIN`);
    const commandStr2 = `${previousPin}${command}`;
    const response2 = await sendCommand(commandStr2);

    if (response2 === 'OK') {
      return { success: true, usedPin: previousPin };
    }
  }

  // Both PINs failed
  throw new Error('Lock rejected both PINs. The lock may need to be manually reset.');
};

/**
 * Send a PIN change command to the STM8.
 * Format: [oldPIN]C[newPIN]  (e.g., "1234C5678")
 *
 * @param {string} oldPin - Current PIN on the hardware
 * @param {string} newPin - New PIN to set
 * @returns {Promise<boolean>}
 */
export const changePinOnHardware = async (oldPin, newPin) => {
  const commandStr = `${oldPin}${BT_CONFIG.COMMANDS.CHANGE_PIN}${newPin}`;
  console.log('[BT] Sending PIN change command');
  const response = await sendCommand(commandStr);

  if (response === 'ERR') {
    throw new Error('Hardware rejected PIN change. Old PIN may be incorrect.');
  }

  return true;
};

/**
 * Disconnect from the currently connected HC-05 device.
 */
export const disconnectDevice = async () => {
  try {
    if (connectedDevice) {
      const isConnected = await connectedDevice.isConnected();
      if (isConnected) {
        await connectedDevice.disconnect();
        console.log('[BT] Disconnected from device');
      }
    }
  } catch (error) {
    console.warn('[BT] Disconnect error (non-fatal):', error.message);
  } finally {
    connectedDevice = null;
  }
};

/**
 * Check if currently connected to a Bluetooth device.
 * @returns {Promise<boolean>}
 */
export const isConnected = async () => {
  if (!connectedDevice) return false;
  try {
    return await connectedDevice.isConnected();
  } catch {
    return false;
  }
};

/**
 * Generate a random 4-digit PIN for rotation.
 * @returns {string} - A 4-digit string (e.g., "5839")
 */
export const generateNewPin = () => {
  const pin = Math.floor(1000 + Math.random() * 9000).toString();
  return pin;
};
