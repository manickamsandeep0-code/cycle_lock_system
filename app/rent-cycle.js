import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, realtimeDb } from '../config/firebase';
import { getUserData } from '../utils/storage';
import { CYCLE_STATUS } from '../constants';
import { updateEndAlert } from '../services/lockService';

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

      // Step 1: Update cycle status in Firestore
      const rentalEndTime = new Date();
      rentalEndTime.setMinutes(rentalEndTime.getMinutes() + requestedDuration);
      
      // Calculate rental price (you can adjust the rate)
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

      // Step 2: Write unlock command to Realtime Database
      const commandRef = ref(realtimeDb, `/locks/${cycle.lockCode}/command`);
      await set(commandRef, {
        action: "UNLOCK",
        executed: false,
        timestamp: Date.now()
      });

      // Step 3: Initialize endAlert to false
      await updateEndAlert(cycle.lockCode, false);

      Alert.alert(
        'Success!',
        `Cycle unlocked! You have ${requestedDuration} minutes to ride.`,
        [{ text: 'OK', onPress: () => router.replace('/my-rental') }]
      );
    } catch (error) {
      console.error('Error renting cycle:', error);
      Alert.alert('Error', 'Failed to unlock cycle. Please try again.');
    } finally {
      setLoading(false);
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
          {cycle.battery && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Battery:</Text>
              <Text style={styles.infoValue}>{cycle.battery}%</Text>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRent}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Unlocking...' : 'Unlock Cycle'}
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
    marginBottom: 24,
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
