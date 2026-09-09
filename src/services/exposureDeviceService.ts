// src/services/exposureDeviceService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExposureDevice } from '../types/exposure';

const DEVICES_KEY = 'exposure_devices';

const readDevices = async (): Promise<ExposureDevice[]> => {
  try {
    const raw = await AsyncStorage.getItem(DEVICES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.log('Failed to read exposure devices:', error);
    return [];
  }
};

export const getDevices = async (): Promise<ExposureDevice[]> => {
  const devices = await readDevices();
  return devices.sort((a, b) => b.createdAt - a.createdAt);
};

export const createDevice = async (name: string): Promise<ExposureDevice> => {
  const devices = await readDevices();
  const device: ExposureDevice = {
    id: `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(DEVICES_KEY, JSON.stringify([...devices, device]));
  return device;
};

export const deleteDevice = async (id: string): Promise<void> => {
  const devices = await readDevices();
  await AsyncStorage.setItem(
    DEVICES_KEY,
    JSON.stringify(devices.filter(d => d.id !== id)),
  );
  // The device's own per-day history lives under a separate key
  // (exposure_daily_history:<id>, see exposureHistoryService.ts) — drop it
  // too so a deleted device doesn't leave orphaned data behind.
  await AsyncStorage.removeItem(`exposure_daily_history:${id}`);
};
