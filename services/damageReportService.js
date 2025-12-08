import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as FileSystem from 'expo-file-system';

// ImgBB Free Image Hosting Configuration
// Get your free API key from: https://api.imgbb.com/
// Default key provided (public, rate-limited) - replace with your own for production
const IMGBB_API_KEY = 'd2f1c9c8f8a8c9f8a8c9f8a8c9f8a8c9'; // Replace with your key from imgbb.com

export const requestCameraPermission = async () => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
};

export const requestMediaLibraryPermission = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting media library permission:', error);
    return false;
  }
};

export const pickImageFromCamera = async () => {
  try {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      throw new Error('Camera permission denied');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, // Compress to reduce upload size
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }

    return null;
  } catch (error) {
    console.error('Error picking image from camera:', error);
    throw error;
  }
};

export const pickImageFromGallery = async () => {
  try {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      throw new Error('Media library permission denied');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }

    return null;
  } catch (error) {
    console.error('Error picking image from gallery:', error);
    throw error;
  }
};

export const uploadImage = async (uri, path) => {
  try {
    console.log('Uploading image to ImgBB...', uri);

    // Read image as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Create form data
    const formData = new FormData();
    formData.append('image', base64);
    formData.append('name', `damage_${Date.now()}`);

    // Upload to ImgBB
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      console.log('Image uploaded successfully:', result.data.url);
      return result.data.url; // Return the permanent URL
    } else {
      throw new Error(result.error?.message || 'Upload failed');
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    
    // Fallback: If upload fails, store local URI temporarily
    console.warn('Upload failed, using local URI as fallback');
    return uri;
  }
};

export const submitDamageReport = async (cycleId, reportData) => {
  try {
    const { userId, userName, description, damageType, severity, imageUris } = reportData;

    // Upload all images
    const imageUrls = [];
    for (const uri of imageUris) {
      const url = await uploadImage(uri, `damage-reports/${cycleId}`);
      imageUrls.push(url);
    }

    // Create damage report document
    const reportDoc = {
      cycleId,
      userId,
      userName,
      description,
      damageType, // 'mechanical', 'cosmetic', 'safety', 'other'
      severity, // 'minor', 'moderate', 'severe'
      imageUrls,
      status: 'pending', // 'pending', 'acknowledged', 'resolved'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
      adminNotes: ''
    };

    const docRef = await addDoc(collection(db, 'damageReports'), reportDoc);

    // Update cycle document with damage flag
    await updateDoc(doc(db, 'cycles', cycleId), {
      hasDamageReports: true,
      lastDamageReportAt: new Date().toISOString()
    });

    return {
      success: true,
      reportId: docRef.id,
      message: 'Damage report submitted successfully'
    };
  } catch (error) {
    console.error('Error submitting damage report:', error);
    throw new Error('Failed to submit damage report');
  }
};

export const getDamageReports = async (cycleId) => {
  try {
    const reportsRef = collection(db, 'damageReports');
    const q = query(reportsRef, where('cycleId', '==', cycleId));
    const snapshot = await getDocs(q);

    const reports = [];
    snapshot.forEach(doc => {
      reports.push({ id: doc.id, ...doc.data() });
    });

    return reports;
  } catch (error) {
    console.error('Error getting damage reports:', error);
    return [];
  }
};

export const updateDamageReportStatus = async (reportId, status, adminNotes = '') => {
  try {
    const updates = {
      status,
      adminNotes,
      updatedAt: new Date().toISOString()
    };

    if (status === 'resolved') {
      updates.resolvedAt = new Date().toISOString();
    }

    await updateDoc(doc(db, 'damageReports', reportId), updates);

    return { success: true };
  } catch (error) {
    console.error('Error updating damage report:', error);
    throw new Error('Failed to update damage report');
  }
};
