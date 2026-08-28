// src/hooks/useMapSettings.ts
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapSettings, DEFAULT_MAP_SETTINGS } from '../types/mapSettings';

const STORAGE_KEY = 'map_settings';

export const useMapSettings = () => {
  const [settings, setSettings] = useState<MapSettings>(DEFAULT_MAP_SETTINGS);

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) setSettings({ ...DEFAULT_MAP_SETTINGS, ...JSON.parse(raw) });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (updated: MapSettings) => {
    setSettings(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return { settings, update };
};
