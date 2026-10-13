import { mockPlaceLabelProvider } from './mockPlaceLabelProvider';
import { apiPlaceLabelProvider } from './apiPlaceLabelProvider';
import { isPlaceLabelApiConfigured } from '../../config/placeLabelConfig';
import { PlaceLabelDataProvider } from './types';

// Goes live whenever EXPOSURE_API_BASE_URL is set, together with the
// exposure data provider — both talk to the same backend.
export const placeLabelDataProvider: PlaceLabelDataProvider = isPlaceLabelApiConfigured()
  ? apiPlaceLabelProvider
  : mockPlaceLabelProvider;

export const isPlaceLabelDataMocked = placeLabelDataProvider === mockPlaceLabelProvider;

export * from './types';
