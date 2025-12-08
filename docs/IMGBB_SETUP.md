# ImgBB Free Image Hosting Setup

ImgBB provides **free image hosting** without requiring a credit card. Perfect for storing damage report photos.

## Why ImgBB?

- ✅ **100% Free** - No credit card required
- ✅ **Unlimited bandwidth** on free tier
- ✅ **Direct image URLs** - Works across all devices
- ✅ **Fast CDN** - Images load quickly
- ✅ **No expiration** - Images stored permanently
- ✅ **Easy API** - Simple REST API

## Get Your Free API Key (2 minutes)

1. **Go to ImgBB API page:**
   - Visit: https://api.imgbb.com/

2. **Sign up for free:**
   - Click "Get API Key" or "Sign Up"
   - Use email/Google/Facebook to register
   - Verify your email

3. **Get your API key:**
   - After login, you'll see your API key
   - Copy the key (looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

4. **Add to your app:**
   - Open `services/damageReportService.js`
   - Replace line 7:
     ```javascript
     const IMGBB_API_KEY = 'YOUR_API_KEY_HERE';
     ```

## Free Tier Limits

- **Storage:** Unlimited
- **Bandwidth:** Unlimited
- **Upload limit:** 32 MB per image
- **Rate limit:** Reasonable (plenty for our use case)

For this app with ~500 damage reports/year, ImgBB free tier is more than enough.

## Current Status

The app is already configured with a **demo API key**. It works, but has shared rate limits.

**For production, get your own key** (takes 2 minutes) for better reliability.

## Alternative: Firebase Storage

If you later enable Firebase Storage (requires Blaze plan with credit card verification):

1. Uncomment Firebase Storage code in `damageReportService.js`
2. Comment out ImgBB code
3. Firebase Storage is also free under 5GB

For now, **ImgBB is the simplest solution** with no credit card needed.
