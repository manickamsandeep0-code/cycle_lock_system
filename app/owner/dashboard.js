import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getUserData, clearUserData } from '../../utils/storage';
import { CYCLE_STATUS } from '../../constants';

export default function OwnerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndCycles();
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
          <Text style={styles.infoValue}>{cycle.lockCode}</Text>
        </View>

        <View style={styles.cycleInfo}>
          <Text style={styles.infoLabel}>Location:</Text>
          <Text style={styles.infoValue}>
            {cycle.location ? 
              `${cycle.location.latitude.toFixed(4)}, ${cycle.location.longitude.toFixed(4)}` 
              : 'Unknown'}
          </Text>
        </View>

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

        {!isRented && (
          <TouchableOpacity 
            style={[styles.toggleButton, !isAvailable && styles.toggleButtonInactive]}
            onPress={() => toggleCycleAvailability(cycle.id, cycle.status)}
          >
            <Text style={styles.toggleButtonText}>
              {isAvailable ? 'Mark as Unavailable' : 'Mark as Available'}
            </Text>
          </TouchableOpacity>
        )}

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
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
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
            <Text style={styles.emptyTitle}>No Cycle Found</Text>
            <Text style={styles.emptyText}>
              Your cycle is not yet activated. Please ensure your lock device is online and connected.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.cyclesHeader}>
              <Text style={styles.cyclesTitle}>My Cycle</Text>
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
  toggleButton: {
    backgroundColor: '#1e40af',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
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
