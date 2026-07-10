// Karunya Institute of Technology coordinates
export const KARUNYA_LOCATION = {
  latitude: 10.9362,
  longitude: 76.7441,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// User roles
export const USER_ROLES = {
  OWNER: 'owner',
  RENTER: 'renter',
};

// Lock status
export const LOCK_STATUS = {
  LOCKED: 'LOCKED',
  UNLOCKED: 'UNLOCKED',
  UNLOCK_REQUESTED: 'UNLOCK_REQUESTED',
};

// Cycle availability
export const CYCLE_STATUS = {
  AVAILABLE: 'available',
  RENTED: 'rented',
  NOT_AVAILABLE: 'not_available',
  OFFLINE: 'offline',
};

// BLE Configuration for HM-10 / JDY-08 modules
export const BLE_CONFIG = {
  // Standard HM-10 UART Service UUID
  HM10_SERVICE_UUID: '0000FFE0-0000-1000-8000-00805F9B34FB',
  // Standard HM-10 UART Characteristic UUID (RX/TX)
  HM10_CHARACTERISTIC_UUID: '0000FFE1-0000-1000-8000-00805F9B34FB',
  // Scan timeout in milliseconds
  SCAN_TIMEOUT: 10000,
  // BLE command characters sent to STM8
  COMMANDS: {
    UNLOCK: 'U',
    LOCK: 'L',
  },
};
