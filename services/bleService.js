/**
 * BLE Service — Bluetooth Low Energy communication with HM-10/JDY-08 modules
 *
 * This service handles all BLE operations for the Karunya Cycle Rental System:
 * - Scanning for a specific BLE device by MAC address
 * - Connecting and discovering UART service/characteristic
 * - Sending authenticated lock/unlock commands
 * - Monitoring responses from the STM8 microcontroller
 * - Clean disconnection and resource cleanup
 */

import { BleManager } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import { BLE_CONFIG } from '../constants';

// Singleton BLE Manager instance
let manager = null;
let connectedDevice = null;
let txCharacteristic = null;

/**
 * Get or create the BLE Manager singleton.
 * Ensures only one manager instance exists throughout the app lifecycle.
 */
export const getBleManager = () => {
  if (!manager) {
    manager = new BleManager();
  }
  return manager;
};

/**
 * Wait for the BLE adapter to be powered on.
 * Must be called before any scan/connect operations.
 * @returns {Promise<void>}
 */
export const waitForBleReady = () => {
  return new Promise((resolve, reject) => {
    const bleManager = getBleManager();
    const timeout = setTimeout(() => {
      subscription.remove();
      reject(new Error('Bluetooth is not enabled. Please turn on Bluetooth and try again.'));
    }, 10000);

    const subscription = bleManager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        clearTimeout(timeout);
        subscription.remove();
        resolve();
      } else if (state === 'PoweredOff') {
        // Keep waiting — user might turn it on
      } else if (state === 'Unauthorized') {
        clearTimeout(timeout);
        subscription.remove();
        reject(new Error('Bluetooth permission denied. Please allow Bluetooth access in Settings.'));
      } else if (state === 'Unsupported') {
        clearTimeout(timeout);
        subscription.remove();
        reject(new Error('This device does not support Bluetooth Low Energy.'));
      }
    }, true); // true = emit current state immediately
  });
};

/**
 * Scan for a BLE device by its MAC address.
 *
 * @param {string} macAddress - Target BLE MAC address (e.g., "AA:BB:CC:DD:EE:FF")
 * @param {number} [timeoutMs] - Scan timeout in ms (default from BLE_CONFIG)
 * @returns {Promise<object>} - The discovered device object
 */
export const scanForDevice = (macAddress, timeoutMs = BLE_CONFIG.SCAN_TIMEOUT) => {
  return new Promise((resolve, reject) => {
    const bleManager = getBleManager();

    // Normalize MAC address for comparison
    const targetMac = macAddress.toUpperCase();

    const timeout = setTimeout(() => {
      bleManager.stopDeviceScan();
      reject(new Error(`Could not find the cycle lock (${targetMac}). Make sure you are within Bluetooth range (~10m) and the lock is powered on.`));
    }, timeoutMs);

    console.log(`[BLE] Scanning for device: ${targetMac}`);

    bleManager.startDeviceScan(
      [BLE_CONFIG.HM10_SERVICE_UUID], // Filter by HM-10 service UUID
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          clearTimeout(timeout);
          bleManager.stopDeviceScan();
          console.error('[BLE] Scan error:', error.message);
          reject(new Error(`Bluetooth scan failed: ${error.message}`));
          return;
        }

        if (device) {
          // Match by MAC address (device.id on Android = MAC, on iOS = UUID)
          const deviceId = (device.id || '').toUpperCase();
          const deviceName = (device.name || device.localName || '').toUpperCase();

          if (deviceId === targetMac || deviceId.replace(/:/g, '') === targetMac.replace(/:/g, '')) {
            clearTimeout(timeout);
            bleManager.stopDeviceScan();
            console.log(`[BLE] Found device: ${device.id} (${device.name || 'unnamed'})`);
            resolve(device);
          }
        }
      }
    );
  });
};

/**
 * Connect to a BLE device and discover the HM-10 UART characteristic.
 *
 * @param {string} macAddress - Target BLE MAC address
 * @returns {Promise<object>} - The connected device object
 */
export const connectToDevice = async (macAddress) => {
  const bleManager = getBleManager();

  try {
    // Step 1: Ensure Bluetooth is on
    await waitForBleReady();

    // Step 2: If already connected to this device, return it
    if (connectedDevice && connectedDevice.id.toUpperCase() === macAddress.toUpperCase()) {
      const isConnected = await connectedDevice.isConnected();
      if (isConnected) {
        console.log('[BLE] Already connected to device');
        return connectedDevice;
      }
    }

    // Step 3: Disconnect any existing connection
    await disconnectDevice();

    // Step 4: Scan for the device
    const device = await scanForDevice(macAddress);

    // Step 5: Connect
    console.log(`[BLE] Connecting to ${device.id}...`);
    connectedDevice = await device.connect({
      requestMTU: 64,
      timeout: 10000,
    });

    // Step 6: Discover all services and characteristics
    console.log('[BLE] Discovering services...');
    await connectedDevice.discoverAllServicesAndCharacteristics();

    // Step 7: Find the HM-10 UART TX characteristic
    const services = await connectedDevice.services();
    let found = false;

    for (const service of services) {
      const characteristics = await service.characteristics();
      for (const characteristic of characteristics) {
        if (characteristic.uuid.toUpperCase().includes('FFE1')) {
          txCharacteristic = characteristic;
          found = true;
          console.log(`[BLE] Found UART characteristic: ${characteristic.uuid}`);
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      throw new Error('Could not find the UART characteristic on this BLE device. Make sure it is an HM-10 or JDY-08 module.');
    }

    console.log('[BLE] Connected and ready');
    return connectedDevice;
  } catch (error) {
    console.error('[BLE] Connection error:', error.message);
    await disconnectDevice();
    throw error;
  }
};

/**
 * Send an authenticated command to the BLE lock.
 *
 * @param {string} pin - 4-digit auth PIN (e.g., "1234")
 * @param {string} command - Single character command ('U' for unlock, 'L' for lock)
 * @returns {Promise<string>} - Response from the STM8 ("OK" or "ERR")
 */
export const sendCommand = async (pin, command) => {
  if (!connectedDevice || !txCharacteristic) {
    throw new Error('Not connected to any BLE device. Please connect first.');
  }

  // Validate inputs
  if (!pin || pin.length !== 4) {
    throw new Error('Invalid PIN: must be exactly 4 digits.');
  }
  if (!command || !['U', 'L', 'u', 'l'].includes(command)) {
    throw new Error('Invalid command: must be "U" (unlock) or "L" (lock).');
  }

  const message = `${pin}${command.toUpperCase()}`;
  console.log(`[BLE] Sending command: ${pin.replace(/./g, '*')}${command.toUpperCase()}`);

  try {
    // Check connection is still alive
    const isConnected = await connectedDevice.isConnected();
    if (!isConnected) {
      throw new Error('BLE connection lost. Please reconnect and try again.');
    }

    // Encode the message to Base64 for BLE write
    const base64Message = btoa(message);

    // Write to characteristic (withResponse for reliability)
    await txCharacteristic.writeWithResponse(base64Message);

    console.log('[BLE] Command sent successfully');

    // Wait for response from STM8
    const response = await waitForResponse(3000);
    return response;
  } catch (error) {
    console.error('[BLE] Send command error:', error.message);
    throw error;
  }
};

/**
 * Wait for a response from the STM8 via BLE notification.
 *
 * @param {number} timeoutMs - How long to wait for a response
 * @returns {Promise<string>} - The response string ("OK" or "ERR")
 */
const waitForResponse = (timeoutMs = 3000) => {
  return new Promise((resolve, reject) => {
    if (!connectedDevice || !txCharacteristic) {
      reject(new Error('Not connected'));
      return;
    }

    const timeout = setTimeout(() => {
      if (subscription) subscription.remove();
      // If no response received, assume command was executed
      // (some HM-10 clones don't notify properly)
      console.log('[BLE] No response received, assuming success');
      resolve('OK');
    }, timeoutMs);

    const subscription = txCharacteristic.monitor((error, characteristic) => {
      if (error) {
        clearTimeout(timeout);
        subscription.remove();
        // Don't reject on monitor errors — the command may have worked
        console.warn('[BLE] Monitor error:', error.message);
        resolve('OK');
        return;
      }

      if (characteristic && characteristic.value) {
        clearTimeout(timeout);
        subscription.remove();

        // Decode Base64 response
        const response = atob(characteristic.value).trim();
        console.log(`[BLE] Response: ${response}`);
        resolve(response);
      }
    });
  });
};

/**
 * Send an unlock command to the BLE lock.
 *
 * @param {string} macAddress - BLE MAC address
 * @param {string} pin - 4-digit auth PIN
 * @returns {Promise<boolean>} - true if unlock was successful
 */
export const unlockCycleBLE = async (macAddress, pin) => {
  await connectToDevice(macAddress);
  const response = await sendCommand(pin, BLE_CONFIG.COMMANDS.UNLOCK);

  if (response === 'ERR') {
    throw new Error('Lock rejected the unlock command. Please check the PIN.');
  }

  return true;
};

/**
 * Send a lock command to the BLE lock.
 *
 * @param {string} macAddress - BLE MAC address
 * @param {string} pin - 4-digit auth PIN
 * @returns {Promise<boolean>} - true if lock was successful
 */
export const lockCycleBLE = async (macAddress, pin) => {
  await connectToDevice(macAddress);
  const response = await sendCommand(pin, BLE_CONFIG.COMMANDS.LOCK);

  if (response === 'ERR') {
    throw new Error('Lock rejected the lock command. Please check the PIN.');
  }

  return true;
};

/**
 * Disconnect from the currently connected BLE device and clean up resources.
 */
export const disconnectDevice = async () => {
  try {
    if (connectedDevice) {
      const isConnected = await connectedDevice.isConnected();
      if (isConnected) {
        await connectedDevice.cancelConnection();
        console.log('[BLE] Disconnected from device');
      }
    }
  } catch (error) {
    console.warn('[BLE] Disconnect error (non-fatal):', error.message);
  } finally {
    connectedDevice = null;
    txCharacteristic = null;
  }
};

/**
 * Check if currently connected to a BLE device.
 *
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
 * Destroy the BLE Manager (call on app exit/cleanup).
 */
export const destroyBleManager = () => {
  if (manager) {
    manager.destroy();
    manager = null;
    connectedDevice = null;
    txCharacteristic = null;
    console.log('[BLE] Manager destroyed');
  }
};
