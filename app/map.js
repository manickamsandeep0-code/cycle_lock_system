import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
// CHANGED: Import Realtime Database functions
import { ref, onValue } from 'firebase/database'; 
import { collection, getDocs } from 'firebase/firestore';
// CHANGED: Import realtimeDb
import { db, realtimeDb } from '../config/firebase'; 
import { getUserData, clearUserData } from '../utils/storage';
import { KARUNYA_LOCATION, CYCLE_STATUS } from '../constants';
import CycleDetailsModal from '../components/CycleDetailsModal';
import DurationSelectionModal from '../components/DurationSelectionModal';

export default function Map() {
  const router = useRouter();
  const webViewRef = useRef(null);
  const [cycles, setCycles] = useState([]);
  const [filteredCycles, setFilteredCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [showDurationDialog, setShowDurationDialog] = useState(true);
  const [requestedDuration, setRequestedDuration] = useState(null);

  useEffect(() => {
    loadUserData();
    requestLocationPermission();
  }, []);

  // --- CRITICAL FIX: Listen to Realtime Database for Live Location ---
  useEffect(() => {
    let unsubscribeRealtime = null;
    
    const fetchCycles = async () => {
      try {
        // 1. Get static cycle details (Name, Price, Owner) from Firestore
        const cyclesSnapshot = await getDocs(collection(db, 'cycles'));
        const cyclesMap = {};
        cyclesSnapshot.forEach(doc => {
          cyclesMap[doc.data().lockCode] = { id: doc.id, ...doc.data() };
        });

        // 2. Listen to LIVE data (Location, Status) from Realtime Database
        const locksRef = ref(realtimeDb, 'locks');
        unsubscribeRealtime = onValue(locksRef, (snapshot) => {
          const locksData = snapshot.val();
          if (!locksData) return;

          const mergedData = Object.keys(locksData).map(lockCode => {
            const lock = locksData[lockCode];
            const metaData = cyclesMap[lockCode] || {}; // Match using Lock ID

            // If Arduino hasn't sent location yet, fallback to fixed location or defaults
            const lat = lock.location?.latitude || metaData.location?.latitude || KARUNYA_LOCATION.latitude;
            const lng = lock.location?.longitude || metaData.location?.longitude || KARUNYA_LOCATION.longitude;
            
            // CRITICAL: Use Firestore status as source of truth, not Arduino lock state
            // Firestore status is managed by the app's rental flow
            const status = metaData.status || CYCLE_STATUS.NOT_AVAILABLE;

            return {
              id: metaData.id || lockCode,
              lockCode: lockCode,
              ...metaData, // Name, Price, etc.
              location: { latitude: lat, longitude: lng }, // Live GPS coordinates
              status: status,
              battery: lock.battery !== undefined ? lock.battery : 0 // Live battery level (0 if not available)
            };
          });

          setCycles(mergedData);
          filterCycles(mergedData, requestedDuration);
          setLoading(false);
        });
      } catch (err) {
        console.error('Error fetching cycles:', err);
        setLoading(false);
      }
    };

    fetchCycles();
    
    // Cleanup function
    return () => {
      if (unsubscribeRealtime) unsubscribeRealtime();
    };
  }, [requestedDuration]);

  const filterCycles = (allCycles, duration) => {
    // Always show only AVAILABLE cycles on the map
    const available = allCycles.filter(c => c.status === CYCLE_STATUS.AVAILABLE);
    
    if (duration !== null) {
      // Additional filtering by battery life or duration can be added here
      setFilteredCycles(available);
    } else {
      setFilteredCycles(available);
    }
  };

  const loadUserData = async () => {
    await getUserData();
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleLogout = async () => {
    await clearUserData();
    router.push('/login');
  };

  const handleRentCycle = async () => {
    if (!selectedCycle) return;
    router.push({
      pathname: '/rent-cycle',
      params: { 
        cycle: JSON.stringify(selectedCycle),
        requestedDuration: requestedDuration 
      }
    });
  };

  const handleDurationConfirm = (totalMinutes) => {
    setRequestedDuration(totalMinutes);
    setShowDurationDialog(false);
  };

  const handleDurationCancel = () => {
    router.back();
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerClick') setSelectedCycle(data.cycle);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  const generateMapHTML = () => {
    const cyclesJSON = JSON.stringify(filteredCycles || []);
    const userLocationJSON = JSON.stringify(userLocation || null);
    
    // Note: We use the cycle.location.latitude provided by the Arduino
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .custom-marker { font-size: 24px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const cycles = ${cyclesJSON};
    const userLocation = ${userLocationJSON};
    const map = L.map('map').setView([${KARUNYA_LOCATION.latitude}, ${KARUNYA_LOCATION.longitude}], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    if (userLocation) {
      L.circleMarker([userLocation.latitude, userLocation.longitude], { radius: 8, fillColor: '#3b82f6', color: '#fff', weight: 2, fillOpacity: 0.8 }).addTo(map).bindPopup('You are here');
    }

    cycles.forEach(cycle => {
      // Safety check for location
      if(cycle.location && cycle.location.latitude && cycle.location.longitude) {
        const isAvailable = cycle.status === '${CYCLE_STATUS.AVAILABLE}';
        const marker = L.marker([cycle.location.latitude, cycle.location.longitude], {
          icon: L.divIcon({ className: 'custom-div-icon', html: '<div class="custom-marker">' + (isAvailable ? '🚲' : '🔒') + '</div>', iconSize: [40, 40], iconAnchor: [20, 20] })
        }).addTo(map);
        marker.on('click', () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerClick', cycle }));
        });
        
        const batteryText = cycle.battery ? '<br/>🔋 ' + cycle.battery + '%' : '';
        marker.bindPopup('<b>' + (cycle.cycleName || 'Cycle') + '</b><br/>Owner: ' + (cycle.ownerName || 'Unknown') + '<br/>Status: ' + (isAvailable ? 'Available' : 'Rented') + batteryText);
      }
    });
  </script>
</body>
</html>
    `;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading live map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Karunya Cycle Rental</Text>
          <Text style={styles.headerSubtitle}>Live IoT Map</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => router.push('/my-rental')} style={styles.rentalButton}>
            <Text style={styles.rentalButtonText}>🚴</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <WebView
        ref={webViewRef}
        key={`map-${filteredCycles.length}-${JSON.stringify(filteredCycles.map(c => c.location))}`}
        style={styles.map}
        originWhitelist={['*']}
        source={{ html: generateMapHTML() }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
      />

      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          {filteredCycles.filter(c => c.status === CYCLE_STATUS.AVAILABLE).length} live cycle(s) found
        </Text>
      </View>

      <DurationSelectionModal
        visible={showDurationDialog}
        onClose={handleDurationCancel}
        onConfirm={handleDurationConfirm}
      />

      {selectedCycle && (
        <CycleDetailsModal
          visible={!!selectedCycle}
          cycle={selectedCycle}
          onClose={() => setSelectedCycle(null)}
          onRent={handleRentCycle}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  header: {
    backgroundColor: '#1e40af',
    padding: 16,
    paddingTop: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    color: '#bfdbfe',
    fontSize: 12,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rentalButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  rentalButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  logoutButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  infoBanner: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500',
  },
});