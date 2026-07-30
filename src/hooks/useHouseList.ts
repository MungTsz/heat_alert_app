import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HouseEntry } from '../types/house';

const STORAGE_KEY = 'monitored_houses';

export const useHouseList = () => {
  const [houses, setHouses] = useState<HouseEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadHouses = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setHouses(raw ? JSON.parse(raw) : []);
    } catch (error) {
      console.log('Failed to load houses:', error);
      setHouses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHouses();
  }, [loadHouses]);

  const addHouse = async (house: Omit<HouseEntry, 'id'>) => {
    const newHouse: HouseEntry = { ...house, id: `house-${Date.now()}` };
    const updated = [...houses, newHouse];
    setHouses(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const removeHouse = async (id: string) => {
    const updated = houses.filter(h => h.id !== id);
    setHouses(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return { houses, loading, addHouse, removeHouse };
};
