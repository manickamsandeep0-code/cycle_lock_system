# APN Settings for Indian Mobile Carriers

Update the Arduino code with the correct APN for your SIM card's network.

## Major Indian Carriers

### Airtel
```cpp
const char* APN = "airtelgprs.com";
```

### Jio (Reliance Jio)
```cpp
const char* APN = "jionet";
```

### Vi (Vodafone Idea)
```cpp
const char* APN = "www";
// Alternative: "portalnmms"
```

### BSNL
```cpp
const char* APN = "bsnlnet";
// For 3G: "bsnl3g"
```

### Aircel
```cpp
const char* APN = "aircelgprs";
```

### MTNL
```cpp
const char* APN = "mtnl.net";
```

## How to Find Your APN

### Method 1: Phone Settings
1. Go to Settings → Mobile Networks → Access Point Names
2. Look for the active APN
3. Note the "APN" field value

### Method 2: Carrier Website
Visit your carrier's website and search for "APN settings"

### Method 3: Call Customer Care
Contact your carrier's customer support and ask for data APN

## Testing APN Connection

After uploading code to Arduino:

1. Open Serial Monitor (9600 baud)
2. Look for these messages:
   ```
   AT+SAPBR=3,1,"APN","your-apn"
   OK
   
   AT+SAPBR=1,1
   OK
   
   AT+SAPBR=2,1
   +SAPBR: 1,1,"10.xxx.xxx.xxx"
   ```

3. If you see an IP address, connection is successful!

## Troubleshooting

### "ERROR" or No Response
- Wrong APN setting
- SIM card not activated for data
- No network coverage
- Check SIM800L power supply

### "CME ERROR: 3"
- SIM card not inserted properly
- PIN lock enabled (disable in phone first)

### Connection Drops
- Weak signal strength
- Insufficient power supply to SIM800L
- Check antenna connection

## Note
Make sure your SIM card:
- ✅ Has an active data plan
- ✅ PIN lock is disabled
- ✅ Is inserted correctly in SIM800L
- ✅ Is from a carrier with good coverage in your area
