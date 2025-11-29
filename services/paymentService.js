import RazorpayCheckout from 'react-native-razorpay';
import { doc, addDoc, collection, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Payment Service for Razorpay Integration
 * Handles payment collection, escrow, and refunds
 */

// Razorpay Configuration
const RAZORPAY_KEY_ID = 'rzp_test_YOUR_KEY_ID'; // Replace with your Razorpay Key ID
const RAZORPAY_KEY_SECRET = 'YOUR_SECRET_KEY'; // Store this securely on backend

/**
 * Create a payment order
 * @param {string} amount - Amount in rupees
 * @param {string} userId - User ID making payment
 * @param {string} cycleId - Cycle ID being rented
 * @param {string} rentalDuration - Rental duration in minutes
 * @returns {Promise<{success: boolean, orderId: string, error: string}>}
 */
export const createPaymentOrder = async (amount, userId, cycleId, rentalDuration) => {
  try {
    // In production, call your backend API to create Razorpay order
    // For now, creating a transaction record in Firestore
    
    const transactionRef = await addDoc(collection(db, 'transactions'), {
      userId,
      cycleId,
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      rentalDuration,
      status: 'created',
      createdAt: new Date().toISOString(),
      paymentMethod: 'razorpay',
    });

    return {
      success: true,
      orderId: transactionRef.id,
      error: null,
    };
  } catch (error) {
    console.error('Error creating payment order:', error);
    return {
      success: false,
      orderId: null,
      error: error.message,
    };
  }
};

/**
 * Process payment through Razorpay
 * @param {number} amount - Amount in rupees
 * @param {string} orderId - Order ID from createPaymentOrder
 * @param {object} userDetails - User details {name, email, phone}
 * @param {string} description - Payment description
 * @returns {Promise<{success: boolean, paymentId: string, error: string}>}
 */
export const processPayment = async (amount, orderId, userDetails, description) => {
  return new Promise((resolve) => {
    const options = {
      description: description || 'Karunya Cycle Rental Payment',
      image: 'https://i.imgur.com/3g7nmJC.png', // Your app logo URL
      currency: 'INR',
      key: RAZORPAY_KEY_ID,
      amount: amount * 100, // Amount in paise
      name: 'Karunya Cycle Rental',
      order_id: orderId, // Optional: Use if you have backend order creation
      prefill: {
        email: userDetails.email || '',
        contact: userDetails.phone || '',
        name: userDetails.name || '',
      },
      theme: { color: '#1e40af' },
    };

    RazorpayCheckout.open(options)
      .then((data) => {
        // Payment successful
        resolve({
          success: true,
          paymentId: data.razorpay_payment_id,
          orderId: data.razorpay_order_id,
          signature: data.razorpay_signature,
          error: null,
        });
      })
      .catch((error) => {
        // Payment failed
        console.error('Payment error:', error);
        resolve({
          success: false,
          paymentId: null,
          error: error.description || 'Payment failed',
        });
      });
  });
};

/**
 * Hold payment (authorize but don't capture)
 * In production, this should be done via backend API
 * @param {string} transactionId - Transaction ID
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<{success: boolean}>}
 */
export const holdPayment = async (transactionId, paymentId) => {
  try {
    const transactionRef = doc(db, 'transactions', transactionId);
    
    await updateDoc(transactionRef, {
      paymentId,
      status: 'authorized', // Payment authorized but not captured
      authorizedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error holding payment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Capture held payment after successful rental completion
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<{success: boolean}>}
 */
export const capturePayment = async (transactionId) => {
  try {
    const transactionRef = doc(db, 'transactions', transactionId);
    
    // In production, call backend API to capture payment via Razorpay API
    // For now, just updating status in Firestore
    
    await updateDoc(transactionRef, {
      status: 'captured',
      capturedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error capturing payment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Refund payment (in case of issues)
 * @param {string} transactionId - Transaction ID
 * @param {number} amount - Amount to refund (optional, defaults to full)
 * @param {string} reason - Refund reason
 * @returns {Promise<{success: boolean, refundId: string}>}
 */
export const refundPayment = async (transactionId, amount = null, reason = '') => {
  try {
    const transactionRef = doc(db, 'transactions', transactionId);
    const transactionDoc = await getDoc(transactionRef);
    
    if (!transactionDoc.exists()) {
      return { success: false, error: 'Transaction not found' };
    }

    const transactionData = transactionDoc.data();
    const refundAmount = amount || transactionData.amount;

    // In production, call backend API to process refund via Razorpay
    // For now, creating refund record in Firestore
    
    const refundRef = await addDoc(collection(db, 'refunds'), {
      transactionId,
      originalAmount: transactionData.amount,
      refundAmount,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    await updateDoc(transactionRef, {
      status: 'refunded',
      refundId: refundRef.id,
      refundedAt: new Date().toISOString(),
      refundReason: reason,
    });

    return { success: true, refundId: refundRef.id };
  } catch (error) {
    console.error('Error processing refund:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get transaction details
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<{success: boolean, transaction: object}>}
 */
export const getTransaction = async (transactionId) => {
  try {
    const transactionRef = doc(db, 'transactions', transactionId);
    const transactionDoc = await getDoc(transactionRef);
    
    if (transactionDoc.exists()) {
      return {
        success: true,
        transaction: { id: transactionDoc.id, ...transactionDoc.data() },
      };
    } else {
      return { success: false, error: 'Transaction not found' };
    }
  } catch (error) {
    console.error('Error getting transaction:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify payment signature (for security)
 * This should be done on backend in production
 * @param {string} orderId - Order ID
 * @param {string} paymentId - Payment ID
 * @param {string} signature - Razorpay signature
 * @returns {boolean}
 */
export const verifyPaymentSignature = (orderId, paymentId, signature) => {
  // In production, verify signature on backend using Razorpay secret
  // const crypto = require('crypto');
  // const expectedSignature = crypto
  //   .createHmac('sha256', RAZORPAY_KEY_SECRET)
  //   .update(orderId + '|' + paymentId)
  //   .digest('hex');
  // return expectedSignature === signature;
  
  return true; // Placeholder - implement on backend
};

/**
 * Calculate platform fee (if applicable)
 * @param {number} amount - Rental amount
 * @returns {object} {ownerAmount, platformFee, total}
 */
export const calculateFees = (amount) => {
  const platformFeePercent = 10; // 10% platform fee
  const platformFee = Math.round((amount * platformFeePercent) / 100);
  const ownerAmount = amount - platformFee;
  
  return {
    total: amount,
    ownerAmount,
    platformFee,
  };
};
