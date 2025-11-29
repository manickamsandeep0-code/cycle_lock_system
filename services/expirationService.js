import { collection, query, where, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { CYCLE_STATUS } from '../constants';
import { lockCycle } from './lockService';
import { capturePayment, refundPayment } from './paymentService';

/**
 * Auto-Expiration Service
 * Automatically completes rentals when time expires
 */

let expirationInterval = null;

/**
 * Start monitoring for expired rentals
 * Should be called when app starts or user logs in
 */
export const startExpirationMonitoring = () => {
  // Stop any existing monitoring
  stopExpirationMonitoring();

  // Check every 60 seconds for expired rentals
  expirationInterval = setInterval(async () => {
    await checkExpiredRentals();
  }, 60000);

  // Also check immediately
  checkExpiredRentals();
};

/**
 * Stop monitoring
 */
export const stopExpirationMonitoring = () => {
  if (expirationInterval) {
    clearInterval(expirationInterval);
    expirationInterval = null;
  }
};

/**
 * Check for expired rentals and auto-complete them
 */
const checkExpiredRentals = async () => {
  try {
    const now = new Date().toISOString();
    const cyclesRef = collection(db, 'cycles');
    const q = query(
      cyclesRef,
      where('status', '==', CYCLE_STATUS.RENTED)
    );

    const querySnapshot = await getDocs(q);
    const expiredRentals = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.rentalEndTime && data.rentalEndTime < now) {
        expiredRentals.push({ id: doc.id, ...data });
      }
    });

    // Process each expired rental
    for (const rental of expiredRentals) {
      await autoCompleteRental(rental);
    }

    if (expiredRentals.length > 0) {
      console.log(`Auto-completed ${expiredRentals.length} expired rental(s)`);
    }
  } catch (error) {
    console.error('Error checking expired rentals:', error);
  }
};

/**
 * Auto-complete an expired rental
 * @param {object} rental - Rental data from cycles collection
 */
const autoCompleteRental = async (rental) => {
  try {
    console.log(`Auto-completing rental for cycle ${rental.id}`);

    // Step 1: Lock the cycle
    await lockCycle(rental.lockId, rental.currentRenter);

    // Step 2: Capture payment (since rental time is complete)
    if (rental.transactionId) {
      await capturePayment(rental.transactionId);
    }

    // Step 3: Create rental history record (auto-completed, no review)
    await addDoc(collection(db, 'rentalHistory'), {
      cycleId: rental.id,
      cycleName: rental.cycleName,
      lockId: rental.lockId,
      ownerId: rental.ownerId,
      ownerName: rental.ownerName,
      renterId: rental.currentRenter,
      renterName: rental.currentRenterName,
      renterPhone: rental.currentRenterPhone,
      rentedAt: rental.rentedAt,
      completedAt: new Date().toISOString(),
      duration: rental.rentalDuration,
      price: rental.rentalPrice,
      rating: 0, // No rating for auto-completed rentals
      review: 'Auto-completed (time expired)',
      transactionId: rental.transactionId,
      autoCompleted: true,
    });

    // Step 4: Update cycle status
    const cycleRef = doc(db, 'cycles', rental.id);
    await updateDoc(cycleRef, {
      status: CYCLE_STATUS.NOT_AVAILABLE,
      currentRenter: null,
      currentRenterName: null,
      currentRenterPhone: null,
      rentedAt: null,
      rentalDuration: null,
      rentalPrice: null,
      rentalEndTime: null,
      transactionId: null,
    });

    // Step 5: Update active rental status
    const activeRentalsRef = collection(db, 'activeRentals');
    const q = query(
      activeRentalsRef,
      where('cycleId', '==', rental.id),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);

    snapshot.forEach(async (doc) => {
      await updateDoc(doc.ref, {
        status: 'expired',
        expiredAt: new Date().toISOString(),
      });
    });

    console.log(`Successfully auto-completed rental for cycle ${rental.id}`);
  } catch (error) {
    console.error(`Error auto-completing rental for cycle ${rental.id}:`, error);
  }
};

/**
 * Check if a specific rental is expired
 * @param {string} rentalEndTime - ISO timestamp
 * @returns {boolean}
 */
export const isRentalExpired = (rentalEndTime) => {
  if (!rentalEndTime) return false;
  return new Date(rentalEndTime) < new Date();
};

/**
 * Get time until expiration
 * @param {string} rentalEndTime - ISO timestamp
 * @returns {number} Milliseconds until expiration (negative if expired)
 */
export const getTimeUntilExpiration = (rentalEndTime) => {
  if (!rentalEndTime) return 0;
  return new Date(rentalEndTime) - new Date();
};

/**
 * Calculate overtime penalty if rental exceeded time
 * @param {string} rentalEndTime - ISO timestamp
 * @param {string} completedAt - ISO timestamp
 * @returns {number} Penalty amount in rupees
 */
export const calculateOvertimePenalty = (rentalEndTime, completedAt) => {
  const endTime = new Date(rentalEndTime);
  const completed = new Date(completedAt);

  if (completed <= endTime) return 0;

  const overtimeMs = completed - endTime;
  const overtimeMinutes = Math.ceil(overtimeMs / 60000);

  // ₹5 per minute overtime
  return overtimeMinutes * 5;
};

/**
 * Send notification to user about expiring rental
 * @param {string} renterId - User ID
 * @param {string} cycleName - Cycle name
 * @param {number} minutesRemaining - Minutes until expiration
 */
export const sendExpirationWarning = async (renterId, cycleName, minutesRemaining) => {
  try {
    // In production, send push notification or SMS
    // For now, just create a notification record in Firestore
    
    await addDoc(collection(db, 'notifications'), {
      userId: renterId,
      type: 'rental_expiring',
      title: 'Rental Ending Soon',
      message: `Your rental of ${cycleName} will expire in ${minutesRemaining} minutes. Please return the cycle to avoid auto-lock.`,
      createdAt: new Date().toISOString(),
      read: false,
    });

    console.log(`Sent expiration warning to user ${renterId}`);
  } catch (error) {
    console.error('Error sending expiration warning:', error);
  }
};

/**
 * Monitor active rental and send warnings
 * @param {string} cycleId - Cycle ID
 * @param {string} rentalEndTime - End time ISO string
 * @param {function} onWarning - Callback when warning threshold reached
 */
export const monitorRentalExpiration = (cycleId, rentalEndTime, onWarning) => {
  const checkInterval = setInterval(() => {
    const remaining = getTimeUntilExpiration(rentalEndTime);
    const remainingMinutes = Math.floor(remaining / 60000);

    if (remainingMinutes <= 0) {
      // Expired
      clearInterval(checkInterval);
      onWarning('expired', 0);
    } else if (remainingMinutes === 5) {
      // 5 minutes remaining
      onWarning('warning', 5);
    } else if (remainingMinutes === 1) {
      // 1 minute remaining
      onWarning('critical', 1);
    }
  }, 30000); // Check every 30 seconds

  return () => clearInterval(checkInterval);
};
