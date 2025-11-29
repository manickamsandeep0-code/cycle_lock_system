import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { saveUserData, saveUserRole } from '../utils/storage';
import { USER_ROLES } from '../constants';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    registerNo: '',
    phoneNumber: '',
    role: '',
    lockCode: '', // For owners only
    cycleName: '', // For owners only
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    const { name, registerNo, phoneNumber, role, lockCode, cycleName } = formData;

    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!registerNo.trim()) {
      Alert.alert('Error', 'Please enter your college register number');
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }
    if (!role) {
      Alert.alert('Error', 'Please select your role');
      return;
    }
    // Additional validation for owners
    if (role === USER_ROLES.OWNER) {
      if (!lockCode.trim()) {
        Alert.alert('Error', 'Please enter your Lock Code');
        return;
      }
      if (!cycleName.trim()) {
        Alert.alert('Error', 'Please enter a name for your cycle');
        return;
      }
    }

    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      
      // For owners, check if lock code exists and is not already registered
      if (role === USER_ROLES.OWNER) {
        const cyclesRef = collection(db, 'cycles');
        const lockQuery = query(cyclesRef, where('lockCode', '==', lockCode));
        const lockSnapshot = await getDocs(lockQuery);

        if (!lockSnapshot.empty) {
          const cycleDoc = lockSnapshot.docs[0];
          const cycleData = cycleDoc.data();
          
          if (cycleData.ownerId) {
            Alert.alert('Error', 'This Lock Code is already registered to another owner.');
            setLoading(false);
            return;
          }
        } else {
          Alert.alert('Error', 'Invalid Lock Code. Please check and try again.');
          setLoading(false);
          return;
        }
      }
      
      // Check if phone number already exists
      const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        Alert.alert('Error', 'Phone number already registered. Please login.');
        setLoading(false);
        return;
      }

      // Create new user
      const userData = {
        name,
        registerNo,
        phoneNumber,
        role,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(usersRef, userData);
      const newUser = { id: docRef.id, ...userData };

      // Save to local storage
      await saveUserData(newUser);
      await saveUserRole(role);

      // For owners, update the cycle document with owner info
      if (role === USER_ROLES.OWNER) {
        const cyclesRef = collection(db, 'cycles');
        const lockQuery = query(cyclesRef, where('lockCode', '==', lockCode));
        const lockSnapshot = await getDocs(lockQuery);
        
        if (!lockSnapshot.empty) {
          const cycleDoc = lockSnapshot.docs[0];
          const cycleRef = doc(db, 'cycles', cycleDoc.id);
          
          await updateDoc(cycleRef, {
            ownerId: newUser.id,
            ownerName: name,
            ownerPhone: phoneNumber,
            cycleName: cycleName,
            status: 'available',
            registeredAt: new Date().toISOString(),
          });
        }
      }

      Alert.alert('Success', 'Registration successful!', [
        { 
          text: 'OK', 
          onPress: () => {
            if (role === 'owner') {
              router.replace('/owner/dashboard');
            } else {
              router.replace('/map');
            }
          }
        }
      ]);
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Karunya Cycle Rental</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>College Register Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your register number"
            value={formData.registerNo}
            onChangeText={(value) => handleInputChange('registerNo', value)}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 10-digit phone number"
            keyboardType="phone-pad"
            maxLength={10}
            value={formData.phoneNumber}
            onChangeText={(value) => handleInputChange('phoneNumber', value)}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>I am a:</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                formData.role === USER_ROLES.OWNER && styles.roleButtonActive
              ]}
              onPress={() => handleInputChange('role', USER_ROLES.OWNER)}
            >
              <Text style={[
                styles.roleButtonText,
                formData.role === USER_ROLES.OWNER && styles.roleButtonTextActive
              ]}>
                Cycle Owner
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleButton,
                formData.role === USER_ROLES.RENTER && styles.roleButtonActive
              ]}
              onPress={() => handleInputChange('role', USER_ROLES.RENTER)}
            >
              <Text style={[
                styles.roleButtonText,
                formData.role === USER_ROLES.RENTER && styles.roleButtonTextActive
              ]}>
                Student (Renter)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Show Lock Code and Cycle Name fields only for Owners */}
        {formData.role === USER_ROLES.OWNER && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Lock Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter the code from your lock device"
                value={formData.lockCode}
                onChangeText={(value) => handleInputChange('lockCode', value)}
                autoCapitalize="characters"
              />
              <Text style={styles.hint}>
                This code was provided when you purchased the lock
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Cycle Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., My Red Cycle"
                value={formData.cycleName}
                onChangeText={(value) => handleInputChange('cycleName', value)}
              />
              <Text style={styles.hint}>
                Give your cycle a friendly name
              </Text>
            </View>
          </>
        )}

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Registering...' : 'Register'}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>Login</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e40af',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
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
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  roleButtonTextActive: {
    color: '#ffffff',
  },
  button: {
    backgroundColor: '#1e40af',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 14,
  },
  linkText: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '600',
  },
});
