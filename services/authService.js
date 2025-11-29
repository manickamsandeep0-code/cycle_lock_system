import { 
  getAuth, 
  signInWithPhoneNumber, 
  PhoneAuthProvider,
  signInWithCredential,
  RecaptchaVerifier 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const auth = getAuth();

// Store auth state
export const saveAuthUser = async (user, userData) => {
  await AsyncStorage.setItem('authUser', JSON.stringify({
    uid: user.uid,
    phoneNumber: user.phoneNumber,
    ...userData
  }));
};

export const getAuthUser = async () => {
  const data = await AsyncStorage.getItem('authUser');
  return data ? JSON.parse(data) : null;
};

export const clearAuthUser = async () => {
  await AsyncStorage.removeItem('authUser');
  await AsyncStorage.removeItem('userRole');
  await auth.signOut();
};

// Send OTP
export const sendOTP = async (phoneNumber, recaptchaVerifier) => {
  try {
    // Ensure phone number has country code
    const formattedPhone = phoneNumber.startsWith('+91') 
      ? phoneNumber 
      : `+91${phoneNumber}`;
    
    const confirmationResult = await signInWithPhoneNumber(
      auth, 
      formattedPhone, 
      recaptchaVerifier
    );
    
    return { success: true, confirmationResult };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return { success: false, error: error.message };
  }
};

// Verify OTP and sign in
export const verifyOTP = async (confirmationResult, otp) => {
  try {
    const credential = await confirmationResult.confirm(otp);
    return { success: true, user: credential.user };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, error: 'Invalid OTP. Please try again.' };
  }
};

// Create or get user profile
export const createUserProfile = async (uid, phoneNumber, userData) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // User exists, return existing data
      return { success: true, userData: { id: uid, ...userSnap.data() }, isNew: false };
    } else {
      // New user, create profile
      const newUser = {
        phoneNumber,
        role: userData.role,
        name: userData.name,
        email: userData.email || '',
        studentId: userData.studentId || '',
        createdAt: new Date().toISOString(),
        isVerified: false,
        status: 'active'
      };
      
      await setDoc(userRef, newUser);
      return { success: true, userData: { id: uid, ...newUser }, isNew: true };
    }
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

// Get current authenticated user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Check if user is authenticated
export const isAuthenticated = async () => {
  const user = await getAuthUser();
  return !!user && !!auth.currentUser;
};
