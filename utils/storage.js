import AsyncStorage from '@react-native-async-storage/async-storage';

// User storage keys
const USER_KEY = '@user_data';
const ROLE_KEY = '@user_role';

export const saveUserData = async (userData) => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
  } catch (error) {
    console.error('Error saving user data:', error);
  }
};

export const getUserData = async () => {
  try {
    const data = await AsyncStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

export const saveUserRole = async (role) => {
  try {
    await AsyncStorage.setItem(ROLE_KEY, role);
  } catch (error) {
    console.error('Error saving user role:', error);
  }
};

export const getUserRole = async () => {
  try {
    return await AsyncStorage.getItem(ROLE_KEY);
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

export const clearUserData = async () => {
  try {
    await AsyncStorage.multiRemove([USER_KEY, ROLE_KEY]);
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
};
