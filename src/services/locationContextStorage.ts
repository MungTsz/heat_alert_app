// src/services/locationContextStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationContextOverride } from '../utils/locationContext';

const STORAGE_KEY = 'location_context_override';

// The owner's one-tap "where I am now" correction. Kept in storage only so
// it survives the app being closed and reopened during the same stay —
// useLocationContext drops it as soon as the stay ends. Stays on the phone,
// like every other position the app holds.
export const readLocationOverride = async (): Promise<LocationContextOverride | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocationContextOverride) : null;
  } catch (error) {
    console.log('Failed to read the location correction:', error);
    return null;
  }
};

export const writeLocationOverride = async (
  override: LocationContextOverride | null,
): Promise<void> => {
  try {
    if (override) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(override));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.log('Failed to save the location correction:', error);
  }
};
