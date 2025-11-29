/*
 * Cycle Lock System - Arduino Code
 * Hardware: Arduino Uno/Nano, SIM800L GSM Module, Neo 6M GPS Module, Relay for Solenoid Lock
 * 
 * Connections:
 * SIM800L: RX -> Pin 10, TX -> Pin 11
 * GPS: RX -> Pin 4, TX -> Pin 3
 * Relay: Signal -> Pin 7
 */

#include <SoftwareSerial.h>
#include <TinyGPS++.h>

// Pin definitions
#define GSM_RX 10
#define GSM_TX 11
#define GPS_RX 4
#define GPS_TX 3
#define RELAY_PIN 7

// Configuration
const char* LOCK_ID = "LOCK_001";  // CHANGE THIS TO YOUR UNIQUE LOCK ID
const char* APN = "internet";       // Your mobile network APN
const char* FIREBASE_HOST = "YOUR_PROJECT_ID.firebaseio.com";  // Firebase Realtime Database URL
const int UPDATE_INTERVAL = 10000;  // Send location every 10 seconds

// Software Serial for GSM and GPS
SoftwareSerial gsmSerial(GSM_RX, GSM_TX);
SoftwareSerial gpsSerial(GPS_RX, GPS_TX);

TinyGPSPlus gps;

// Global variables
double latitude = 0.0;
double longitude = 0.0;
String lockStatus = "LOCKED";
unsigned long lastUpdate = 0;

void setup() {
  Serial.begin(9600);
  gsmSerial.begin(9600);
  gpsSerial.begin(9600);
  
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);  // Lock is closed
  
  Serial.println(F("Cycle Lock System Starting..."));
  
  // Initialize GSM Module
  initGSM();
  
  Serial.println(F("System Ready!"));
}

void loop() {
  // Read GPS data
  while (gpsSerial.available() > 0) {
    if (gps.encode(gpsSerial.read())) {
      if (gps.location.isValid()) {
        latitude = gps.location.lat();
        longitude = gps.location.lng();
      }
    }
  }
  
  // Send location update every UPDATE_INTERVAL
  if (millis() - lastUpdate >= UPDATE_INTERVAL) {
    lastUpdate = millis();
    
    if (latitude != 0.0 && longitude != 0.0) {
      sendLocationUpdate();
    }
    
    // Check for unlock request
    checkUnlockRequest();
  }
}

void initGSM() {
  Serial.println(F("Initializing GSM..."));
  
  // Test AT command
  sendATCommand("AT", 1000);
  
  // Disable echo
  sendATCommand("ATE0", 1000);
  
  // Set SMS mode to text
  sendATCommand("AT+CMGF=1", 1000);
  
  // Configure GPRS
  Serial.println(F("Configuring GPRS..."));
  sendATCommand("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"", 2000);
  
  String apnCmd = "AT+SAPBR=3,1,\"APN\",\"" + String(APN) + "\"";
  sendATCommand(apnCmd.c_str(), 2000);
  
  // Open GPRS context
  sendATCommand("AT+SAPBR=1,1", 3000);
  
  // Check IP address
  sendATCommand("AT+SAPBR=2,1", 2000);
  
  // Initialize HTTP service
  sendATCommand("AT+HTTPINIT", 2000);
  
  Serial.println(F("GSM Initialized!"));
}

void sendATCommand(const char* cmd, int timeout) {
  Serial.print(F("Sending: "));
  Serial.println(cmd);
  
  gsmSerial.println(cmd);
  
  long start = millis();
  while (millis() - start < timeout) {
    while (gsmSerial.available()) {
      char c = gsmSerial.read();
      Serial.write(c);
    }
  }
  Serial.println();
}

void sendLocationUpdate() {
  Serial.println(F("Sending location update..."));
  
  // Prepare JSON data
  String jsonData = "{";
  jsonData += "\"lockId\":\"" + String(LOCK_ID) + "\",";
  jsonData += "\"latitude\":" + String(latitude, 6) + ",";
  jsonData += "\"longitude\":" + String(longitude, 6) + ",";
  jsonData += "\"lockStatus\":\"" + lockStatus + "\",";
  jsonData += "\"timestamp\":\"" + String(millis()) + "\"";
  jsonData += "}";
  
  // Firebase path: /cycles/{LOCK_ID}/location.json
  String url = "https://" + String(FIREBASE_HOST) + "/cycles/" + String(LOCK_ID) + "/location.json";
  
  // Set HTTP parameters
  sendATCommand("AT+HTTPPARA=\"CID\",1", 1000);
  
  String urlCmd = "AT+HTTPPARA=\"URL\",\"" + url + "\"";
  sendATCommand(urlCmd.c_str(), 1000);
  
  sendATCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", 1000);
  
  // Set data to send
  String dataCmd = "AT+HTTPDATA=" + String(jsonData.length()) + ",10000";
  gsmSerial.println(dataCmd);
  delay(1000);
  gsmSerial.println(jsonData);
  delay(2000);
  
  // Execute POST request
  sendATCommand("AT+HTTPACTION=1", 5000);  // 1 = POST
  
  // Read response
  delay(2000);
  sendATCommand("AT+HTTPREAD", 2000);
  
  Serial.println(F("Location update sent!"));
}

void checkUnlockRequest() {
  Serial.println(F("Checking for unlock request..."));
  
  // Firebase path to check status: /cycles/{LOCK_ID}/lockStatus.json
  String url = "https://" + String(FIREBASE_HOST) + "/cycles/" + String(LOCK_ID) + "/lockStatus.json";
  
  // Set HTTP parameters for GET request
  sendATCommand("AT+HTTPPARA=\"CID\",1", 1000);
  
  String urlCmd = "AT+HTTPPARA=\"URL\",\"" + url + "\"";
  sendATCommand(urlCmd.c_str(), 1000);
  
  // Execute GET request
  gsmSerial.println("AT+HTTPACTION=0");  // 0 = GET
  delay(3000);
  
  // Read response
  gsmSerial.println("AT+HTTPREAD");
  delay(2000);
  
  String response = "";
  while (gsmSerial.available()) {
    char c = gsmSerial.read();
    response += c;
    Serial.write(c);
  }
  
  // Check if response contains "UNLOCK_REQUESTED"
  if (response.indexOf("UNLOCK_REQUESTED") > 0) {
    Serial.println(F("\n*** UNLOCK REQUEST RECEIVED ***"));
    unlockCycle();
  }
}

void unlockCycle() {
  Serial.println(F("Unlocking cycle..."));
  
  // Activate relay to unlock
  digitalWrite(RELAY_PIN, HIGH);
  lockStatus = "UNLOCKED";
  
  delay(5000);  // Keep unlocked for 5 seconds
  
  // Update status back to server
  updateLockStatus("UNLOCKED");
  
  Serial.println(F("Cycle unlocked!"));
}

void lockCycle() {
  Serial.println(F("Locking cycle..."));
  
  // Deactivate relay to lock
  digitalWrite(RELAY_PIN, LOW);
  lockStatus = "LOCKED";
  
  // Update status back to server
  updateLockStatus("LOCKED");
  
  Serial.println(F("Cycle locked!"));
}

void updateLockStatus(String status) {
  Serial.println(F("Updating lock status..."));
  
  String jsonData = "\"" + status + "\"";
  
  String url = "https://" + String(FIREBASE_HOST) + "/cycles/" + String(LOCK_ID) + "/lockStatus.json";
  
  sendATCommand("AT+HTTPPARA=\"CID\",1", 1000);
  
  String urlCmd = "AT+HTTPPARA=\"URL\",\"" + url + "\"";
  sendATCommand(urlCmd.c_str(), 1000);
  
  sendATCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", 1000);
  
  String dataCmd = "AT+HTTPDATA=" + String(jsonData.length()) + ",10000";
  gsmSerial.println(dataCmd);
  delay(1000);
  gsmSerial.println(jsonData);
  delay(2000);
  
  sendATCommand("AT+HTTPACTION=1", 5000);  // POST
  
  delay(2000);
  sendATCommand("AT+HTTPREAD", 2000);
  
  Serial.println(F("Status updated!"));
}
