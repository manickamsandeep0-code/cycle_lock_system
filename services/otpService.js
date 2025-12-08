import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Store verification ID temporarily
let confirmationResult = null;

export const sendOTP = async (phoneNumber) => {
  try {
    // Format phone number (ensure +91 prefix for India)
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+91${phoneNumber}`;

    console.log('Sending OTP to:', formattedPhone);

    // For React Native Expo, we use invisible reCAPTCHA
    // Note: In production, you should implement this on a backend server for better security
    
    // Firebase phone auth
    confirmationResult = await signInWithPhoneNumber(auth, formattedPhone);
    
    return {
      success: true,
      verificationId: confirmationResult.verificationId,
      message: 'OTP sent successfully'
    };
  } catch (error) {
    console.error('Error sending OTP:', error);
    
    // Handle specific errors
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('Invalid phone number format');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many requests. Please try again later.');
    } else if (error.code === 'auth/quota-exceeded') {
      throw new Error('SMS quota exceeded. Please try again later.');
    }
    
    throw new Error(error.message || 'Failed to send OTP');
  }
};

export const verifyOTP = async (otp) => {
  try {
    if (!confirmationResult) {
      throw new Error('No OTP request found. Please request OTP again.');
    }

    // Verify the OTP code
    const result = await confirmationResult.confirm(otp);
    const user = result.user;

    console.log('OTP verified successfully:', user.uid);

    return {
      success: true,
      uid: user.uid,
      phoneNumber: user.phoneNumber
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('Invalid OTP. Please check and try again.');
    } else if (error.code === 'auth/code-expired') {
      throw new Error('OTP has expired. Please request a new one.');
    }
    
    throw new Error(error.message || 'Failed to verify OTP');
  }
};

export const resendOTP = async (phoneNumber) => {
  // Reset confirmation result and send new OTP
  confirmationResult = null;
  return await sendOTP(phoneNumber);
};

export const checkUserExists = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists();
  } catch (error) {
    console.error('Error checking user:', error);
    return false;
  }
};

export const createUserProfile = async (uid, userData) => {
  try {
    await setDoc(doc(db, 'users', uid), {
      ...userData,
      uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw new Error('Failed to create user profile');
  }
};
