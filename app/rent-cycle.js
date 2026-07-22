import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUserData } from '../utils/storage';
import { CYCLE_STATUS } from '../constants';
import { unlockCycle } from '../services/lockService';
import { startLocationTracking } from '../services/locationService';

export default function RentCycle() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Safe JSON parsing with error handling
  let cycle;
  try {
    cycle = JSON.parse(params.cycle);
  } catch (error) {
    console.error('Error parsing cycle data:', error);
    Alert.alert('Error', 'Invalid cycle data');
    router.back();
    return null;
  }
  
  // Validate cycle object
  if (!cycle || !cycle.id || !cycle.lockCode) {
    Alert.alert('Error', 'Invalid cycle information');
    router.back();
    return null;
  }
  
  const requestedDuration = params.requestedDuration ? parseInt(params.requestedDuration) : 60;
  
  const [loading, setLoading] = useState(false);
  const [btStatus, setBtStatus] = useState(''); // Bluetooth connection status for UI feedback

  const handleRent = async () => {
    setLoading(true);
    try {
      const user = await getUserData();
      if (!user) {
        Alert.alert('Error', 'Please login to rent a cycle');
        setLoading(false);
        return;
      }

      // CRITICAL: Check if user already has an active rental
      const cyclesRef = collection(db, 'cycles');
      const activeRentalQuery = query(cyclesRef, where('currentRenter', '==', user.id), where('status', '==', CYCLE_STATUS.RENTED));
      const activeRentals = await getDocs(activeRentalQuery);
      
      if (!activeRentals.empty) {
        Alert.alert('Error', 'You already have an active rental. Complete it before renting another cycle.');
        setLoading(false);
        router.back();
        return;
      }

      // CRITICAL: Check if cycle is still available before renting
      const cycleRef = doc(db, 'cycles', cycle.id);
      const cycleDoc = await getDoc(cycleRef);
      
      if (!cycleDoc.exists()) {
        Alert.alert('Error', 'Cycle not found');
        setLoading(false);
        router.back();
        return;
      }
      
      const currentCycleData = cycleDoc.data();
      if (currentCycleData.status !== CYCLE_STATUS.AVAILABLE) {
        Alert.alert('Error', 'This cycle is no longer available');
        setLoading(false);
        router.back();
        return;
      }

      // Step 1: Fetch Bluetooth credentials from Firestore
      const macAddress = currentCycleData.macAddress;
      const authPin = currentCycleData.authPin;

      if (!macAddress || !authPin || !authPin.currentPin) {
        Alert.alert('Error', 'This cycle does not have Bluetooth lock credentials configured. Please contact the owner.');
        setLoading(false);
        return;
      }

      // Step 2: Connect via Classic Bluetooth and send unlock command (with PIN fallback)
      setBtStatus('Connecting to HC-05 lock...');
      try {
        setBtStatus('Sending unlock command...');
        await unlockCycle(macAddress, authPin.currentPin, authPin.previousPin);
        setBtStatus('Lock unlocked!');
      } catch (btError) {
        console.error('Bluetooth unlock error:', btError);
        Alert.alert(
          'Unlock Failed',
          `Could not unlock the cycle via Bluetooth. ${btError.message}\n\nMake sure:\n• You are near the cycle\n• Bluetooth is enabled\n• HC-05 is paired in Android Settings`
        );
        setLoading(false);
        setBtStatus('');
        return;
      }

      // Step 3: Update cycle status in Firestore (only after successful BLE unlock)
      const rentalEndTime = new Date();
      rentalEndTime.setMinutes(rentalEndTime.getMinutes() + requestedDuration);
      
      // Calculate rental price
      const pricePerHour = 10; // ₹10 per hour
      const rentalPrice = Math.ceil((requestedDuration / 60) * pricePerHour);
      
      await updateDoc(cycleRef, {
        status: CYCLE_STATUS.RENTED,
        currentRenter: user.id,
        currentRenterName: user.name,
        currentRenterPhone: user.phoneNumber,
        rentedAt: new Date().toISOString(),
        rentalDuration: requestedDuration,
        rentalPrice: rentalPrice,
        rentalEndTime: rentalEndTime.toISOString()
      });

      // Step 4: Start location tracking (phone GPS → RTDB)
      try {
        await startLocationTracking(cycle.id, cycle.lockCode);
      } catch (locError) {
        console.warn('Location tracking failed to start:', locError);
        // Non-fatal — ride can continue without tracking
      }

      Alert.alert(
        'Success!',
        `Cycle unlocked! You have ${requestedDuration} minutes to ride.`,
        [{ text: 'OK', onPress: () => router.replace('/my-rental') }]
      );
    } catch (error) {
      console.error('Error renting cycle:', error);
      Alert.alert('Error', 'Failed to rent cycle. Please try again.');
    } finally {
      setLoading(false);
      setBtStatus('');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Rent Cycle</Text>
        <Text style={styles.cycleName}>{cycle.cycleName || cycle.lockCode}</Text>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Lock ID:</Text>
            <Text style={styles.infoValue}>{cycle.lockCode}</Text>
          </View>
          {cycle.ownerName && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Owner:</Text>
              <Text style={styles.infoValue}>{cycle.ownerName}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration:</Text>
            <Text style={styles.infoValue}>{requestedDuration} minutes</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Connection:</Text>
            <Text style={styles.infoValue}>Bluetooth Classic (HC-05)</Text>
          </View>
        </View>

        {/* Bluetooth Status Indicator */}
        {btStatus !== '' && (
          <View style={styles.bleStatusBox}>
            <ActivityIndicator size="small" color="#1e40af" />
            <Text style={styles.bleStatusText}>{btStatus}</Text>
          </View>
        )}

        <View style={styles.bleInfoBox}>
          <Text style={styles.bleInfoTitle}>📡 Bluetooth Required</Text>
          <Text style={styles.bleInfoText}>
            Make sure Bluetooth is turned on and the HC-05 module is paired in your Android Bluetooth Settings (default pairing PIN: 1234).
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRent}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Connecting & Unlocking...' : 'Unlock Cycle'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
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
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
  },
  cycleName: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  bleStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 10,
  },
  bleStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  bleInfoBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  bleInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  bleInfoText: {
    fontSize: 13,
    color: '#3b82f6',
    lineHeight: 18,
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
  cancelButton: {
    marginTop: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
});
