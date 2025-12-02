# Hardware Wiring Diagram - Cycle Lock System

## Complete Circuit Connection

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CYCLE LOCK SYSTEM WIRING                         │
└─────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │  7.4V Battery    │
                    │  (2x 18650)      │
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
            ┌───────▼────────┐  ┌─────▼──────┐
            │  Step-Up to    │  │  Step-Down │
            │  12V (MT3608)  │  │  to 5V     │
            └───────┬────────┘  └─────┬──────┘
                    │                 │
                    │                 │
         ┌──────────┴──────┐    ┌────┴────────────────┐
         │                 │    │                     │
    ┌────▼─────┐    ┌──────▼────▼──┐         ┌───────▼────────┐
    │ Solenoid │    │  5V Relay    │         │  Arduino Nano  │
    │  Lock    │    │   Module     │         │                │
    │  (12V)   │    │              │         │  Pin 10 → TX   │────┐
    └──────────┘    │  COM → 12V+  │         │  Pin 11 → RX   │    │
                    │  NO → Lock+  │         │  Pin 7 → Relay │────┤
                    │  IN ← Pin 7  │         │  Pin 4 ← GPS_TX│    │
                    └──────────────┘         │  Pin 3 → GPS_RX│    │
                                            │  A0 ← Battery  │    │
                                            │  GND → GND     │────┤
                                            └────────────────┘    │
                                                                 │
                        7.4V (direct)                            │
                             │                                   │
                    ┌────────▼───────────┐                       │
                    │   SIM800L Module   │                       │
                    │                    │                       │
                    │  VCC ← 3.7-4.2V    │                       │
                    │  TX → Pin 10       │───────────────────────┘
                    │  RX ← Pin 11       │
                    │  GND → GND         │───────────────────────┐
                    │  RESET → Pin 9     │                       │
                    └────────────────────┘                       │
                                                                 │
                    ┌────────────────────┐                       │
                    │  GPS Module        │                       │
                    │  (NEO-6M)          │                       │
                    │                    │                       │
                    │  VCC ← 5V          │                       │
                    │  TX → Pin 4        │                       │
                    │  RX ← Pin 3        │                       │
                    │  GND → GND         │───────────────────────┘
                    └────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   BATTERY MONITORING CIRCUIT                        │
└─────────────────────────────────────────────────────────────────────┘

    7.4V Battery
        │
        ├──────────┬───────── To Power Distribution
        │          │
        │       ┌──▼──┐
        │       │ 10K │  Resistor R1
        │       └──┬──┘
        │          │
        └──────────┤──────────► Arduino A0 (Analog Input)
                   │
                ┌──▼──┐
                │ 10K │  Resistor R2
                └──┬──┘
                   │
                  GND

Formula: Measured Voltage = (A0 Reading / 1023) × 5V × 2
         (×2 because of voltage divider)

┌─────────────────────────────────────────────────────────────────────┐
│                    OPTIONAL: SOLAR CHARGING                         │
└─────────────────────────────────────────────────────────────────────┘

    6V 1W Solar Panel
        │
        ▼
    ┌───────────────┐
    │  TP4056       │
    │  Charging     │
    │  Module       │
    │               │
    │  OUT+ → Bat+  │
    │  OUT- → Bat-  │
    └───────────────┘
        │
        ▼
    7.4V Battery Pack
```

## Pin Connections Summary

### Arduino Nano Pins:
```
Digital Pins:
  Pin 3  → GPS Module RX
  Pin 4  ← GPS Module TX
  Pin 7  → Relay Module IN
  Pin 9  → SIM Module RESET
  Pin 10 ← SIM Module TX
  Pin 11 → SIM Module RX

Analog Pins:
  A0     ← Battery Voltage (via voltage divider)

Power:
  5V     → GPS Module VCC
  GND    → All GND connections
```

### SIM800L Module Pins:
```
VCC    ← 3.7V to 4.2V (direct from battery or regulator)
GND    → Common Ground
TX     → Arduino Pin 10
RX     ← Arduino Pin 11
RESET  ← Arduino Pin 9
NET    → LED (optional, shows network status)
```

### Relay Module Pins:
```
VCC    ← 5V from Arduino
GND    → Common Ground
IN     ← Arduino Pin 7 (control signal)
COM    ← 12V+ from step-up converter
NO     → Solenoid Lock +ve
NC     → (not used)
```

### GPS Module (NEO-6M) Pins:
```
VCC    ← 5V from Arduino
GND    → Common Ground
TX     → Arduino Pin 4
RX     ← Arduino Pin 3
```

## Power Flow Chart

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  18650 Cell 1 (3.7V)  ─┬─  18650 Cell 2 (3.7V)             │
│                        │                                     │
│           Series Connection = 7.4V Total                    │
│                        │                                     │
│            ┌───────────┴────────────┐                       │
│            │                        │                       │
│    ┌───────▼──────┐        ┌───────▼──────┐               │
│    │  Step-Up     │        │  Step-Down   │               │
│    │  MT3608      │        │  LM2596      │               │
│    │  Output: 12V │        │  Output: 5V  │               │
│    └───────┬──────┘        └───────┬──────┘               │
│            │                        │                       │
│      ┌─────▼─────┐          ┌──────▼──────────┐           │
│      │ Solenoid  │          │  Arduino Nano   │           │
│      │ (12V 1A)  │          │  GPS Module     │           │
│      └───────────┘          │  Relay Module   │           │
│                             └─────────────────┘           │
│                                                            │
│        Direct 7.4V                                        │
│            │                                              │
│      ┌─────▼──────┐                                      │
│      │  SIM800L   │                                      │
│      │  (3.4-4.4V)│                                      │
│      └────────────┘                                      │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

## Current Consumption Analysis

### Idle Mode (Most of the time):
```
Component          Current    Power
────────────────────────────────────
Arduino Nano       20mA       0.1W
SIM800L (idle)     100mA      0.4W
GPS Module         40mA       0.2W
────────────────────────────────────
Total Idle:        160mA      0.7W
```

### Active Mode (Checking commands, sending data):
```
Component          Current    Power
────────────────────────────────────
Arduino Nano       50mA       0.25W
SIM800L (transmit) 2000mA     7.4W (peak)
GPS Module         40mA       0.2W
────────────────────────────────────
Total Active:      2090mA     7.85W (peak)
```

### Unlock/Lock Operation (1-2 seconds):
```
Component          Current    Power
────────────────────────────────────
Solenoid Lock      1500mA     18W (peak at 12V)
Other components   160mA      0.7W
────────────────────────────────────
Total Peak:        1660mA     18.7W
```

## Battery Life Calculation

### With 2600mAh Battery (7.4V):
```
Energy Capacity = 2600mAh × 7.4V = 19.24Wh

Typical Usage Pattern (24 hours):
- Idle: 23.5 hours × 0.7W = 16.45Wh
- Active (checking): 0.5 hours × 7.85W = 3.93Wh
- Total per day: 20.38Wh

Battery Life = 19.24Wh / 20.38Wh ≈ 0.94 days (22-23 hours)

With Power Optimization (sleep mode):
- Check every 30s instead of 5s
- Reduces active time to ~10 minutes/day
- Battery Life: 2-3 days
```

## Enclosure Recommendations

### Weatherproof Box:
```
Size: 15cm × 10cm × 5cm minimum
Material: ABS plastic (IP65 rated)
Features:
  - Cable glands for solenoid wire
  - Mounting holes for cycle frame
  - Ventilation (but waterproof)
  - Transparent window for status LEDs
```

### Component Layout Inside Box:
```
┌─────────────────────────────────┐
│                                 │
│  ┌──────┐  ┌────────┐          │
│  │ Bat  │  │Arduino │  ┌────┐  │
│  │ Pack │  │        │  │SIM │  │
│  └──────┘  └────────┘  └────┘  │
│                                 │
│  ┌──────┐  ┌────────┐          │
│  │Step  │  │ Relay  │  ┌────┐  │
│  │ Up/Dn│  │ Module │  │GPS │  │
│  └──────┘  └────────┘  └────┘  │
│                                 │
│         Cable Out to Solenoid   │
│              │                  │
└──────────────┼──────────────────┘
               ▼
          To Lock on Frame
```

## Safety Features

### 1. Reverse Polarity Protection:
```
Add diode (1N4007) in series with battery:
Battery + → Diode → System +
```

### 2. Overcurrent Protection:
```
Add 3A fuse between battery and system
```

### 3. Voltage Regulator for SIM:
```
Use AMS1117-3.3 or similar to ensure stable 3.7-4V
Prevents damage from voltage spikes
```

### 4. Tamper Switch:
```
Reed switch on enclosure lid
If opened: Send alert to Firebase
```

## Testing Checklist

- [ ] Battery voltage: 7.4V ± 0.3V
- [ ] 5V rail: 4.9-5.1V
- [ ] 12V rail: 11.8-12.2V
- [ ] SIM module powers on (LED blinks)
- [ ] GPS module gets fix (LED steady)
- [ ] Arduino uploads code successfully
- [ ] Serial monitor shows GPRS connection
- [ ] Relay clicks when testing lock/unlock
- [ ] Solenoid extends/retracts smoothly
- [ ] Firebase command received within 10 seconds
- [ ] Battery monitoring shows correct percentage
- [ ] All connections secure (no loose wires)
- [ ] Enclosure waterproof (spray test)
- [ ] Mounting secure on cycle frame

## Mounting on Cycle

```
    Cycle Frame
         │
    ┌────┴────┐
    │ Seat    │
    │ Post    │
    └────┬────┘
         │
    ┌────▼─────────────┐
    │  Enclosure Box   │  ← Zip ties or U-bolt
    │  (Lock Control)  │
    └──────────────────┘
         │
         │ Cable (30cm)
         │
    ┌────▼─────┐
    │ Solenoid │  ← Mounted on wheel spoke
    │  Lock    │     or frame near wheel
    └──────────┘
```

---

## Support & Resources

### Datasheets:
- SIM800L: https://simcom.ee/documents/SIM800L/
- SIM7600: https://www.simcom.com/product/SIM7600.html
- MT3608: Step-up converter datasheet
- LM2596: Step-down converter datasheet

### Tutorials:
- TinyGSM Library: https://github.com/vshymanskyy/TinyGSM
- Firebase with Arduino: https://firebase.google.com/docs/database/arduino

### Where to Buy (India):
- Robu.in
- ElectronicSpices.com
- Amazon.in
- Local electronics markets (Bangalore: SP Road, Mumbai: Lamington Road)
