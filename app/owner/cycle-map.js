import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { doc, getDoc } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { db, realtimeDb } from '../../config/firebase';
import { KARUNYA_LOCATION } from '../../constants';

export default function CycleMap() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { cycleId, cycleName } = params;
  
  const [cycleLocation, setCycleLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lockCode, setLockCode] = useState(null);

  useEffect(() => {
    if (!cycleId) return;

    // First, get the lockCode from Firestore
    const fetchLockCode = async () => {
      const cycleRef = doc(db, 'cycles', cycleId);
      const cycleDoc = await getDoc(cycleRef);
      if (cycleDoc.exists()) {
        const data = cycleDoc.data();
        setLockCode(data.lockCode);
        // Set initial location from Firestore as fallback
        setCycleLocation(data.location || KARUNYA_LOCATION);
        setLoading(false);
      }
    };

    fetchLockCode();
  }, [cycleId]);

  // Listen to live location updates from Realtime Database
  useEffect(() => {
    if (!lockCode) return;

    const locationRef = ref(realtimeDb, `/locks/${lockCode}/location`);
    const unsubscribe = onValue(locationRef, (snapshot) => {
      const location = snapshot.val();
      if (location) {
        setCycleLocation(location);
      }
    });

    return () => unsubscribe();
  }, [lockCode]);

  const generateMapHTML = () => {
    const location = cycleLocation || KARUNYA_LOCATION;
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .cycle-marker { font-size: 32px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map').setView([${location.latitude}, ${location.longitude}], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    // Add cycle marker
    const cycleMarker = L.marker([${location.latitude}, ${location.longitude}], {
      icon: L.divIcon({ 
        className: 'custom-div-icon', 
        html: '<div class="cycle-marker">🚲</div>', 
        iconSize: [40, 40], 
        iconAnchor: [20, 20] 
      })
    }).addTo(map);
    
    cycleMarker.bindPopup('<b>${cycleName || 'Your Cycle'}</b><br/>Current Location');
  </script>
</body>
</html>
    `;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        key={cycleLocation ? `${cycleLocation.latitude}-${cycleLocation.longitude}` : 'default'}
        source={{ html: generateMapHTML() }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
      />
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  map: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    backgroundColor: '#1e40af',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
