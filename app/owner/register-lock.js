import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getUserData } from '../../utils/storage';
import { CYCLE_STATUS, LOCK_STATUS, KARUNYA_LOCATION } from '../../constants';

export default function RegisterLock() {
  const router = useRouter();
  const [lockCode, setLockCode] = useState('');
  const [cycleName, setCycleName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegisterLock = async () => {
    if (!lockCode.trim()) {
      Alert.alert('Error', 'Please enter a Lock Code');
      return;
    }
    if (!cycleName.trim()) {
      Alert.alert('Error', 'Please enter a name for your cycle');
      return;
    }

    setLoading(true);
    try {
      const user = await getUserData();
      if (!user) {
        Alert.alert('Error', 'User not found. Please login again.');
        setLoading(false);
        return;
      }

      // Check if lock code already exists
      const cyclesRef = collection(db, 'cycles');
      const q = query(cyclesRef, where('lockCode', '==', lockCode));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const existingCycle = querySnapshot.docs[0].data();
        
        // If lock already has an owner, check if it's the same owner
        if (existingCycle.ownerId) {
          if (existingCycle.ownerId !== user.id) {
            Alert.alert('Error', 'This Lock Code is already registered to another owner.');
            setLoading(false);
            return;
          } else {
            Alert.alert('Error', 'You have already registered this lock code.');
            setLoading(false);
            return;
          }
        }
        // Lock exists but no owner - update it with owner info
        const cycleDocId = querySnapshot.docs[0].id;
        const cycleRef = doc(db, 'cycles', cycleDocId);
        
        await updateDoc(cycleRef, {
          ownerId: user.id,
          ownerName: user.name,
          ownerPhone: user.phoneNumber,
          cycleName: cycleName,
          status: 'available',
          registeredAt: new Date().toISOString(),
        });
      } else {
        Alert.alert('Error', 'Invalid Lock Code. This lock does not exist in our system.');
        setLoading(false);
        return;
      }

      Alert.alert(
        'Success',
        'Lock registered successfully! Your cycle is now available for rent.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error registering lock:', error);
      Alert.alert('Error', 'Failed to register lock. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Register Your Lock</Text>
        <Text style={styles.subtitle}>
          Enter the unique Lock ID from your Arduino device
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Lock Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., LOCK_001"
            value={lockCode}
            onChangeText={setLockCode}
            autoCapitalize="characters"
          />
          <Text style={styles.hint}>
            This must match the Lock Code programmed in your Arduino
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Cycle Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., My Red Cycle"
            value={cycleName}
            onChangeText={setCycleName}
          />
          <Text style={styles.hint}>
            Give your cycle a friendly name
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📍 Initial Location</Text>
          <Text style={styles.infoText}>
            Your cycle will be placed at the Karunya campus center initially.
            The GPS will update the location automatically when the lock is active.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegisterLock}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Registering...' : 'Register Lock'}
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
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: '#dbeafe',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#1e40af',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
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
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
});
