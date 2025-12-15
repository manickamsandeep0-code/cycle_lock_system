import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, realtimeDb } from '../config/firebase';
import { getUserData } from '../utils/storage';

export default function RentCycle() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const cycle = JSON.parse(params.cycle);
  
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

      // Write unlock command to Realtime Database
      const commandRef = ref(realtimeDb, `/locks/${cycle.lockId}/command`);
      await set(commandRef, {
        action: "UNLOCK",
        executed: false,
      });

      Alert.alert(
        'Success!',
        `Unlock command sent to ${cycle.cycleName || cycle.lockId}!`,
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
        <Text style={styles.cycleName}>{cycle.cycleName || cycle.lockId}</Text>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Lock ID:</Text>
            <Text style={styles.infoValue}>{cycle.lockId}</Text>
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
