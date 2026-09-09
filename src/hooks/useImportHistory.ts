// src/hooks/useImportHistory.ts
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExposureReport, ImportHistoryEntry } from '../types/exposure';

const STORAGE_KEY = 'exposure_import_history';
// User-curated saves, not an auto-generated log — no time-based pruning,
// just a cap so repeated imports don't grow storage unbounded.
const MAX_ENTRIES = 20;

export const useImportHistory = () => {
  const [imports, setImports] = useState<ImportHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadImports = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setImports(raw ? JSON.parse(raw) : []);
    } catch (error) {
      console.log('Failed to load import history:', error);
      setImports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImports();
  }, [loadImports]);

  const addImport = async (sourceLabel: string, report: ExposureReport) => {
    const entry: ImportHistoryEntry = {
      id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      importedAt: Date.now(),
      sourceLabel,
      report,
    };
    const updated = [entry, ...imports].slice(0, MAX_ENTRIES);
    setImports(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const removeImport = async (id: string) => {
    const updated = imports.filter(entry => entry.id !== id);
    setImports(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return { imports, loading, addImport, removeImport };
};
