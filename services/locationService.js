import * as Location from 'expo-location';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

let locationSubscription = null;
let locationHistoryInterval = null;

// Start tracking cycle location during rental
export const startLocationTracking = async (cycleId) => {
  try {
    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    // Watch position every 30 seconds
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 30000, // Update every 30 seconds
        distanceInterval: 10, // Or every 10 meters
      },
      async (location) => {
        const { latitude, longitude } = location.coords;
        
        // Update cycle location in Firestore
        const cycleRef = doc(db, 'cycles', cycleId);
        await updateDoc(cycleRef, {
          location: { latitude, longitude },
          lastLocationUpdate: new Date().toISOString()
        });
        
        console.log(`Location updated for cycle ${cycleId}:`, latitude, longitude);
      }
    );

    // Also save location history every 2 minutes for dispute resolution
    locationHistoryInterval = setInterval(async () => {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      const { latitude, longitude } = location.coords;
      
      // Save to location history collection
      await addDoc(collection(db, 'locationHistory'), {
        cycleId,
        location: { latitude, longitude },
        timestamp: new Date().toISOString(),
        speed: location.coords.speed || 0
      });
    }, 120000); // Every 2 minutes

    console.log(`Location tracking started for cycle ${cycleId}`);
    return true;
  } catch (error) {
    console.error('Error starting location tracking:', error);
    throw error;
  }
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
