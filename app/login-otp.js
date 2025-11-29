import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { app } from '../config/firebase';
import { sendOTP, verifyOTP, createUserProfile, saveAuthUser } from '../services/authService';
import { saveUserRole } from '../utils/storage';

export default function LoginOTP() {
  const router = useRouter();
  const recaptchaVerifier = useRef(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = async () => {
    if (!phoneNumber.trim() || phoneNumber.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const result = await sendOTP(phoneNumber, recaptchaVerifier.current);
      
      if (result.success) {
        setConfirmationResult(result.confirmationResult);
        setOtpSent(true);
        Alert.alert('Success', 'OTP sent to your phone number');
      } else {
        Alert.alert('Error', result.error || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOTP(confirmationResult, otp);
      
      if (result.success) {
        // Check if user exists in Firestore
        const profileResult = await createUserProfile(
          result.user.uid,
          result.user.phoneNumber,
          { role: 'renter' } // Default role, will be updated if user exists
        );

        if (profileResult.success) {
          if (profileResult.isNew) {
            // New user - redirect to complete registration
            Alert.alert(
              'Welcome!',
              'Please complete your registration',
              [{ text: 'OK', onPress: () => router.replace('/register-complete') }]
            );
          } else {
            // Existing user - save and redirect
            await saveAuthUser(result.user, profileResult.userData);
            await saveUserRole(profileResult.userData.role);

            if (profileResult.userData.role === 'owner') {
              router.replace('/owner/dashboard');
            } else {
              router.replace('/map');
            }
          }
        } else {
          Alert.alert('Error', 'Failed to create user profile');
        }
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setOtp('');
    setOtpSent(false);
    setConfirmationResult(null);
    await handleSendOTP();
  };

  return (
    <View style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={app.options}
        attemptInvisibleVerification
      />

      <View style={styles.content}>
        <Text style={styles.title}>🚴 Karunya Cycle Rental</Text>
        <Text style={styles.subtitle}>Secure Login with OTP</Text>

        {!otpSent ? (
          <>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phoneInputContainer}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter 10-digit number"
                keyboardType="phone-pad"
                maxLength={10}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                editable={!loading}
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Enter OTP</Text>
            <Text style={styles.hint}>Sent to +91 {phoneNumber}</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="Enter 6-digit OTP"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              editable={!loading}
            />

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Verify & Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkButton}
              onPress={handleResendOTP}
              disabled={loading}
            >
              <Text style={styles.linkText}>Resend OTP</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => {
                setOtpSent(false);
                setOtp('');
                setConfirmationResult(null);
              }}
              disabled={loading}
            >
              <Text style={styles.linkText}>Change Number</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>New user? </Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.linkTextBold}>Register Here</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e40af',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    marginBottom: 24,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  phoneInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    fontSize: 20,
    textAlign: 'center',
    backgroundColor: '#ffffff',
    marginBottom: 24,
    letterSpacing: 8,
  },
  button: {
    backgroundColor: '#1e40af',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    padding: 8,
    alignItems: 'center',
  },
  linkText: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '500',
  },
  linkTextBold: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
