import * as Location from 'expo-location';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, realtimeDb } from '../config/firebase';

let locationSubscription = null;
let locationHistoryInterval = null;
let endAlertInterval = null;

/**
 * Start tracking cycle location during rental.
 * Pushes live GPS to RTDB /locks/{lockCode}/location every 15 seconds
 * so the owner dashboard map shows real-time position.
 * Also pushes to Firestore for the parked-location record.
 *
 * @param {string} cycleId - Firestore document ID of the cycle
 * @param {string} lockCode - The lockCode used as the RTDB key
 */
export const startLocationTracking = async (cycleId, lockCode) => {
  try {
    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    // Watch position every 15 seconds (phone provides GPS in BT bridge model)
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 15000, // Update every 15 seconds
        distanceInterval: 5, // Or every 5 meters
      },
      async (location) => {
        const { latitude, longitude } = location.coords;
        
        // Push to Realtime Database for live map (owner dashboard)
        if (lockCode) {
          try {
            const rtdbLocationRef = ref(realtimeDb, `locks/${lockCode}/location`);
            await set(rtdbLocationRef, {
              latitude,
              longitude,
              updatedAt: new Date().toISOString()
            });
          } catch (rtdbErr) {
            console.warn('RTDB location update failed:', rtdbErr);
          }
        }

        // Also update Firestore for record-keeping
        try {
          const cycleRef = doc(db, 'cycles', cycleId);
          await updateDoc(cycleRef, {
            location: { latitude, longitude },
            lastLocationUpdate: new Date().toISOString()
          });
        } catch (fsErr) {
          console.warn('Firestore location update failed:', fsErr);
        }
        
        console.log(`Location updated for ${lockCode || cycleId}:`, latitude.toFixed(5), longitude.toFixed(5));
      }
    );

    // Save location history every 2 minutes for dispute resolution
    locationHistoryInterval = setInterval(async () => {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        
        const { latitude, longitude } = location.coords;
        
        await addDoc(collection(db, 'locationHistory'), {
          cycleId,
          lockCode,
          location: { latitude, longitude },
          timestamp: new Date().toISOString(),
          speed: location.coords.speed || 0
        });
      } catch (err) {
        console.warn('Location history save failed:', err);
      }
    }, 120000); // Every 2 minutes

    console.log(`Location tracking started for cycle ${lockCode || cycleId}`);
    return true;
  } catch (error) {
    console.error('Error starting location tracking:', error);
    throw error;
  }
};

/**
 * Start endAlert monitoring — writes "true" to RTDB endAlert
 * when remaining time is < 2 minutes.
 *
 * @param {string} lockCode - RTDB lock key
 * @param {string} rentalEndTimeISO - ISO string of rental end time
 */
export const startEndAlertMonitoring = (lockCode, rentalEndTimeISO) => {
  if (!lockCode || !rentalEndTimeISO) return;

  endAlertInterval = setInterval(async () => {
    const now = new Date();
    const endTime = new Date(rentalEndTimeISO);
    const remainingMs = endTime - now;
    const remainingMins = remainingMs / 60000;

    if (remainingMins <= 2 && remainingMins > 0) {
      try {
        const endAlertRef = ref(realtimeDb, `locks/${lockCode}/status/endAlert`);
        await set(endAlertRef, 'true');
        console.log(`[endAlert] Set to true for ${lockCode} — ${remainingMins.toFixed(1)} mins remaining`);
      } catch (err) {
        console.warn('endAlert update failed:', err);
      }
    }

    // If expired, clear the interval
    if (remainingMs <= 0) {
      clearInterval(endAlertInterval);
      endAlertInterval = null;
    }
  }, 30000); // Check every 30 seconds
};

// Stop location tracking when rental ends
export const stopLocationTracking = () => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
  
  if (locationHistoryInterval) {
    clearInterval(locationHistoryInterval);
    locationHistoryInterval = null;
  }

  if (endAlertInterval) {
    clearInterval(endAlertInterval);
    endAlertInterval = null;
  }
  
  console.log('Location tracking stopped');
};

// Get current location once
export const getCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    throw error;
  }
};

// Clear endAlert in RTDB when ride ends
export const clearEndAlert = async (lockCode) => {
  if (!lockCode) return;
  try {
    const endAlertRef = ref(realtimeDb, `locks/${lockCode}/status/endAlert`);
    await set(endAlertRef, 'false');
  } catch (err) {
    console.warn('Failed to clear endAlert:', err);
  }
};

// Update cycle location manually
export const updateCycleLocation = async (cycleId, latitude, longitude) => {
  try {
    const cycleRef = doc(db, 'cycles', cycleId);
    await updateDoc(cycleRef, {
      location: { latitude, longitude },
      lastLocationUpdate: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating cycle location:', error);
    throw error;
  }
};
