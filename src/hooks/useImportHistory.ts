// src/hooks/useImportHistory.ts
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImportHistoryEntry } from '../types/exposure';

const STORAGE_KEY = 'exposure_import_history';
// User-curated saves, not an auto-generated log — no time-based pruning,
// just a cap so repeated imports don't grow storage unbounded.
const MAX_ENTRIES = 20;

// Module-level so every hook instance shares one write queue.
let addQueue: Promise<void> = Promise.resolve();

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

  // Read-modify-write against storage (not the `imports` closure), queued
  // behind any in-flight add: ImportTrackModal processes files in parallel,
  // and several adds from the same render would otherwise all start from the
  // same stale list and overwrite each other, keeping only the last entry.
  const addImport = (sourceLabel: string, previewPid: string) => {
    const entry: ImportHistoryEntry = {
      id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      importedAt: Date.now(),
      sourceLabel,
      previewPid,
    };
    const run = addQueue.then(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const current: ImportHistoryEntry[] = raw ? JSON.parse(raw) : [];
      const updated = [entry, ...current].slice(0, MAX_ENTRIES);
      setImports(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    });
    // Keep the chain alive even if one write fails.
    addQueue = run.catch(() => {});
    return run;
  };

  const removeImport = async (id: string) => {
    const updated = imports.filter(entry => entry.id !== id);
    setImports(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return { imports, loading, addImport, removeImport };
};
