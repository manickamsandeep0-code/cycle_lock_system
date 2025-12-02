import { 
  signInWithPhoneNumber, 
  PhoneAuthProvider,
  signInWithCredential,
  RecaptchaVerifier,
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { setUserData, setUserRole, clearUserData } from '../utils/storage';

// Simplified phone auth for React Native (without reCAPTCHA)
// In production, use Firebase Admin SDK on backend for security

export const sendOTP = async (phoneNumber) => {
  try {
    // Format phone number (ensure +91 prefix for India)
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+91${phoneNumber}`;

    // Note: For React Native, we need a different approach
    // This is a placeholder - actual implementation depends on your setup
    // You may need to use Firebase Admin SDK on a backend server
    
    throw new Error('Phone auth requires backend implementation for security');
    
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
};

export const verifyOTP = async (verificationId, code) => {
  try {
    const credential = PhoneAuthProvider.credential(verificationId, code);
    const userCredential = await signInWithCredential(auth, credential);
    return userCredential.user;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

export const signInWithPhone = async (phoneNumber, password) => {
  try {
    // Temporary: Using phone number as lookup in Firestore
    // In production, implement proper phone auth with OTP
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+91${phoneNumber}`;
    
    // Check if user exists in Firestore
    const usersRef = doc(db, 'users', formattedPhone.replace('+', ''));
    const userDoc = await getDoc(usersRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found. Please register first.');
    }
    
    const userData = { id: userDoc.id, ...userDoc.data() };
    
    // Store user data locally
    await setUserData(userData);
    await setUserRole(userData.role);
    
    return userData;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export const registerUser = async (phoneNumber, userData) => {
  try {
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+91${phoneNumber}`;
    
    const userId = formattedPhone.replace('+', '');
    const usersRef = doc(db, 'users', userId);
    
    // Check if user already exists
    const existingUser = await getDoc(usersRef);
    if (existingUser.exists()) {
      throw new Error('User already registered with this phone number');
    }
    
    // Create new user document
    const newUser = {
      ...userData,
      phoneNumber: formattedPhone,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    
    await setDoc(usersRef, newUser);
    
    // Store user data locally
    const userDataWithId = { id: userId, ...newUser };
    await setUserData(userDataWithId);
    await setUserRole(newUser.role);
    
    return userDataWithId;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    await clearUserData();
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};
