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

// Classic Bluetooth (HC-05) Configuration
export const BT_CONFIG = {
  // Connection timeout in milliseconds
  CONNECT_TIMEOUT: 10000,
  // Response timeout in milliseconds (wait for OK/ERR from STM8)
  RESPONSE_TIMEOUT: 5000,
  // UART command characters sent to STM8
  COMMANDS: {
    UNLOCK: 'U',
    LOCK: 'L',
    CHANGE_PIN: 'C',
  },
  // PIN sync status values stored in Firestore authPin object
  PIN_SYNC_STATUS: {
    SYNCED: 'SYNCED',
    PENDING: 'PENDING',
  },
};
