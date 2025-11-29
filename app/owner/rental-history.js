import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getUserData } from '../../utils/storage';

export default function RentalHistory() {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const user = await getUserData();
      if (!user) {
        router.replace('/login');
        return;
      }

      const historyRef = collection(db, 'rentalHistory');
      const q = query(historyRef, where('ownerId', '==', user.id));
      const querySnapshot = await getDocs(q);

      const historyList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

      setHistory(historyList);
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert('Error', 'Failed to load rental history');
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (rental) => {
    Alert.alert(
      'Report Renter',
      `Report ${rental.renterName} for issues with this rental?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = await getUserData();
              await addDoc(collection(db, 'reports'), {
                reportedBy: user.id,
                reportedByName: user.name,
                reportedUser: rental.renterId,
                reportedUserName: rental.renterName,
                rentalId: rental.id,
                cycleId: rental.cycleId,
                cycleName: rental.cycleName,
                reason: 'Issue with rental',
                createdAt: new Date().toISOString(),
              });
              Alert.alert('Success', 'Report submitted successfully');
            } catch (error) {
              console.error('Error submitting report:', error);
              Alert.alert('Error', 'Failed to submit report');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rental History</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Rental History</Text>
            <Text style={styles.emptyText}>
              Your rental history will appear here
            </Text>
          </View>
        ) : (
          history.map((rental) => (
            <View key={rental.id} style={styles.historyCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cycleName}>{rental.cycleName}</Text>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>
                    {'⭐'.repeat(rental.rating)}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Renter:</Text>
                <Text style={styles.infoValue}>{rental.renterName}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{rental.renterPhone}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Duration:</Text>
                <Text style={styles.infoValue}>{rental.duration} minutes</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Earnings:</Text>
                <Text style={styles.priceValue}>₹{rental.price}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>
                  {new Date(rental.completedAt).toLocaleDateString()}
                </Text>
              </View>

              {rental.review && (
                <View style={styles.reviewBox}>
                  <Text style={styles.reviewLabel}>Review:</Text>
                  <Text style={styles.reviewText}>{rental.review}</Text>
                </View>
              )}

              <TouchableOpacity 
                style={styles.reportButton}
                onPress={() => handleReport(rental)}
              >
                <Text style={styles.reportButtonText}>🚨 Report Issue</Text>
              </TouchableOpacity>
            </View>
          ))
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
  header: {
    backgroundColor: '#1e40af',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
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
  },
  historyCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
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
  ratingBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
  },
  reviewBox: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  reportButton: {
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  reportButtonText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 14,
  },
});
