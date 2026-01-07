import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatMinutes } from '../utils/timeHelpers';

export default function CycleDetailsModal({ visible, cycle, onClose, onRent }) {
  if (!cycle) return null;

  const remainingTime = cycle.remainingMinutes || 0;

  // Battery icon and color based on level
  const getBatteryDisplay = (battery) => {
    if (battery >= 60) {
      return { icon: '🔋', color: '#10b981', label: 'Good' };
    } else if (battery >= 30) {
      return { icon: '🔋', color: '#f59e0b', label: 'Medium' };
    } else {
      return { icon: '🪫', color: '#ef4444', label: 'Low' };
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Cycle Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Cycle Name</Text>
              <Text style={styles.value}>{cycle.cycleName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Owner</Text>
              <Text style={styles.value}>{cycle.ownerName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Contact</Text>
              <Text style={styles.value}>{cycle.ownerPhone}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Lock ID</Text>
              <Text style={styles.value}>{cycle.lockId}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Available For</Text>
              <Text style={styles.value}>{formatMinutes(remainingTime)}</Text>
            </View>

            {cycle.battery !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Battery</Text>
                <View style={styles.batteryRow}>
                  <Text style={styles.batteryIcon}>{getBatteryDisplay(cycle.battery).icon}</Text>
                  <Text style={[styles.batteryValue, { color: getBatteryDisplay(cycle.battery).color }]}>
                    {cycle.battery}%
                  </Text>
                  <Text style={[styles.batteryLabel, { color: getBatteryDisplay(cycle.battery).color }]}>
                    {getBatteryDisplay(cycle.battery).label}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, styles.statusAvailable]}>
                <Text style={styles.statusText}>✓ Available</Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.rentButton} onPress={onRent}>
              <Text style={styles.rentButtonText}>Rent This Cycle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
    padding: 5,
  },
  body: {
    padding: 20,
  },
  detailRow: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  statusContainer: {
    marginTop: 10,
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusAvailable: {
    backgroundColor: '#d1fae5',
  },
  statusText: {
    fontSize: 14,
    color: '#065f46',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
  },
  rentButton: {
    backgroundColor: '#1e40af',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  rentButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batteryIcon: {
    fontSize: 20,
  },
  batteryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  batteryLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
});
