import { ref, push, set, onValue, off } from 'firebase/database';
import { doc, setDoc, collection } from 'firebase/firestore';
import { realtimeDb, db } from '../config/firebase';
import * as Location from 'expo-location';

/**
 * Location Tracking Service
 * Tracks cycle location in real-time during active rentals
 */

let locationSubscription = null;
let locationInterval = null;

/**
 * Start tracking location for an active rental
 * @param {string} rentalId - Active rental ID
 * @param {string} cycleId - Cycle ID being rented
 * @param {string} renterId - User ID of renter
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const startLocationTracking = async (rentalId, cycleId, renterId) => {
  try {
    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { success: false, message: 'Location permission denied' };
    }

    // Stop any existing tracking
    stopLocationTracking();

    // Start watching location
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 30000, // Update every 30 seconds
        distanceInterval: 10, // Or when moved 10 meters
      },
      async (location) => {
        await updateLocation(rentalId, cycleId, {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now(),
          accuracy: location.coords.accuracy,
          speed: location.coords.speed,
        });
      }
    );

    return { success: true, message: 'Location tracking started' };
  } catch (error) {
    console.error('Error starting location tracking:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Update location in both Realtime Database and Firestore
 * @param {string} rentalId - Rental ID
 * @param {string} cycleId - Cycle ID
 * @param {object} location - Location data
 */
const updateLocation = async (rentalId, cycleId, location) => {
  try {
    // Update in Realtime Database for real-time tracking
    const locationRef = ref(realtimeDb, `activeRentals/${rentalId}/locations`);
    await push(locationRef, location);

    // Also update cycle's current location in Firestore
    const cycleRef = doc(db, 'cycles', cycleId);
    await setDoc(cycleRef, {
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      lastLocationUpdate: new Date().toISOString(),
    }, { merge: true });

    // Store in location history for dispute resolution (Firestore)
    const historyRef = collection(db, 'locationHistory');
    await setDoc(doc(historyRef, `${rentalId}_${location.timestamp}`), {
      rentalId,
      cycleId,
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: new Date(location.timestamp).toISOString(),
      accuracy: location.accuracy,
      speed: location.speed,
    });
  } catch (error) {
    console.error('Error updating location:', error);
  }
};

/**
 * Stop location tracking
 */
export const stopLocationTracking = () => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
  
  if (locationInterval) {
    clearInterval(locationInterval);
    locationInterval = null;
  }
};

/**
 * Get location history for a rental
 * @param {string} rentalId - Rental ID
 * @param {function} callback - Callback function(locations)
 * @returns {function} Unsubscribe function
 */
export const subscribeToLocationHistory = (rentalId, callback) => {
  const locationsRef = ref(realtimeDb, `activeRentals/${rentalId}/locations`);
  
  const listener = onValue(locationsRef, (snapshot) => {
    if (snapshot.exists()) {
      const locations = [];
      snapshot.forEach((child) => {
        locations.push({ id: child.key, ...child.val() });
      });
      callback(locations);
    } else {
      callback([]);
    }
  });

  return () => off(locationsRef, 'value', listener);
};

/**
 * Get current location once (without tracking)
 * @returns {Promise<{success: boolean, location: object}>}
 */
export const getCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { success: false, error: 'Permission denied' };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      success: true,
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      },
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if location is within a geofence
 * @param {object} location - {latitude, longitude}
 * @param {array} polygon - Array of {latitude, longitude} points defining boundary
 * @returns {boolean}
 */
export const isLocationInGeofence = (location, polygon) => {
  // Ray casting algorithm for point in polygon
  let inside = false;
  const x = location.latitude;
  const y = location.longitude;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].latitude;
    const yi = polygon[i].longitude;
    const xj = polygon[j].latitude;
    const yj = polygon[j].longitude;

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }

  return inside;
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {object} coord1 - {latitude, longitude}
 * @param {object} coord2 - {latitude, longitude}
 * @returns {number} Distance in meters
 */
export const calculateDistance = (coord1, coord2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};
