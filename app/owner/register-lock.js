import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getUserData } from '../../utils/storage';
import { CYCLE_STATUS } from '../../constants';

export default function RegisterLock() {
  const router = useRouter();
  const [lockCode, setLockCode] = useState('');
  const [cycleName, setCycleName] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [lockPin, setLockPin] = useState('');
  const [loading, setLoading] = useState(false);

  const validateMacAddress = (mac) => {
    // Accept formats: AA:BB:CC:DD:EE:FF or AABBCCDDEEFF
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{12})$/;
    return macRegex.test(mac.trim());
  };

  const validatePin = (pin) => {
    return /^\d{4}$/.test(pin);
  };

  const handleRegisterLock = async () => {
    if (!lockCode.trim()) {
      Alert.alert('Error', 'Please enter a Lock Code');
      return;
    }
    if (!cycleName.trim()) {
      Alert.alert('Error', 'Please enter a name for your cycle');
      return;
    }
    if (!macAddress.trim()) {
      Alert.alert('Error', 'Please enter the BLE MAC Address of the HM-10/JDY-08 module');
      return;
    }
    if (!validateMacAddress(macAddress)) {
      Alert.alert('Error', 'Invalid MAC Address format. Use AA:BB:CC:DD:EE:FF format.');
      return;
    }
    if (!lockPin.trim()) {
      Alert.alert('Error', 'Please enter the 4-digit Lock PIN');
      return;
    }
    if (!validatePin(lockPin)) {
      Alert.alert('Error', 'Lock PIN must be exactly 4 digits (0-9).');
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
        // Lock exists but no owner - update it with owner info and BLE credentials
        const cycleDocId = querySnapshot.docs[0].id;
        const cycleRef = doc(db, 'cycles', cycleDocId);
        
        // Normalize MAC address to uppercase with colons
        const normalizedMac = macAddress.trim().toUpperCase().replace(/[:-]/g, '').replace(/(.{2})/g, '$1:').slice(0, -1);

        await updateDoc(cycleRef, {
          ownerId: user.id,
          ownerName: user.name,
          ownerPhone: user.phoneNumber,
          cycleName: cycleName,
          macAddress: normalizedMac,
          lockPin: lockPin,
          status: CYCLE_STATUS.AVAILABLE,
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
        <Text style={styles.title}>Register Your BLE Lock</Text>
        <Text style={styles.subtitle}>
          Enter the details of your STM8 + BLE lock module
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
            This must match the Lock Code in the system database
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

        <View style={styles.inputContainer}>
          <Text style={styles.label}>BLE MAC Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., AA:BB:CC:DD:EE:FF"
            value={macAddress}
            onChangeText={setMacAddress}
            autoCapitalize="characters"
          />
          <Text style={styles.hint}>
            The Bluetooth MAC address printed on your HM-10 or JDY-08 module
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Lock PIN (4 digits)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 1234"
            value={lockPin}
            onChangeText={setLockPin}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
          />
          <Text style={styles.hint}>
            The 4-digit auth PIN programmed into your STM8 firmware
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📡 BLE Lock Setup</Text>
          <Text style={styles.infoText}>
            Your cycle uses a Bluetooth Low Energy (BLE) smart lock. The app connects 
            directly to the lock via Bluetooth — no Wi-Fi needed on the lock hardware.
            {'\n\n'}
            Make sure the HM-10/JDY-08 module is powered on and the STM8 is flashed 
            with the correct firmware and PIN.
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
