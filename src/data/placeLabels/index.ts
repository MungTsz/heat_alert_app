import { apiPlaceLabelProvider } from './apiPlaceLabelProvider';
import { PlaceLabelDataProvider } from './types';

// API only, by design (no mock provider) — the same backend as the exposure
// data. placeLabelSyncService skips syncing while that backend isn't
// configured, so labels added in the meantime still upload once it is.
export const placeLabelDataProvider: PlaceLabelDataProvider = apiPlaceLabelProvider;

export * from './types';
