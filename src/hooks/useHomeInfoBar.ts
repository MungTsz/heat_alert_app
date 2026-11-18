// src/hooks/useHomeInfoBar.ts
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HOME_INFO_BAR_CONFIG } from '../config/homeLayoutConfig';

const STORAGE_KEY = 'home_info_bar';

type StoredState = { expanded: boolean };

// Whether Home's side bar is open, kept across launches (same AsyncStorage
// pattern as useMapSettings). Starts at the configured default until the
// stored choice loads, and a failed read or write just keeps that default:
// it is a convenience, not data the user would lose.
export const useHomeInfoBar = () => {
  const [expanded, setExpanded] = useState<boolean>(HOME_INFO_BAR_CONFIG.defaultExpanded);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!raw || cancelled) return;
        const stored: Partial<StoredState> = JSON.parse(raw);
        if (typeof stored.expanded === 'boolean') setExpanded(stored.expanded);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(() => {
    setExpanded(previous => {
      const next = !previous;
      const stored: StoredState = { expanded: next };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored)).catch(() => {});
      return next;
    });
  }, []);

  return { expanded, toggle };
};
