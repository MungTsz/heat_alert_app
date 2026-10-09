// src/hooks/useImportProgress.ts
import { useSyncExternalStore } from 'react';
import {
  getImportProgressJobs,
  subscribeImportProgress,
} from '../services/importProgressBus';

// Subscribes a component to the live import-progress registry.
export const useImportProgress = () =>
  useSyncExternalStore(subscribeImportProgress, getImportProgressJobs);
