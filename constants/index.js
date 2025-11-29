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
  MAINTENANCE: 'maintenance', // For damage reports
};

// Notification types
export const NOTIFICATION_TYPES = {
  RENTAL_EXPIRING: 'rental_expiring',
  RENTAL_EXPIRED: 'rental_expired',
  GEOFENCE_VIOLATION: 'geofence_violation',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
};
