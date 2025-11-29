# Arduino Hardware Setup Guide

## Components Required

| Component | Quantity | Specifications |
|-----------|----------|----------------|
| Arduino Uno/Nano | 1 | ATmega328P |
| SIM800L GSM Module | 1 | Quad-band 850/900/1800/1900MHz |
| Neo 6M GPS Module | 1 | With external antenna |
| Relay Module | 1 | 5V, 1-channel |
| Solenoid Lock | 1 | 12V DC |
| Power Supplies | 2 | 5V for Arduino, 12V for solenoid |
| LM2596 Buck Converter | 1 | For SIM800L power (4.2V) |
| Battery | 1 | 12V, 2000mAh+ recommended |
| Breadboard/PCB | 1 | For connections |
| Jumper Wires | - | Male-to-Male, Male-to-Female |

## Circuit Diagram

### SIM800L Connections
```
SIM800L Module    →    Arduino
─────────────────────────────────
TX                →    Pin 10 (RX)
RX                →    Pin 11 (TX)
VCC (3.7-4.2V)    →    Buck Converter Output
GND               →    Common GND
```

**Important**: SIM800L requires 3.7-4.2V and can draw up to 2A during transmission. Use a buck converter!

### GPS Module Connections
```
Neo 6M GPS        →    Arduino
─────────────────────────────────
TX                →    Pin 3 (RX)
RX                →    Pin 4 (TX)
VCC               →    5V
GND               →    GND
```

### Relay Module Connections
```
Relay Module      →    Arduino/Lock
─────────────────────────────────
Signal            →    Pin 7
VCC               →    5V
GND               →    GND
COM               →    +12V (Power supply)
NO (Normally Open)→    Solenoid (+)
Solenoid (-)      →    GND
```

## Assembly Steps

### Step 1: Power Setup
1. Connect 12V battery to buck converter input
2. Set buck converter output to 4.0V for SIM800L
3. Connect 5V regulator for Arduino and GPS
4. Ensure all GND are connected together

### Step 2: SIM800L Setup
1. Insert activated SIM card with data plan
2. Connect antenna
3. Wire as per connections above
4. **Do NOT power from Arduino 5V - use buck converter**

### Step 3: GPS Setup
1. Connect external antenna
2. Wire as per connections above
3. Place antenna with clear sky view

### Step 4: Relay and Lock
1. Wire relay signal to Arduino Pin 7
2. Connect solenoid lock through relay
3. Ensure 12V power supply can handle solenoid current

### Step 5: Arduino Programming
1. Install Arduino IDE
2. Install TinyGPS++ library:
   - Sketch → Include Library → Manage Libraries
   - Search "TinyGPS++"
   - Install by Mikal Hart
3. Open `arduino/cycle_lock_system.ino`
4. Update configuration:
   ```cpp
   const char* LOCK_ID = "LOCK_001";  // Unique ID
   const char* APN = "internet";      // Your carrier APN
   const char* FIREBASE_HOST = "your-project.firebaseio.com";
   ```
5. Select board: Tools → Board → Arduino Uno/Nano
6. Select port: Tools → Port → COM[X]
7. Upload: Sketch → Upload

## Testing

### Test 1: Serial Monitor
1. Open Serial Monitor (115200 baud)
2. You should see:
   ```
   Cycle Lock System Starting...
   Initializing GSM...
   Sending: AT
   OK
   ...
   System Ready!
   ```

### Test 2: GPS Lock
1. Place GPS antenna outdoors
2. Wait 2-5 minutes for first fix
3. Serial Monitor should show:
   ```
   Latitude: 10.936200
   Longitude: 76.744100
   ```

### Test 3: GSM Connection
1. Verify SIM card has data
2. Check Serial Monitor for "GPRS Connected"
3. Watch for HTTP responses

### Test 4: Lock Mechanism
1. Manually set lockStatus in Firebase to "UNLOCK_REQUESTED"
2. Arduino should detect and unlock
3. Relay should click and solenoid should activate

## Troubleshooting

### SIM800L Issues

**Module not responding:**
- Check power supply (needs 4.0V, 2A capable)
- Verify RX/TX not swapped
- Ensure baud rate is 9600
- Check SIM card is inserted correctly

**Can't connect to network:**
- Verify SIM has active data plan
- Check APN settings for your carrier
- Ensure good signal strength
- Try antenna repositioning

**HTTP requests failing:**
- Verify Firebase URL is correct
- Check GPRS is connected (AT+SAPBR=2,1)
- Ensure data is available on SIM

### GPS Issues

**No GPS fix:**
- GPS needs clear sky view
- First fix takes 2-5 minutes
- Check antenna connection
- Verify RX/TX wiring

**Wrong coordinates:**
- Wait for more satellites (need 4+)
- Check GPS module LED is blinking
- Verify baud rate (usually 9600)

### Relay Issues

**Lock not unlocking:**
- Check relay is clicking
- Verify 12V supply to solenoid
- Test relay manually with digitalWrite
- Check relay VCC/GND connections

**Relay stuck on/off:**
- Check relay type (active high/low)
- Verify signal pin connection
- Test with LED first

## Power Consumption

| Component | Current Draw |
|-----------|--------------|
| Arduino Uno | ~50mA |
| GPS Module | ~50mA |
| SIM800L (idle) | ~10mA |
| SIM800L (transmit) | ~2A |
| Relay | ~70mA |
| Solenoid Lock | ~500mA-1A |

**Recommended**: 12V, 3000mAh battery for 8-10 hours operation

## Safety Notes

⚠️ **Warning:**
- Never connect SIM800L directly to Arduino 5V
- Use proper fuses in power lines
- Insulate all connections properly
- Test relay circuit before connecting solenoid
- Keep electronics away from water
- Use heat sinks if components get hot

## Enclosure Recommendations

1. **Weatherproof Box**: IP65 rated
2. **Ventilation**: For heat dissipation
3. **Antenna Ports**: For GPS and GSM antennas
4. **Wire Routing**: Strain relief for cables
5. **Mounting**: Secure to bicycle frame

## Maintenance

- Check battery voltage weekly
- Clean GPS antenna monthly
- Verify SIM data balance
- Test lock mechanism regularly
- Keep firmware updated

---

For more help, refer to component datasheets or contact support.
