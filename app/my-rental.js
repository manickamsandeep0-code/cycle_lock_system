import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUserData } from '../utils/storage';
import { CYCLE_STATUS, BT_CONFIG } from '../constants';
import { lockCycle, unlockCycle, changeLockPin, lockWithPin, disconnectLock } from '../services/lockService';
import { startLocationTracking, stopLocationTracking, getCurrentLocation } from '../services/locationService';
import { checkGeofence } from '../services/geofenceService';
import { checkAndExpireRental } from '../services/expirationService';
import { generateNewPin } from '../services/bluetoothService';

export default function MyRental() {
  const router = useRouter();
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [geofenceWarning, setGeofenceWarning] = useState(null);
  const [expirationCheckInterval, setExpirationCheckInterval] = useState(null);
  const [lockActionLoading, setLockActionLoading] = useState(false);
  const [btStatus, setBtStatus] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    loadActiveRental();
    
    return () => {
      if (expirationCheckInterval) {
        clearInterval(expirationCheckInterval);
      }
    };
  }, []);

  // Start location tracking and monitoring when rental is loaded
  useEffect(() => {
    if (rental) {
      // Start phone GPS tracking → RTDB
      startLocationTracking(rental.id, rental.lockCode).catch((err) => {
        console.warn('Failed to start location tracking:', err);
      });

      // Check geofence every 30 seconds
      const geofenceInterval = setInterval(async () => {
        try {
          const location = await getCurrentLocation();
          setCurrentLocation(location);
          const geofenceStatus = checkGeofence(location.latitude, location.longitude);
          
          if (geofenceStatus.isViolation) {
            setGeofenceWarning(geofenceStatus.message);
          } else {
            setGeofenceWarning(null);
          }
        } catch (error) {
          console.error('Geofence check error:', error);
        }
      }, 30000);

      // Check expiration every minute
      const expInterval = setInterval(async () => {
        const expired = await checkAndExpireRental(rental.id);
        if (expired) {
          Alert.alert(
            'Rental Expired',
            'Your rental time has ended. Please lock the cycle manually by going near it.',
            [{ text: 'OK', onPress: () => router.replace('/map') }]
          );
          return;
        }
      }, 60000);

      setExpirationCheckInterval(expInterval);

      return () => {
        clearInterval(geofenceInterval);
        clearInterval(expInterval);
        stopLocationTracking();
      };
    }
  }, [rental]);

  const loadActiveRental = async () => {
    try {
      const user = await getUserData();
      if (!user) {
        router.replace('/login');
        return;
      }

      const cyclesRef = collection(db, 'cycles');
      const q = query(cyclesRef, where('currentRenter', '==', user.id), where('status', '==', CYCLE_STATUS.RENTED));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const cycleDoc = querySnapshot.docs[0];
        const rentalData = { id: cycleDoc.id, ...cycleDoc.data() };
        setRental(rentalData);
      }
    } catch (error) {
      console.error('Error loading rental:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch fresh authPin from Firestore (in case it changed)
  const getFreshAuthPin = async (cycleId) => {
    const cycleDoc = await getDoc(doc(db, 'cycles', cycleId));
    if (cycleDoc.exists()) {
      return cycleDoc.data().authPin || {};
    }
    return {};
  };

  const handleLockCycle = async () => {
    if (!rental.macAddress) {
      Alert.alert('Error', 'Bluetooth credentials not found for this cycle.');
      return;
    }

    setLockActionLoading(true);
    setBtStatus('Connecting to lock...');
    try {
      const authPin = await getFreshAuthPin(rental.id);
      await lockCycle(rental.macAddress, authPin.currentPin, authPin.previousPin);
      setBtStatus('');
      Alert.alert('Success', 'Cycle locked successfully!');
    } catch (error) {
      console.error('Error locking cycle:', error);
      setBtStatus('');
      Alert.alert('Lock Failed', `Could not lock the cycle. ${error.message}\n\nMake sure you are near the cycle and HC-05 is paired.`);
    } finally {
      setLockActionLoading(false);
    }
  };

  const handleUnlockCycle = async () => {
    if (!rental.macAddress) {
      Alert.alert('Error', 'Bluetooth credentials not found for this cycle.');
      return;
    }

    setLockActionLoading(true);
    setBtStatus('Connecting to lock...');
    try {
      const authPin = await getFreshAuthPin(rental.id);
      await unlockCycle(rental.macAddress, authPin.currentPin, authPin.previousPin);
      setBtStatus('');
      Alert.alert('Success', 'Cycle unlocked successfully!');
    } catch (error) {
      console.error('Error unlocking cycle:', error);
      setBtStatus('');
      Alert.alert('Unlock Failed', `Could not unlock the cycle. ${error.message}\n\nMake sure you are near the cycle and HC-05 is paired.`);
    } finally {
      setLockActionLoading(false);
    }
  };

  const handleCompleteRide = () => {
    Alert.alert(
      'Complete Ride',
      'Are you sure you want to end this ride?\n\nMake sure you are near the cycle — the app will lock it via Bluetooth and rotate the security PIN.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: () => setShowReview(true) }
      ]
    );
  };

  /**
   * PIN ROTATION RIDE COMPLETION FLOW:
   * 1. Generate new random 4-digit PIN
   * 2. Cloud-First: Update Firestore authPin (currentPin=new, previousPin=old, syncStatus=PENDING)
   * 3. Connect BT → send [oldPin]C[newPin] → wait for OK
   * 4. Send [newPin]L to lock → wait for OK
   * 5. Update Firestore syncStatus → SYNCED, status → AVAILABLE
   * 6. Push final GPS as parked location
   * 7. Disconnect BT
   */
  const submitReview = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setCompleting(true);
    try {
      const user = await getUserData();
      const cycleRef = doc(db, 'cycles', rental.id);

      // Get fresh auth PIN from Firestore
      const authPin = await getFreshAuthPin(rental.id);
      const oldPin = authPin.currentPin;
      const previousPin = authPin.previousPin;

      // Step 1: Generate new PIN for rotation
      const newPin = generateNewPin();
      console.log('[PIN Rotation] Starting rotation...');

      // Step 2: Cloud-First — Update Firestore BEFORE touching hardware
      setBtStatus('Preparing PIN rotation...');
      await updateDoc(cycleRef, {
        authPin: {
          currentPin: newPin,
          previousPin: oldPin,
          syncStatus: BT_CONFIG.PIN_SYNC_STATUS.PENDING,
        }
      });
      console.log('[PIN Rotation] Firestore updated (PENDING)');

      // Step 3: Connect BT → Change PIN on hardware
      let hardwarePinChanged = false;
      let pinUsedForLock = newPin; // The PIN we'll use to lock

      if (rental.macAddress) {
        setBtStatus('Connecting to lock...');
        try {
          // Try to change PIN: send [oldPin]C[newPin]
          // If oldPin doesn't work (desync), try previousPin
          try {
            await changeLockPin(rental.macAddress, oldPin, newPin);
            hardwarePinChanged = true;
          } catch (changePinErr) {
            console.warn('[PIN Rotation] Change with oldPin failed, trying previousPin');
            if (previousPin && previousPin !== oldPin) {
              await changeLockPin(rental.macAddress, previousPin, newPin);
              hardwarePinChanged = true;
            } else {
              throw changePinErr;
            }
          }

          // Step 4: Lock with the new PIN
          setBtStatus('Locking cycle...');
          await lockWithPin(newPin);
          console.log('[PIN Rotation] Hardware locked with new PIN');

        } catch (btError) {
          console.warn('[PIN Rotation] BT failed:', btError.message);
          // PIN change failed — try to lock with whatever PIN the hardware has
          pinUsedForLock = oldPin;
          try {
            await lockCycle(rental.macAddress, oldPin, previousPin);
          } catch (lockErr) {
            // Can't lock — ask user
            const continueWithout = await new Promise((resolve) => {
              Alert.alert(
                'Lock Failed',
                'Could not lock the cycle via Bluetooth. The cycle may remain physically unlocked.\n\nDo you want to complete the ride anyway?',
                [
                  { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
                  { text: 'Complete Anyway', onPress: () => resolve(true) }
                ]
              );
            });
            if (!continueWithout) {
              // Revert Firestore PIN change since we couldn't sync
              await updateDoc(cycleRef, {
                authPin: { currentPin: oldPin, previousPin, syncStatus: BT_CONFIG.PIN_SYNC_STATUS.SYNCED }
              });
              setCompleting(false);
              setBtStatus('');
              return;
            }
          }
        }
      }

      // Step 5: Finalize — Update Firestore syncStatus
      setBtStatus('Finalizing...');
      const finalSyncStatus = hardwarePinChanged
        ? BT_CONFIG.PIN_SYNC_STATUS.SYNCED
        : BT_CONFIG.PIN_SYNC_STATUS.PENDING;

      // Step 6: Get final GPS coordinate as parked location
      let parkedLocation = null;
      try {
        parkedLocation = await getCurrentLocation();
      } catch (locError) {
        console.warn('Could not get final location:', locError);
      }

      // Stop location tracking
      stopLocationTracking();

      // Create rental history record
      await addDoc(collection(db, 'rentalHistory'), {
        cycleId: rental.id,
        cycleName: rental.cycleName,
        lockCode: rental.lockCode,
        ownerId: rental.ownerId,
        ownerName: rental.ownerName,
        renterId: user.id,
        renterName: user.name,
        renterPhone: user.phoneNumber,
        rentedAt: rental.rentedAt,
        completedAt: new Date().toISOString(),
        duration: rental.rentalDuration,
        price: rental.rentalPrice || 0,
        rating: rating,
        review: review,
        autoCompleted: false,
        pinRotated: hardwarePinChanged,
      });

      // Update cycle status back to available with parked location
      const updateData = {
        status: CYCLE_STATUS.AVAILABLE,
        currentRenter: null,
        currentRenterName: null,
        currentRenterPhone: null,
        rentedAt: null,
        rentalDuration: null,
        rentalPrice: null,
        rentalEndTime: null,
        availableMinutes: 0,
        availableUntil: null,
        'authPin.syncStatus': finalSyncStatus,
      };

      if (parkedLocation) {
        updateData.location = {
          latitude: parkedLocation.latitude,
          longitude: parkedLocation.longitude
        };
        updateData.lastLocationUpdate = new Date().toISOString();
      }

      await updateDoc(cycleRef, updateData);

      // Step 7: Disconnect Bluetooth
      await disconnectLock();
      setBtStatus('');

      Alert.alert(
        'Thank You!',
        `Ride completed successfully!${hardwarePinChanged ? ' Security PIN has been rotated.' : ''}\n\nThank you for your review!`,
        [{ text: 'OK', onPress: () => router.replace('/map') }]
      );
    } catch (error) {
      console.error('Error completing ride:', error);
      Alert.alert('Error', 'Failed to complete ride. Please try again.');
    } finally {
      setCompleting(false);
      setBtStatus('');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (!rental) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Active Rental</Text>
        <Text style={styles.emptyText}>You don't have any active rentals</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.replace('/map')}
        >
          <Text style={styles.buttonText}>Find a Cycle</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showReview) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Rate Your Experience</Text>
          <Text style={styles.subtitle}>{rental.cycleName}</Text>

          <View style={styles.ratingContainer}>
            <Text style={styles.label}>Rating</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                >
                  <Text style={styles.star}>
                    {star <= rating ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Review (Optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Share your experience..."
              value={review}
              onChangeText={setReview}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* BT Status during completion */}
          {btStatus !== '' && (
            <View style={styles.btStatusBox}>
              <ActivityIndicator size="small" color="#1e40af" />
              <Text style={styles.btStatusText}>{btStatus}</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.button, completing && styles.buttonDisabled]}
            onPress={submitReview}
            disabled={completing}
          >
            <Text style={styles.buttonText}>
              {completing ? 'Completing Ride...' : 'Submit, Lock & Rotate PIN'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const timeRemaining = () => {
    const endTime = new Date(rental.rentalEndTime);
    const now = new Date();
    const diff = endTime - now;
    if (diff <= 0) return 'Time expired';
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minutes remaining`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Active Rental</Text>
        
        <View style={styles.rentalCard}>
          <Text style={styles.cycleName}>{rental.cycleName}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Owner:</Text>
            <Text style={styles.infoValue}>{rental.ownerName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration:</Text>
            <Text style={styles.infoValue}>{rental.rentalDuration} minutes</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cost:</Text>
            <Text style={styles.infoValue}>₹{rental.rentalPrice}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Started:</Text>
            <Text style={styles.infoValue}>
              {new Date(rental.rentedAt).toLocaleTimeString()}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Connection:</Text>
            <Text style={styles.infoValue}>📡 HC-05 Classic Bluetooth</Text>
          </View>

          <View style={styles.timeBox}>
            <Text style={styles.timeText}>{timeRemaining()}</Text>
          </View>

          {/* BT Status Indicator */}
          {btStatus !== '' && (
            <View style={styles.btStatusBox}>
              <ActivityIndicator size="small" color="#1e40af" />
              <Text style={styles.btStatusText}>{btStatus}</Text>
            </View>
          )}

          <View style={styles.lockControls}>
            <TouchableOpacity 
              style={[styles.lockButton, lockActionLoading && styles.buttonDisabled]}
              onPress={handleLockCycle}
              disabled={lockActionLoading}
            >
              <Text style={styles.lockButtonText}>🔒 Lock</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.unlockButton, lockActionLoading && styles.buttonDisabled]}
              onPress={handleUnlockCycle}
              disabled={lockActionLoading}
            >
              <Text style={styles.unlockButtonText}>🔓 Unlock</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.btHintBox}>
            <Text style={styles.btHintText}>
              📡 Lock/Unlock requires Bluetooth proximity &amp; HC-05 paired
            </Text>
          </View>

          {geofenceWarning && (
            <View style={styles.warningBox}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningText}>{geofenceWarning}</Text>
              <Text style={styles.warningSubtext}>Please return to campus!</Text>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={styles.completeButton}
          onPress={handleCompleteRide}
        >
          <Text style={styles.completeButtonText}>End Ride, Lock &amp; Rotate PIN</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.reportButton}
          onPress={() => router.push(`/damage-report?cycleId=${rental.id}`)}
        >
          <Text style={styles.reportButtonText}>🔧 Report Damage or Issue</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Back to Map</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f3f4f6' },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e40af', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 24 },
  rentalCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cycleName: { fontSize: 20, fontWeight: 'bold', color: '#374151', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#374151' },
  timeBox: { backgroundColor: '#dbeafe', padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  timeText: { fontSize: 16, fontWeight: 'bold', color: '#1e40af' },
  btStatusBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dbeafe', padding: 10, borderRadius: 8, marginTop: 12, gap: 10 },
  btStatusText: { fontSize: 14, fontWeight: '600', color: '#1e40af' },
  btHintBox: { backgroundColor: '#f0f9ff', padding: 10, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  btHintText: { fontSize: 12, color: '#3b82f6', textAlign: 'center' },
  lockControls: { flexDirection: 'row', gap: 12, marginTop: 16 },
  lockButton: { flex: 1, backgroundColor: '#ef4444', padding: 14, borderRadius: 8, alignItems: 'center' },
  lockButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  unlockButton: { flex: 1, backgroundColor: '#10b981', padding: 14, borderRadius: 8, alignItems: 'center' },
  unlockButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  warningBox: { backgroundColor: '#fef2f2', borderWidth: 2, borderColor: '#ef4444', padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  warningIcon: { fontSize: 24, marginBottom: 4 },
  warningText: { fontSize: 14, fontWeight: 'bold', color: '#dc2626', textAlign: 'center' },
  warningSubtext: { fontSize: 12, color: '#991b1b', marginTop: 4 },
  ratingContainer: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  stars: { flexDirection: 'row', gap: 12 },
  star: { fontSize: 48 },
  inputContainer: { marginBottom: 24 },
  textArea: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, minHeight: 100, textAlignVertical: 'top' },
  completeButton: { backgroundColor: '#10b981', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 12 },
  completeButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  reportButton: { backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#f59e0b', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 12 },
  reportButtonText: { color: '#f59e0b', fontSize: 16, fontWeight: '600' },
  button: { backgroundColor: '#1e40af', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#9ca3af' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  backButton: { padding: 16, alignItems: 'center' },
  backButtonText: { color: '#6b7280', fontSize: 16 },
});
