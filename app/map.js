import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUserData, getUserRole, clearUserData } from '../utils/storage';
import { KARUNYA_LOCATION, USER_ROLES, CYCLE_STATUS, LOCK_STATUS } from '../constants';
import CycleDetailsModal from '../components/CycleDetailsModal';

export default function Map() {
  const router = useRouter();
  const webViewRef = useRef(null);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    loadUserData();
    requestLocationPermission();
  }, []);

  useEffect(() => {
    // subscribe to cycles
    const cyclesRef = collection(db, 'cycles');
    const q = query(cyclesRef, where('status', 'in', [CYCLE_STATUS.AVAILABLE, CYCLE_STATUS.RENTED]));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cyclesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCycles(cyclesData);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching cycles:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadUserData = async () => {
    const userData = await getUserData();
    const role = await getUserRole();
    setUser(userData);
    setUserRole(role);
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
    if (!selectedCycle || !user) return;
    try {
      const cycleRef = doc(db, 'cycles', selectedCycle.id);
      await updateDoc(cycleRef, {
        status: CYCLE_STATUS.RENTED,
        lockStatus: LOCK_STATUS.UNLOCK_REQUESTED,
        rentedBy: user.id,
        rentedAt: new Date().toISOString(),
      });
      Alert.alert('Success', 'Cycle unlocked! Please pick it up.', [{ text: 'OK', onPress: () => setSelectedCycle(null) }]);
    } catch (error) {
      console.error('Error renting cycle:', error);
      Alert.alert('Error', 'Failed to rent cycle.');
    }
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
    const cyclesJSON = JSON.stringify(cycles || []);
    const userLocationJSON = JSON.stringify(userLocation || null);
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
      const isAvailable = cycle.status === '${CYCLE_STATUS.AVAILABLE}';
      const marker = L.marker([cycle.location.latitude, cycle.location.longitude], {
        icon: L.divIcon({ className: 'custom-div-icon', html: '<div class="custom-marker">' + (isAvailable ? '🚲' : '🔒') + '</div>', iconSize: [40, 40], iconAnchor: [20, 20] })
      }).addTo(map);
      marker.on('click', () => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerClick', cycle }));
      });
      marker.bindPopup('<b>' + (cycle.cycleName || 'Cycle') + '</b><br/>Owner: ' + (cycle.ownerName || 'Unknown') + '<br/>Status: ' + (isAvailable ? 'Available' : 'Rented'));
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
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Karunya Cycle Rental</Text>
          <Text style={styles.headerSubtitle}>Nearby cycles on campus</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <WebView
        ref={webViewRef}
        style={styles.map}
        originWhitelist={['*']}
        source={{ html: generateMapHTML() }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
      />

      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>{cycles.length} cycle(s) available on campus</Text>
      </View>

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
    fontSize: 14,
    color: '#bfdbfe',
    marginTop: 2,
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
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  markerAvailable: {
    backgroundColor: '#10b981',
  },
  markerRented: {
    backgroundColor: '#ef4444',
  },
  markerText: {
    fontSize: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#1e40af',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
