import { PlaceLabelDataProvider } from './types';

// Used when no exposure backend is configured (mock-data mode) — accepts
// every call and stores nothing. placeLabelSyncService skips syncing
// entirely while this is live, so labels added in the meantime still upload
// once a backend URL is set.
export const mockPlaceLabelProvider: PlaceLabelDataProvider = {
  upsert: async () => {},
  remove: async () => {},
};
