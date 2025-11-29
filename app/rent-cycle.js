import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, updateDoc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUserData } from '../utils/storage';
import { CYCLE_STATUS } from '../constants';
import { calculateRemainingTime, formatMinutes } from '../utils/timeHelpers';
import { createPaymentOrder, processPayment, holdPayment } from '../services/paymentService';
import { unlockCycle } from '../services/lockService';

export default function RentCycle() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const cycle = JSON.parse(params.cycle);
  const requestedDuration = parseInt(params.requestedDuration) || null;
  
  const [hours, setHours] = useState(requestedDuration ? String(Math.floor(requestedDuration / 60)) : '');
  const [minutes, setMinutes] = useState(requestedDuration ? String(requestedDuration % 60) : '');
  const [loading, setLoading] = useState(false);

  const remainingMinutes = cycle.remainingMinutes || calculateRemainingTime(cycle);

  const calculateTotalMinutes = () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    return (h * 60) + m;
  };

  const calculatePrice = () => {
    const totalMinutes = calculateTotalMinutes();
    const hours = totalMinutes / 60;
    return Math.ceil(hours * 30); // ₹30 per hour, rounded up
  };

  const handleRent = async () => {
    const totalMinutes = calculateTotalMinutes();

    if (totalMinutes < 10) {
      Alert.alert('Error', 'Minimum rental time is 10 minutes');
      return;
    }

    if (totalMinutes > remainingMinutes) {
      Alert.alert(
        'Error', 
        `This cycle only has ${formatMinutes(remainingMinutes)} remaining. Please select a shorter duration.`
      );
      return;
    }

    const price = calculatePrice();
    
    Alert.alert(
      'Confirm Rental',
      `You will rent ${cycle.cycleName} for ${totalMinutes} minutes at ₹${price}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => processRental(totalMinutes, price) }
      ]
    );
  };

  const processRental = async (totalMinutes, price) => {
    setLoading(true);
    try {
      const user = await getUserData();
      if (!user) {
        Alert.alert('Error', 'Please login to rent a cycle');
        setLoading(false);
        return;
      }

      // Step 1: Create payment order
      const orderResult = await createPaymentOrder(price, user.id, cycle.id, totalMinutes);
      if (!orderResult.success) {
        Alert.alert('Error', 'Failed to create payment order');
        setLoading(false);
        return;
      }

      // Step 2: Process payment through Razorpay
      const paymentResult = await processPayment(
        price,
        orderResult.orderId,
        {
          name: user.name,
          email: user.email || '',
          phone: user.phoneNumber,
        },
        `Rent ${cycle.cycleName} for ${totalMinutes} minutes`
      );

      if (!paymentResult.success) {
        Alert.alert('Payment Failed', paymentResult.error || 'Payment was cancelled');
        setLoading(false);
        return;
      }

      // Step 3: Hold payment (will be captured on ride completion)
      await holdPayment(orderResult.orderId, paymentResult.paymentId);

      // Step 4: Update cycle status in Firestore
      const cycleRef = doc(db, 'cycles', cycle.id);
      const rentalEndTime = new Date(Date.now() + totalMinutes * 60000).toISOString();

      await updateDoc(cycleRef, {
        status: CYCLE_STATUS.RENTED,
        currentRenter: user.id,
        currentRenterName: user.name,
        currentRenterPhone: user.phoneNumber,
        rentedAt: new Date().toISOString(),
        rentalDuration: totalMinutes,
        rentalPrice: price,
        rentalEndTime: rentalEndTime,
        transactionId: orderResult.orderId,
      });

      // Step 5: Unlock the cycle via IoT
      const unlockResult = await unlockCycle(cycle.lockId, user.id, orderResult.orderId);
      
      if (!unlockResult.success) {
        Alert.alert(
          'Warning',
          'Cycle rented but unlock failed. Please contact the owner or support.',
          [{ text: 'OK', onPress: () => router.replace('/my-rental') }]
        );
        setLoading(false);
        return;
      }

      // Step 6: Create active rental tracking record
      await addDoc(collection(db, 'activeRentals'), {
        cycleId: cycle.id,
        renterId: user.id,
        ownerId: cycle.ownerId,
        lockId: cycle.lockId,
        startTime: new Date().toISOString(),
        endTime: rentalEndTime,
        transactionId: orderResult.orderId,
        status: 'active',
      });

      Alert.alert(
        'Success!',
        `Payment successful! ${cycle.cycleName} is now unlocked. Enjoy your ride!`,
        [{ text: 'OK', onPress: () => router.replace('/my-rental') }]
      );
    } catch (error) {
      console.error('Error renting cycle:', error);
      Alert.alert('Error', 'Failed to rent cycle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Rent Cycle</Text>
        <Text style={styles.cycleName}>{cycle.cycleName}</Text>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Owner:</Text>
            <Text style={styles.infoValue}>{cycle.ownerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Available for:</Text>
            <Text style={styles.infoValue}>{formatMinutes(remainingMinutes)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Price:</Text>
            <Text style={styles.infoValue}>₹30/hour</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>How long do you need?</Text>
        
        <View style={styles.durationContainer}>
          <View style={styles.timeInputContainer}>
            <Text style={styles.label}>Hours</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="number-pad"
              value={hours}
              onChangeText={setHours}
              maxLength={2}
            />
          </View>

          <Text style={styles.separator}>:</Text>

          <View style={styles.timeInputContainer}>
            <Text style={styles.label}>Minutes</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="number-pad"
              value={minutes}
              onChangeText={setMinutes}
              maxLength={2}
            />
          </View>
        </View>

        {calculateTotalMinutes() > 0 && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Rental Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration:</Text>
              <Text style={styles.summaryValue}>{calculateTotalMinutes()} minutes</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Cost:</Text>
              <Text style={styles.summaryPrice}>₹{calculatePrice()}</Text>
            </View>
            {calculateTotalMinutes() > remainingMinutes && (
              <Text style={styles.warningText}>
                ⚠️ Exceeds available time!
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRent}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Processing...' : 'Rent Now'}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  timeInputContainer: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '80%',
  },
  separator: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6b7280',
    marginHorizontal: 16,
    marginTop: 24,
  },
  summaryBox: {
    backgroundColor: '#dbeafe',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#1e40af',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  warningText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 8,
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
