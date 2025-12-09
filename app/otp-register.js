import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { sendOTP, verifyOTP, checkUserExists, createUserProfile, resendOTP } from '../services/otpService';
import { saveUserData, saveUserRole } from '../utils/storage';

export default function OTPRegister() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: phone, 2: OTP, 3: details
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    registerNo: '',
    role: '',
  });
  const [resendTimer, setResendTimer] = useState(0);

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      await sendOTP(phoneNumber);
      Alert.alert('Success', 'OTP sent to your phone number');
      setStep(2);
      startResendTimer();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOTP(phoneNumber, otp);
      setUid(result.uid);

      // Check if user already exists
      const exists = await checkUserExists(result.uid);
      
      if (exists) {
        Alert.alert('Welcome Back!', 'You are already registered. Please login.', [
          { text: 'OK', onPress: () => router.replace('/login') }
        ]);
      } else {
        setStep(3);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) {
      return;
    }

    setLoading(true);
    try {
      await resendOTP(phoneNumber);
      Alert.alert('Success', 'OTP has been resent');
      startResendTimer();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCompleteRegistration = async () => {
    const { name, registerNo, role } = formData;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!registerNo.trim()) {
      Alert.alert('Error', 'Please enter your college register number');
      return;
    }
    if (!role) {
      Alert.alert('Error', 'Please select your role');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        name,
        registerNo,
        phoneNumber,
        role,
      };

      await createUserProfile(uid, userData);

      const newUser = { id: uid, ...userData };
      await saveUserData(newUser);
      await saveUserRole(role);

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
      Alert.alert('Error', 'Failed to complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Enter your phone number to get started</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phoneInputContainer}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter 10-digit number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.button}
            onPress={handleSendOTP}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (step === 2) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to +91{phoneNumber}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>OTP Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <TouchableOpacity 
            style={styles.button}
            onPress={handleVerifyOTP}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleResendOTP}
            disabled={resendTimer > 0 || loading}
          >
            <Text style={[styles.linkText, resendTimer > 0 && styles.linkTextDisabled]}>
              {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setStep(1)}>
            <Text style={styles.linkText}>Change Phone Number</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Complete Profile</Text>
        <Text style={styles.subtitle}>Tell us a bit about yourself</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={formData.name}
            onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>College Register Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your register number"
            value={formData.registerNo}
            onChangeText={(value) => setFormData(prev => ({ ...prev, registerNo: value }))}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>I am a</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleButton, formData.role === 'owner' && styles.roleButtonActive]}
              onPress={() => setFormData(prev => ({ ...prev, role: 'owner' }))}
            >
              <Text style={[styles.roleButtonText, formData.role === 'owner' && styles.roleButtonTextActive]}>
                Cycle Owner
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, formData.role === 'renter' && styles.roleButtonActive]}
              onPress={() => setFormData(prev => ({ ...prev, role: 'renter' }))}
            >
              <Text style={[styles.roleButtonText, formData.role === 'renter' && styles.roleButtonTextActive]}>
                Renter
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.button}
          onPress={handleCompleteRegistration}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Complete Registration</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  countryCode: {
    padding: 15,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: '#f0f0f0',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  phoneInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  linkTextDisabled: {
    color: '#999',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  roleButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  roleButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  roleButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
