import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { CYCLE_STATUS } from '../../constants';

export default function SetAvailability() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { cycleId, cycleName } = params;
  
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSetAvailable = async () => {
    const totalMinutes = calculateTotalMinutes();

    if (totalMinutes < 10) {
      Alert.alert('Error', 'Minimum availability time is 10 minutes');
      return;
    }

    setLoading(true);
    try {
      const cycleRef = doc(db, 'cycles', cycleId);
      const availableUntil = new Date(Date.now() + totalMinutes * 60000).toISOString();

      await updateDoc(cycleRef, {
        status: CYCLE_STATUS.AVAILABLE,
        availableMinutes: totalMinutes,
        availableUntil: availableUntil,
        pricePerHour: 30,
        updatedAt: new Date().toISOString(),
      });

      Alert.alert(
        'Success',
        `Cycle is now available for ${totalMinutes} minutes (₹${calculatePrice()} max)`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error setting availability:', error);
      Alert.alert('Error', 'Failed to set availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Set Availability</Text>
        <Text style={styles.subtitle}>{cycleName}</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💰 Pricing: ₹30 per hour{'\n'}
            ⏱️ Minimum: 10 minutes
          </Text>
        </View>

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
            <Text style={styles.summaryTitle}>Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Duration:</Text>
              <Text style={styles.summaryValue}>{calculateTotalMinutes()} minutes</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Maximum Earnings:</Text>
              <Text style={styles.summaryValue}>₹{calculatePrice()}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSetAvailable}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Setting...' : 'Set Available'}
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
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#dbeafe',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 22,
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
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#166534',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
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
