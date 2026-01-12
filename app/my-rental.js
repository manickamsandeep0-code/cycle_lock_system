import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { db, realtimeDb } from '../config/firebase';
import { getUserData } from '../utils/storage';
import { CYCLE_STATUS, LOCK_STATUS } from '../constants';
import { lockCycle } from '../services/lockService';
import { stopLocationTracking, getCurrentLocation } from '../services/locationService';
import { checkGeofence } from '../services/geofenceService';
import { checkAndExpireRental } from '../services/expirationService';

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
  const [batteryLevel, setBatteryLevel] = useState(null);

  useEffect(() => {
    loadActiveRental();
    
    return () => {
      // Cleanup on unmount
      if (expirationCheckInterval) {
        clearInterval(expirationCheckInterval);
      }
    };
  }, []);

  useEffect(() => {
    // Monitor geofence and expiration for active rental
    if (rental) {
      // Check geofence every 30 seconds
      const geofenceInterval = setInterval(async () => {
        try {
          const location = await getCurrentLocation();
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
            'Your rental time has ended. The cycle has been locked automatically.',
            [{ text: 'OK', onPress: () => router.replace('/map') }]
          );
        }
      }, 60000);

      setExpirationCheckInterval(expInterval);

      return () => {
        clearInterval(geofenceInterval);
        clearInterval(expInterval);
      };
    }
  }, [rental]);

  // Store battery listener unsubscribe function
  const [batteryUnsubscribe, setBatteryUnsubscribe] = useState(null);

  // Cleanup battery listener on unmount
  useEffect(() => {
    return () => {
      if (batteryUnsubscribe) {
        batteryUnsubscribe();
      }
    };
  }, [batteryUnsubscribe]);

  const loadActiveRental = async () => {
    try {
      const user = await getUserData();
      if (!user) {
        router.replace('/login');
        return;
      }

      const cyclesRef = collection(db, 'cycles');
      const q = query(cyclesRef, where('currentRenter', '==', user.id), where('status', '==', 'rented'));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const cycleDoc = querySnapshot.docs[0];
        const rentalData = { id: cycleDoc.id, ...cycleDoc.data() };
        setRental(rentalData);
        
        // Listen to battery updates from Realtime Database
        if (rentalData.lockCode) {
          const batteryRef = ref(realtimeDb, `/locks/${rentalData.lockCode}/battery`);
          const unsub = onValue(batteryRef, (snapshot) => {
            const battery = snapshot.val();
            setBatteryLevel(battery);
          });
          setBatteryUnsubscribe(() => unsub);
        }
      }
    } catch (error) {
      console.error('Error loading rental:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRide = () => {
    Alert.alert(
      'Complete Ride',
      'Are you sure you want to complete this ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: () => setShowReview(true) }
      ]
    );
  };

  const submitReview = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setCompleting(true);
    try {
      const user = await getUserData();
      
      // Step 1: Lock the cycle
      await lockCycle(rental.lockCode);

      // Step 2: Stop location tracking
      stopLocationTracking();

      // Step 3: Create rental history record
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
        price: rental.rentalPrice,
        rating: rating,
        review: review,
        autoCompleted: false
      });

      // Step 4: Update cycle status back to available
      const cycleRef = doc(db, 'cycles', rental.id);
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

      Alert.alert(
        'Thank You!',
        'Cycle locked! Ride completed successfully. Thank you for your review!',
        [{ text: 'OK', onPress: () => router.replace('/map') }]
      );
    } catch (error) {
      console.error('Error completing ride:', error);
      Alert.alert('Error', 'Failed to complete ride. Please try again.');
    } finally {
      setCompleting(false);
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

          <TouchableOpacity 
            style={[styles.button, completing && styles.buttonDisabled]}
            onPress={submitReview}
            disabled={completing}
          >
            <Text style={styles.buttonText}>
              {completing ? 'Submitting...' : 'Submit Review'}
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

          {batteryLevel !== null && batteryLevel !== undefined && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Battery:</Text>
              <View style={styles.batteryRow}>
                <Text style={styles.batteryIcon}>
                  {batteryLevel >= 60 ? '🔋' : batteryLevel >= 30 ? '🔋' : '🪫'}
                </Text>
                <Text style={[
                  styles.batteryValue,
                  { color: batteryLevel >= 60 ? '#10b981' : batteryLevel >= 30 ? '#f59e0b' : '#ef4444' }
                ]}>
                  {batteryLevel}%
                </Text>
              </View>
            </View>
          )}

          <View style={styles.timeBox}>
            <Text style={styles.timeText}>{timeRemaining()}</Text>
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
          <Text style={styles.completeButtonText}>Complete Ride</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f3f4f6',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  rentalCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cycleName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  timeBox: {
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  warningBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 2,
    borderColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#dc2626',
    textAlign: 'center',
  },
  warningSubtext: {
    fontSize: 12,
    color: '#991b1b',
    marginTop: 4,
  },
  ratingContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 12,
  },
  star: {
    fontSize: 48,
  },
  inputContainer: {
    marginBottom: 24,
  },
  textArea: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  completeButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  reportButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batteryIcon: {
    fontSize: 18,
  },
  batteryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  reportButtonText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#1e40af',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
});
