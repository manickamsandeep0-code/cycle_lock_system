# Razorpay Test Mode Setup (No Play Store Required)

## For Development & Testing Only

You **DO NOT** need to publish to Play Store to test payments. Razorpay provides a complete test environment.

---

## Step-by-Step Setup

### 1. Create Razorpay Account (Free)

1. Go to: https://razorpay.com/
2. Click "Sign Up"
3. Enter email, phone, create password
4. Verify email and phone
5. **No KYC required for test mode**

### 2. Enable Test Mode

1. Login to Razorpay Dashboard
2. Look at **top-right corner** - Toggle says "Test Mode" or "Live Mode"
3. Make sure it's set to **"Test Mode"** (Usually default for new accounts)
4. Test mode has a orange/yellow banner at top

### 3. Generate Test API Keys

1. In Razorpay Dashboard, go to: **Settings** (bottom-left)
2. Click: **API Keys** (under "Developer" section)
3. You'll see: **Test Key** and **Live Key** sections
4. Under **Test Key**, click: **"Generate Test Key"**
5. Copy the **"Key ID"** (looks like: `rzp_test_AbCdEf123456`)
6. Copy the **"Key Secret"** (keep this VERY secret - you'll need it later for backend)

### 4. Update Your App Code

Open: `services/paymentService.js`

Replace this line:
```javascript
const RAZORPAY_KEY_ID = 'rzp_test_YOUR_KEY_ID';
```

With your actual test key:
```javascript
const RAZORPAY_KEY_ID = 'rzp_test_AbCdEf123456'; // Your key from step 3
```

### 5. Testing Payments

When you rent a cycle in the app, use these **test card details**:

#### Test Credit Card (Always Succeeds):
- **Card Number**: `4111 1111 1111 1111`
- **CVV**: `123`
- **Expiry**: Any future date (e.g., `12/25`)
- **Name**: Any name

#### Test Debit Card (Always Succeeds):
- **Card Number**: `5267 3181 8797 5449`
- **CVV**: `123`
- **Expiry**: Any future date

#### Test UPI (Always Succeeds):
- **UPI ID**: `success@razorpay`

#### Test Card (Always Fails - for testing error handling):
- **Card Number**: `4111 1111 1111 1234`

### 6. View Test Payments

1. Go to Razorpay Dashboard → **Transactions** → **Payments**
2. All test payments will show here with status (Success/Failed)
3. You can see payment details, refund them, etc.
4. **Test payments are FREE** - No actual money is charged

---

## Important Notes

### ✅ What You CAN Do in Test Mode:
- Test complete payment flow
- Test card payments, UPI, netbanking
- Test refunds and cancellations
- Test webhooks (for backend integration)
- Unlimited free test transactions
- **No Play Store needed**
- **No KYC verification needed**

### ❌ What You CANNOT Do in Test Mode:
- Accept real money
- Get real payouts to bank account
- Use in production app

---

## When to Switch to Live Mode?

Switch to **Live Mode** only when:
1. ✅ App is fully tested
2. ✅ Published on Google Play Store
3. ✅ KYC verification completed (Razorpay will ask for business documents)
4. ✅ Bank account linked for settlements
5. ✅ Backend API implemented for signature verification

---

## Testing Workflow

### Test a Successful Payment:
1. Open your app
2. Select a cycle
3. Choose rental duration
4. Click "Rent Now"
5. Razorpay payment page opens
6. Select "Card"
7. Enter: `4111 1111 1111 1111`, CVV: `123`, Expiry: `12/25`
8. Click "Pay"
9. ✅ Payment succeeds
10. Cycle unlocks
11. Check Razorpay Dashboard → See payment listed

### Test a Failed Payment:
1. Follow same steps
2. Use card: `4111 1111 1111 1234`
3. ❌ Payment fails
4. App shows error
5. Rental cancelled
6. User can try again

---

## Current Limitations (OK for Development)

### 🔶 Payment is Client-Side Only
**What this means:**
- Payment processing happens in the app
- No server verification
- **Security Risk**: Users could potentially fake payments

**Why it's OK for now:**
- Testing functionality
- No real money involved
- Will be fixed before production

**What needs to be added later:**
- Node.js/Python backend API
- Signature verification on server
- Webhook handling

### 🔶 No Backend Order Creation
**What this means:**
- Orders created in Firestore, not Razorpay server
- Can't use Razorpay's order tracking features

**Why it's OK for now:**
- Simpler setup
- Faster development
- Works for testing

**What needs to be added later:**
- Backend API endpoint: `POST /create-order`
- Backend API endpoint: `POST /verify-payment`
- Proper order IDs from Razorpay

---

## Example: How Payment Works Now (Development)

### User Flow:
1. User: Rent cycle for ₹30
2. App: Creates transaction in Firestore
3. App: Opens Razorpay payment dialog
4. User: Enters test card `4111 1111 1111 1111`
5. Razorpay: Processes test payment
6. Razorpay: Returns success to app
7. App: Updates Firestore (rental active)
8. App: Unlocks cycle via IoT

### Database Records:
```javascript
// Firestore: transactions/{transactionId}
{
  userId: "user123",
  cycleId: "cycle456",
  amount: 3000, // in paise (₹30)
  status: "authorized",
  paymentId: "pay_xyz789", // From Razorpay
  createdAt: "2025-11-29T10:30:00Z"
}

// Firestore: cycles/{cycleId}
{
  status: "rented",
  currentRenter: "user123",
  transactionId: "trans_abc123"
}
```

---

## Troubleshooting

### "Invalid API Key" Error
- Check you copied the full key (starts with `rzp_test_`)
- Check you're in Test Mode in dashboard
- Regenerate key if needed

### Payment Dialog Doesn't Open
- Check `react-native-razorpay` is installed
- Rebuild the app: `eas build`
- Check console for errors

### Payment Succeeds but Cycle Doesn't Unlock
- Check Firebase connection
- Check lock service is working
- Check Arduino is online

### Can't See Payments in Dashboard
- Make sure you're viewing Test Mode dashboard
- Check Transactions → Payments section
- Refresh the page

---

## Cost Information

### Test Mode (Current):
- **Cost**: ₹0 (FREE)
- **Transactions**: Unlimited
- **Duration**: Forever

### Live Mode (Production - Future):
- **Transaction Fee**: 2% + GST
- **Example**: On ₹30 rental = ₹0.70 fee
- **Settlement**: T+3 days to bank account

---

## Next Steps After Testing

### Before Going Live:
1. [ ] Complete all app testing
2. [ ] Build backend API for signature verification
3. [ ] Publish app to Play Store (beta testing first)
4. [ ] Complete Razorpay KYC verification
5. [ ] Switch to Live Mode keys
6. [ ] Test with small real amounts first
7. [ ] Monitor for issues
8. [ ] Scale up

### Backend API Needed (Critical for Production):
```javascript
// POST /api/create-order
app.post('/create-order', async (req, res) => {
  const { amount } = req.body;
  
  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: 'INR',
    receipt: 'order_' + Date.now()
  });
  
  res.json({ orderId: order.id });
});

// POST /api/verify-payment
app.post('/verify-payment', async (req, res) => {
  const { orderId, paymentId, signature } = req.body;
  
  const isValid = verifySignature(orderId, paymentId, signature);
  
  if (isValid) {
    // Update Firestore
    // Unlock cycle
    res.json({ success: true });
  } else {
    res.json({ success: false, error: 'Invalid signature' });
  }
});
```

---

## Summary

**For NOW (Development):**
- ✅ Use Test Mode
- ✅ Use test API keys
- ✅ Use test cards
- ✅ No Play Store needed
- ✅ No KYC needed
- ✅ 100% FREE

**For LATER (Production):**
- ⏳ Build backend API
- ⏳ Complete KYC
- ⏳ Publish to Play Store
- ⏳ Switch to Live keys
- ⏳ Handle real money

**You're good to test everything now without Play Store!** 🎉

