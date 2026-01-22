import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { db, realtimeDb } from '../../config/firebase';
import { getUserData, clearUserData } from '../../utils/storage';
import { CYCLE_STATUS } from '../../constants';
import { lockCycle, unlockCycle } from '../../services/lockService';

export default function OwnerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batteryLevels, setBatteryLevels] = useState({});
  const [liveLocations, setLiveLocations] = useState({});
  const [lockActionLoading, setLockActionLoading] = useState({});

  useEffect(() => {
    loadUserAndCycles();
    
    // Store unsubscribe functions for cleanup
    let firestoreUnsubscribe = null;
    const realtimeUnsubscribes = [];
    
    // Set up real-time listener for cycles
    const setupRealtimeListener = async () => {
      const userData = await getUserData();
      if (!userData) return;

      const cyclesRef = collection(db, 'cycles');
      const q = query(cyclesRef, where('ownerId', '==', userData.id));
      
      firestoreUnsubscribe = onSnapshot(q, (querySnapshot) => {
        const cyclesList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCycles(cyclesList);
        
        // Clear previous realtime listeners before setting up new ones
        realtimeUnsubscribes.forEach(unsub => unsub());
        realtimeUnsubscribes.length = 0;
        
        // Listen to battery and location updates for each cycle
        cyclesList.forEach(cycle => {
          const lockIdentifier = cycle.lockCode;
          if (lockIdentifier) {
            // Listen to battery updates
            const batteryRef = ref(realtimeDb, `/locks/${lockIdentifier}/battery`);
            const batteryUnsub = onValue(batteryRef, (snapshot) => {
              const battery = snapshot.val();
              setBatteryLevels(prev => ({
                ...prev,
                [lockIdentifier]: battery
              }));
            });
            realtimeUnsubscribes.push(batteryUnsub);

            // Listen to location updates
            const locationRef = ref(realtimeDb, `/locks/${lockIdentifier}/location`);
            const locationUnsub = onValue(locationRef, (snapshot) => {
              const location = snapshot.val();
              if (location) {
                setLiveLocations(prev => ({
                  ...prev,
                  [lockIdentifier]: location
                }));
              }
            });
            realtimeUnsubscribes.push(locationUnsub);
          }
        });
      });
    };

    setupRealtimeListener();
    
    // Cleanup function
    return () => {
      if (firestoreUnsubscribe) firestoreUnsubscribe();
      realtimeUnsubscribes.forEach(unsub => unsub());
    };
  }, []);

  const loadUserAndCycles = async () => {
    try {
      const userData = await getUserData();
      if (!userData) {
        router.replace('/login');
        return;
      }
      setUser(userData);
      await fetchCycles(userData.id);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load your data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCycles = async (ownerId) => {
    try {
      const cyclesRef = collection(db, 'cycles');
      const q = query(cyclesRef, where('ownerId', '==', ownerId));
      const querySnapshot = await getDocs(q);
      
      const cyclesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCycles(cyclesList);
    } catch (error) {
      console.error('Error fetching cycles:', error);
      Alert.alert('Error', 'Failed to load your cycles');
    }
  };

  const toggleCycleAvailability = async (cycleId, currentStatus) => {
    try {
      const newStatus = currentStatus === CYCLE_STATUS.AVAILABLE 
        ? CYCLE_STATUS.NOT_AVAILABLE 
        : CYCLE_STATUS.AVAILABLE;

      const cycleRef = doc(db, 'cycles', cycleId);
      await updateDoc(cycleRef, { status: newStatus });

      // Update local state
      setCycles(prevCycles => 
        prevCycles.map(cycle => 
          cycle.id === cycleId ? { ...cycle, status: newStatus } : cycle
        )
      );

      Alert.alert('Success', `Cycle is now ${newStatus === CYCLE_STATUS.AVAILABLE ? 'available' : 'unavailable'}`);
    } catch (error) {
      console.error('Error updating cycle status:', error);
      Alert.alert('Error', 'Failed to update cycle status');
    }
  };

  const handleLockCycle = async (lockCode, cycleName) => {
    setLockActionLoading(prev => ({ ...prev, [lockCode]: true }));
    try {
      await lockCycle(lockCode);
      Alert.alert('Success', `${cycleName} locked successfully!`);
    } catch (error) {
      console.error('Error locking cycle:', error);
      Alert.alert('Error', 'Failed to lock cycle. Please try again.');
    } finally {
      setLockActionLoading(prev => ({ ...prev, [lockCode]: false }));
    }
  };

  const handleUnlockCycle = async (lockCode, cycleName) => {
    setLockActionLoading(prev => ({ ...prev, [lockCode]: true }));
    try {
      await unlockCycle(lockCode);
      Alert.alert('Success', `${cycleName} unlocked successfully!`);
    } catch (error) {
      console.error('Error unlocking cycle:', error);
      Alert.alert('Error', 'Failed to unlock cycle. Please try again.');
    } finally {
      setLockActionLoading(prev => ({ ...prev, [lockCode]: false }));
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await clearUserData();
            router.replace('/login');
          }
        }
      ]
    );
  };

  const renderCycleCard = (cycle) => {
    const isAvailable = cycle.status === CYCLE_STATUS.AVAILABLE;
    const isRented = cycle.status === CYCLE_STATUS.RENTED;
    const lockIdentifier = cycle.lockCode;

    return (
      <View key={cycle.id} style={styles.cycleCard}>
        <View style={styles.cycleHeader}>
          <Text style={styles.cycleName}>{cycle.cycleName || 'My Cycle'}</Text>
          <View style={[
            styles.statusBadge,
            isAvailable && styles.statusAvailable,
            isRented && styles.statusRented,
            !isAvailable && !isRented && styles.statusNotAvailable
          ]}>
            <Text style={styles.statusText}>
              {isAvailable ? '🚲 Available' : isRented ? '🔒 Rented' : '⏸️ Not Available'}
            </Text>
          </View>
        </View>

        <View style={styles.cycleInfo}>
          <Text style={styles.infoLabel}>Lock Code:</Text>
          <Text style={styles.infoValue}>{lockIdentifier}</Text>
        </View>

        <View style={styles.cycleInfo}>
          <Text style={styles.infoLabel}>Location:</Text>
          <Text style={styles.infoValue}>
            {liveLocations[lockIdentifier] ? 
              `${liveLocations[lockIdentifier].latitude.toFixed(4)}, ${liveLocations[lockIdentifier].longitude.toFixed(4)}` 
              : cycle.location ? 
              `${cycle.location.latitude.toFixed(4)}, ${cycle.location.longitude.toFixed(4)}` 
              : 'Unknown'}
          </Text>
        </View>

        {batteryLevels[lockIdentifier] !== undefined && batteryLevels[lockIdentifier] !== null && (
          <View style={styles.cycleInfo}>
            <Text style={styles.infoLabel}>Battery:</Text>
            <View style={styles.batteryRow}>
              <Text style={styles.batteryIcon}>
                {batteryLevels[lockIdentifier] >= 60 ? '🔋' : batteryLevels[lockIdentifier] >= 30 ? '🔋' : '🪫'}
              </Text>
              <Text style={[
                styles.batteryValue,
                { color: batteryLevels[lockIdentifier] >= 60 ? '#10b981' : batteryLevels[lockIdentifier] >= 30 ? '#f59e0b' : '#ef4444' }
              ]}>
                {batteryLevels[lockIdentifier]}%
              </Text>
            </View>
          </View>
        )}

        {cycle.isOnline ? (
          <View style={styles.onlineBadge}>
            <Text style={styles.onlineText}>🟢 Online</Text>
          </View>
        ) : (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineText}>🔴 Offline</Text>
          </View>
        )}

        {isRented && cycle.currentRenter && (
          <View style={styles.renterInfo}>
            <Text style={styles.renterLabel}>Currently Rented By:</Text>
            <Text style={styles.renterName}>{cycle.currentRenterName || 'Unknown'}</Text>
            <Text style={styles.renterPhone}>{cycle.currentRenterPhone || ''}</Text>
            <Text style={styles.renterTime}>
              Rented at: {cycle.rentedAt ? new Date(cycle.rentedAt).toLocaleString() : 'N/A'}
            </Text>
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.mapButton}
            onPress={() => router.push({
              pathname: '/owner/cycle-map',
              params: { cycleId: cycle.id, cycleName: cycle.cycleName }
            })}
          >
            <Text style={styles.mapButtonText}>📍 View on Map</Text>
          </TouchableOpacity>

          {!isRented && (
            <>
              <View style={styles.lockControls}>
                <TouchableOpacity 
                  style={[styles.lockButton, lockActionLoading[cycle.lockCode] && styles.buttonDisabled]}
                  onPress={() => handleLockCycle(cycle.lockCode, cycle.cycleName)}
                  disabled={lockActionLoading[cycle.lockCode]}
                >
                  <Text style={styles.lockButtonText}>🔒 Lock</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.unlockButton, lockActionLoading[cycle.lockCode] && styles.buttonDisabled]}
                  onPress={() => handleUnlockCycle(cycle.lockCode, cycle.cycleName)}
                  disabled={lockActionLoading[cycle.lockCode]}
                >
                  <Text style={styles.unlockButtonText}>🔓 Unlock</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.toggleButton, !isAvailable && styles.toggleButtonInactive]}
                onPress={() => {
                  if (isAvailable) {
                    toggleCycleAvailability(cycle.id, cycle.status);
                  } else {
                    router.push({
                      pathname: '/owner/set-availability',
                      params: { cycleId: cycle.id, cycleName: cycle.cycleName }
                    });
                  }
                }}
              >
                <Text style={styles.toggleButtonText}>
                  {isAvailable ? 'Mark as Unavailable' : 'Set Available'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {isRented && (
          <View style={styles.rentedNote}>
            <Text style={styles.rentedNoteText}>
              Cannot change availability while cycle is rented
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading your cycles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Owner Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome, {user?.name}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={() => router.push('/owner/rental-history')} 
            style={styles.historyButton}
          >
            <Text style={styles.historyButtonText}>📋 History</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{cycles.length}</Text>
            <Text style={styles.statLabel}>Total Cycles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {cycles.filter(c => c.status === CYCLE_STATUS.AVAILABLE).length}
            </Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {cycles.filter(c => c.status === CYCLE_STATUS.RENTED).length}
            </Text>
            <Text style={styles.statLabel}>Rented</Text>
          </View>
        </View>

        {cycles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Cycles Registered</Text>
            <Text style={styles.emptyText}>
              Add your first cycle lock to start renting
            </Text>
            <TouchableOpacity 
              style={styles.registerButton}
              onPress={() => router.push('/owner/register-lock')}
            >
              <Text style={styles.registerButtonText}>Register Cycle Lock</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.cyclesHeader}>
              <Text style={styles.cyclesTitle}>My Cycles</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => router.push('/owner/register-lock')}
              >
                <Text style={styles.addButtonText}>+ Add Cycle</Text>
              </TouchableOpacity>
            </View>

            {cycles.map(renderCycleCard)}
          </>
        )}
      </ScrollView>
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
  header: {
    backgroundColor: '#1e40af',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#bfdbfe',
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  historyButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  historyButtonText: {
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
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  registerButton: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  registerButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  cyclesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cyclesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  addButton: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  cycleCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cycleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cycleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusAvailable: {
    backgroundColor: '#d1fae5',
  },
  statusRented: {
    backgroundColor: '#fef3c7',
  },
  statusNotAvailable: {
    backgroundColor: '#e5e7eb',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cycleInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  renterInfo: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  renterLabel: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 4,
  },
  renterName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#78350f',
  },
  renterPhone: {
    fontSize: 14,
    color: '#92400e',
    marginTop: 2,
  },
  renterTime: {
    fontSize: 12,
    color: '#92400e',
    marginTop: 4,
    fontStyle: 'italic',
  },
  onlineBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  offlineBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991b1b',
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batteryIcon: {
    fontSize: 18,
  },
  batteryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    gap: 8,
    marginTop: 12,
  },
  mapButton: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  lockControls: {
    flexDirection: 'row',
    gap: 8,
  },
  lockButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  lockButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  unlockButton: {
    flex: 1,
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  unlockButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  toggleButton: {
    backgroundColor: '#1e40af',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonInactive: {
    backgroundColor: '#10b981',
  },
  toggleButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  rentedNote: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  rentedNoteText: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'center',
  },
});
