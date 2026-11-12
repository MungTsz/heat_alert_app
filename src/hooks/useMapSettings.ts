// src/hooks/useMapSettings.ts
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapSettings, DEFAULT_MAP_SETTINGS } from '../types/mapSettings';

const STORAGE_KEY = 'map_settings';

// Every mounted instance hears about a change made through any other one
// (same pattern as useNotificationSettings) — the map style is picked on
// the full-screen map, and Home's preview behind it must follow at once.
const listeners = new Set<(settings: MapSettings) => void>();

export const useMapSettings = () => {
  const [settings, setSettings] = useState<MapSettings>(DEFAULT_MAP_SETTINGS);

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) setSettings({ ...DEFAULT_MAP_SETTINGS, ...JSON.parse(raw) });
  }, []);

  useEffect(() => {
    load();
    listeners.add(setSettings);
    return () => {
      listeners.delete(setSettings);
    };
  }, [load]);

  const update = async (updated: MapSettings) => {
    listeners.forEach(listener => listener(updated));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return { settings, update };
};
