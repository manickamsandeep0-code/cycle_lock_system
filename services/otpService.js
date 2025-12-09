import { collection, query, where, getDocs, setDoc, doc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Simple Firestore-based OTP implementation for Expo/React Native
// This stores OTPs in Firestore for development/testing. For production,
// use a backend that sends SMS via a provider (Twilio/Razorpay etc.) and
// verifies codes securely.

const OTP_COLLECTION = 'otpRequests';
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

export const sendOTP = async (phoneNumber) => {
  try {
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    // For dev convenience, allow a few test numbers with static codes
    const testNumbers = {
      '+911234567890': '123456'
    };

    const code = testNumbers[formattedPhone] || generateCode();

    const now = Date.now();
    const docRef = doc(db, OTP_COLLECTION, formattedPhone.replace(/\+/g, '')); // id by phone

    await setDoc(docRef, {
      phoneNumber: formattedPhone,
      code,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
      verified: false
    });

    // Log code to console for development (replace with SMS send in prod)
    console.log(`OTP for ${formattedPhone}: ${code}`);

    return { success: true, message: 'OTP generated and stored', phoneNumber: formattedPhone };
  } catch (error) {
    console.error('Error generating OTP:', error);
    throw new Error('Failed to generate OTP');
  }
};

export const verifyOTP = async (phoneNumber, code) => {
  try {
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
    const docId = formattedPhone.replace(/\+/g, '');
    const ref = doc(db, OTP_COLLECTION, docId);
    const otpDoc = await getDoc(ref);

    if (!otpDoc.exists()) {
      throw new Error('No OTP request found for this number');
    }

    const data = otpDoc.data();
    if (data.verified) {
      throw new Error('OTP already used');
    }

    const now = Date.now();
    if (new Date(data.expiresAt).getTime() < now) {
      throw new Error('OTP has expired');
    }

    if (data.code !== code) {
      throw new Error('Invalid OTP');
    }

    // Mark verified
    await setDoc(ref, { ...data, verified: true }, { merge: true });

    // Check if user exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNumber', '==', formattedPhone));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      return { success: true, uid: userDoc.id, phoneNumber: formattedPhone };
    }

    // Create placeholder user doc and return its id so frontend can complete profile
    const newUserRef = await addDoc(usersRef, {
      phoneNumber: formattedPhone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return { success: true, uid: newUserRef.id, phoneNumber: formattedPhone };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

export const resendOTP = async (phoneNumber) => {
  return await sendOTP(phoneNumber);
};

export const checkUserExists = async (uid) => {
  try {
    if (!uid) return false;
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
