import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { pickImageFromCamera, pickImageFromGallery, submitDamageReport } from '../services/damageReportService';
import { getUserData } from '../utils/storage';

export default function DamageReport() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const cycleId = params.cycleId;

  const [formData, setFormData] = useState({
    description: '',
    damageType: '',
    severity: '',
  });
  const [imageUris, setImageUris] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleTakePhoto = async () => {
    try {
      const uri = await pickImageFromCamera();
      if (uri) {
        setImageUris(prev => [...prev, uri]);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to take photo');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const uri = await pickImageFromGallery();
      if (uri) {
        setImageUris(prev => [...prev, uri]);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const handleRemoveImage = (index) => {
    setImageUris(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const { description, damageType, severity } = formData;

    if (!description.trim()) {
      Alert.alert('Error', 'Please describe the damage');
      return;
    }
    if (!damageType) {
      Alert.alert('Error', 'Please select damage type');
      return;
    }
    if (!severity) {
      Alert.alert('Error', 'Please select severity level');
      return;
    }
    if (imageUris.length === 0) {
      Alert.alert('Error', 'Please add at least one photo of the damage');
      return;
    }

    setLoading(true);
    try {
      const user = await getUserData();
      
      const reportData = {
        userId: user.id,
        userName: user.name,
        description,
        damageType,
        severity,
        imageUris,
      };

      await submitDamageReport(cycleId, reportData);

      Alert.alert(
        'Success',
        'Damage report submitted successfully. The owner will be notified.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting damage report:', error);
      Alert.alert('Error', 'Failed to submit damage report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Report Damage</Text>
        <Text style={styles.subtitle}>
          Help us maintain cycle quality by reporting any issues
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <Text style={styles.sectionSubtitle}>
            Add clear photos of the damage (at least 1 required)
          </Text>
          
          <View style={styles.imageGrid}>
            {imageUris.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleRemoveImage(index)}
                >
                  <Text style={styles.removeImageText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
              <Text style={styles.photoButtonText}>📷 Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={handlePickFromGallery}>
              <Text style={styles.photoButtonText}>🖼️ Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Damage Type</Text>
          <View style={styles.optionGrid}>
            {['mechanical', 'cosmetic', 'safety', 'other'].map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.optionButton,
                  formData.damageType === type && styles.optionButtonActive
                ]}
                onPress={() => setFormData(prev => ({ ...prev, damageType: type }))}
              >
                <Text style={[
                  styles.optionText,
                  formData.damageType === type && styles.optionTextActive
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Severity</Text>
          <View style={styles.optionGrid}>
            {['minor', 'moderate', 'severe'].map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.optionButton,
                  formData.severity === level && styles.optionButtonActive,
                  level === 'severe' && styles.severeButton
                ]}
                onPress={() => setFormData(prev => ({ ...prev, severity: level }))}
              >
                <Text style={[
                  styles.optionText,
                  formData.severity === level && styles.optionTextActive
                ]}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe the damage in detail..."
            value={formData.description}
            onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#ddd',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff3b30',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  optionButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  severeButton: {
    borderColor: '#ff3b30',
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
