import { PlaceLabelDataProvider } from './types';

// Stand-in until the backend's /place-labels endpoint ships — accepts every
// call and stores nothing. placeLabelSyncService skips syncing entirely
// while this is live, so labels added in the meantime still upload once the
// real API is switched on.
export const mockPlaceLabelProvider: PlaceLabelDataProvider = {
  upsert: async () => {},
  remove: async () => {},
};
