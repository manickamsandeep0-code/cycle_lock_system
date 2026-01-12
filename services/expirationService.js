import { doc, updateDoc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { CYCLE_STATUS } from '../constants';
import { lockCycle } from './lockService';
import { stopLocationTracking } from './locationService';

// Check if cycle availability has expired and mark as NOT_AVAILABLE
export const checkAndExpireAvailability = async (cycleId) => {
  try {
    const cycleRef = doc(db, 'cycles', cycleId);
    const cycleDoc = await getDoc(cycleRef);
    
    if (!cycleDoc.exists()) {
      return false;
    }
    
    const cycle = cycleDoc.data();
    
    // Only check AVAILABLE cycles with availableUntil set
    if (cycle.status === CYCLE_STATUS.AVAILABLE && cycle.availableUntil) {
      const availableUntil = new Date(cycle.availableUntil);
      const now = new Date();
      
      if (now >= availableUntil) {
        // Availability has expired - mark as NOT_AVAILABLE
        console.log(`Availability expired for cycle ${cycleId}, marking as not available...`);
        await updateDoc(cycleRef, {
          status: CYCLE_STATUS.NOT_AVAILABLE,
          availableMinutes: 0,
          availableUntil: null
        });
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking availability expiration:', error);
    return false;
  }
};

// Check if rental has expired and auto-complete it
export const checkAndExpireRental = async (cycleId) => {
  try {
    const cycleRef = doc(db, 'cycles', cycleId);
    const cycleDoc = await getDoc(cycleRef);
    
    if (!cycleDoc.exists()) {
      console.log('Cycle not found');
      return false;
    }
    
    const cycle = cycleDoc.data();
    
    // Check if cycle is rented and has expired
    if (cycle.status === CYCLE_STATUS.RENTED && cycle.rentalEndTime) {
      const endTime = new Date(cycle.rentalEndTime);
      const now = new Date();
      
      if (now >= endTime) {
        // Rental has expired - auto complete it
        console.log(`Rental expired for cycle ${cycleId}, auto-completing...`);
        await completeExpiredRental(cycleId, cycle);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking rental expiration:', error);
    return false;
  }
};

// Complete an expired rental automatically
const completeExpiredRental = async (cycleId, cycle) => {
  try {
    const cycleRef = doc(db, 'cycles', cycleId);
    
    // Create rental history record
    await addDoc(collection(db, 'rentalHistory'), {
      cycleId: cycleId,
      cycleName: cycle.cycleName,
      lockCode: cycle.lockCode,
      ownerId: cycle.ownerId,
      ownerName: cycle.ownerName,
      renterId: cycle.currentRenter,
      renterName: cycle.currentRenterName,
      renterPhone: cycle.currentRenterPhone,
      rentalDuration: cycle.rentalDuration,
      rentalPrice: cycle.rentalPrice || 0,
      rentedAt: cycle.rentedAt,
      completedAt: new Date().toISOString(),
      autoCompleted: true,
      rating: null,
      review: null
    });
    
    // Lock the cycle
    await lockCycle(cycle.lockCode);
    
    // Update cycle status to available
    await updateDoc(cycleRef, {
      status: CYCLE_STATUS.AVAILABLE,
      currentRenter: null,
      currentRenterName: null,
      currentRenterPhone: null,
      rentedAt: null,
      rentalDuration: null,
      rentalPrice: null,
      rentalEndTime: null,
      availableMinutes: 0,
      availableUntil: null
    });
    
    console.log(`Rental auto-completed for cycle ${cycleId}`);
    return true;
  } catch (error) {
    console.error('Error completing expired rental:', error);
    throw error;
  }
};

// Start monitoring for rental expiration (call this periodically)
export const startExpirationMonitor = (cycleIds, intervalMinutes = 1) => {
  // Check all active rentals every intervalMinutes
  const interval = setInterval(async () => {
    console.log('Checking for expired rentals...');
    
    for (const cycleId of cycleIds) {
      await checkAndExpireRental(cycleId);
    }
  }, intervalMinutes * 60 * 1000);
  
  return interval;
};

// Stop expiration monitor
export const stopExpirationMonitor = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('Expiration monitor stopped');
  }
};

// Calculate time remaining until expiration
export const getTimeRemaining = (rentalEndTime) => {
  if (!rentalEndTime) return 0;
  
  const endTime = new Date(rentalEndTime);
  const now = new Date();
  const remaining = endTime - now;
  
  return Math.max(0, remaining); // Return milliseconds remaining (0 if expired)
};

// Format time remaining for display
export const formatTimeRemaining = (rentalEndTime) => {
  const remaining = getTimeRemaining(rentalEndTime);
  
  if (remaining === 0) return 'Expired';
  
  const totalMinutes = Math.floor(remaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};
