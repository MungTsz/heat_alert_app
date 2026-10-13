import { mockPlaceLabelProvider } from './mockPlaceLabelProvider';
import { apiPlaceLabelProvider } from './apiPlaceLabelProvider';
import { isPlaceLabelApiConfigured } from '../../config/placeLabelConfig';
import { PlaceLabelDataProvider } from './types';

// Goes live once EXPOSURE_API_BASE_URL is set AND PLACE_LABEL_SYNC_ENABLED is
// true — the second flag exists because the backend endpoint is newer than
// the rest of the exposure API.
export const placeLabelDataProvider: PlaceLabelDataProvider = isPlaceLabelApiConfigured()
  ? apiPlaceLabelProvider
  : mockPlaceLabelProvider;

export const isPlaceLabelDataMocked = placeLabelDataProvider === mockPlaceLabelProvider;

export * from './types';
