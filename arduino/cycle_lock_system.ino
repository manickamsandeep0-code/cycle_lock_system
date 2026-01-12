

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SoftwareSerial.h>
#include <TinyGPS++.h>

// Pin definitions for ESP8266 NodeMCU
#define GPS_RX D2  // GPIO4
#define GPS_TX D1  // GPIO5
#define RELAY_PIN D7  // GPIO13

// Configuration - IMPORTANT: UPDATE THESE VALUES!
const char* WIFI_SSID = "YourWiFiName";     // ← CHANGE THIS to your WiFi name
const char* WIFI_PASSWORD = "YourWiFiPassword";  // ← CHANGE THIS to your WiFi password
const char* LOCK_ID = "LOCK_0002";  // CHANGE THIS TO YOUR UNIQUE LOCK ID (must match Firestore)

const char* FIREBASE_HOST = "karunya-cycle-rental-default-rtdb.asia-southeast1.firebasedatabase.app";  // Firebase Realtime Database URL (REGION SPECIFIC)
const char* FIREBASE_AUTH = "NvdR1aTYQz1TL6oVb1HgpXVZ5nRCTnYsESVToYbl";      // Your Firebase Database Secret
const int UPDATE_INTERVAL = 10000;   // Send location every 10 seconds (10000ms)

// Software Serial for GPS
SoftwareSerial gpsSerial(GPS_RX, GPS_TX);

TinyGPSPlus gps;
WiFiClientSecure wifiClient;

// Global variables
double latitude = 0.0;
double longitude = 0.0;
String lockStatus = "LOCKED";
unsigned long lastUpdate = 0;

void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600);
  
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);  // Lock is closed
  
  Serial.println(F("Cycle Lock System Starting..."));
  
  // Initialize WiFi
  initWiFi();
  
  // Disable SSL certificate verification (for Firebase)
  wifiClient.setInsecure();
  
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

void initWiFi() {
  Serial.println(F("Connecting to WiFi..."));
  Serial.print(F("SSID: "));
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\nWiFi Connected!"));
    Serial.print(F("IP Address: "));
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(F("\nWiFi Connection Failed!"));
    Serial.println(F("Retrying in 5 seconds..."));
    delay(5000);
    ESP.restart();
  }
}

void sendLocationUpdate() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("WiFi not connected. Reconnecting..."));
    initWiFi();
    return;
  }
  
  Serial.println(F("Sending location update..."));
  
  HTTPClient http;
  
  // Prepare JSON data
  String jsonData = "{";
  jsonData += "\"latitude\":" + String(latitude, 6) + ",";
  jsonData += "\"longitude\":" + String(longitude, 6);
  jsonData += "}";
  
  // Firebase path: /locks/{LOCK_ID}/location.json with auth
  String url = "https://" + String(FIREBASE_HOST) + "/locks/" + String(LOCK_ID) + "/location.json";
  if (strlen(FIREBASE_AUTH) > 0) {
    url += "?auth=" + String(FIREBASE_AUTH);
  }
  
  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.PUT(jsonData);  // Use PUT to update location
  
  if (httpCode > 0) {
    Serial.print(F("HTTP Response: "));
    Serial.println(httpCode);
    
    if (httpCode == 200) {
      Serial.println(F("Location update sent!"));
    }
  } else {
    Serial.print(F("HTTP Error: "));
    Serial.println(http.errorToString(httpCode));
  }
  
  http.end();
}

void checkUnlockRequest() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  Serial.println(F("Checking for unlock request..."));
  
  HTTPClient http;
  
  // Firebase path to check command: /locks/{LOCK_ID}/command.json
  String url = "https://" + String(FIREBASE_HOST) + "/locks/" + String(LOCK_ID) + "/command.json";
  if (strlen(FIREBASE_AUTH) > 0) {
    url += "?auth=" + String(FIREBASE_AUTH);
  }
  
  http.begin(wifiClient, url);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String response = http.getString();
    Serial.println(response);
    
    // Check if response contains "UNLOCK" command and executed is false
    if (response.indexOf("\"action\":\"UNLOCK\"") > 0 && response.indexOf("\"executed\":false") > 0) {
      Serial.println(F("\n*** UNLOCK REQUEST RECEIVED ***"));
      unlockCycle();
      markCommandExecuted();
    } else if (response.indexOf("\"action\":\"LOCK\"") > 0 && response.indexOf("\"executed\":false") > 0) {
      Serial.println(F("\n*** LOCK REQUEST RECEIVED ***"));
      lockCycle();
      markCommandExecuted();
    }
  }
  
  http.end();
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
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  Serial.println(F("Updating lock status..."));
  
  HTTPClient http;
  
  // Update status as JSON object: {"locked": true/false, "online": true}
  String jsonData = "{\"locked\":";
  jsonData += (status == "LOCKED") ? "true" : "false";
  jsonData += ",\"online\":true}";
  
  String url = "https://" + String(FIREBASE_HOST) + "/locks/" + String(LOCK_ID) + "/status.json";
  if (strlen(FIREBASE_AUTH) > 0) {
    url += "?auth=" + String(FIREBASE_AUTH);
  }
  
  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.PUT(jsonData);
  
  if (httpCode == 200) {
    Serial.println(F("Status updated!"));
  } else {
    Serial.print(F("Status update failed: "));
    Serial.println(httpCode);
  }
  
  http.end();
}

void markCommandExecuted() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  Serial.println(F("Marking command as executed..."));
  
  HTTPClient http;
  
  // Update command/executed to true
  String jsonData = "true";
  
  String url = "https://" + String(FIREBASE_HOST) + "/locks/" + String(LOCK_ID) + "/command/executed.json";
  if (strlen(FIREBASE_AUTH) > 0) {
    url += "?auth=" + String(FIREBASE_AUTH);
  }
  
  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.PUT(jsonData);
  
  if (httpCode == 200) {
    Serial.println(F("Command marked as executed!"));
  } else {
    Serial.print(F("Failed to mark command: "));
    Serial.println(httpCode);
  }
  
  http.end();
}
