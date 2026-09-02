import { mockExposureProvider } from './mockExposureProvider';
// import { apiExposureProvider } from './apiExposureProvider';

import { ExposureDataProvider } from './types';

// get_exposure_list was live-tested on 2026-09-02 against PRAISE_BASE_URL
// with the real PRAISE_API_KEY and does NOT respond as documented — every
// request shape tried got the same generic 400 a bogus `todo` value gets,
// while a get_data call against the same URL/key succeeded normally (see
// the comment above fetchPraiseExposureList in services/praiseApi.ts for
// the full test log). So this isn't a request-shape bug to fix — the real
// endpoint needs to be confirmed with whoever maintains the API doc before
// this can go live. Stays on mock until then. Matches how heat/forecast are
// handled (manual flip) rather than aqhi's isPraiseConfigured() switch.
export const exposureDataProvider: ExposureDataProvider = mockExposureProvider;

// Lets the UI show a "mock data" indicator without hardcoding that
// assumption in components — flip together with exposureDataProvider above.
export const isExposureDataMocked = exposureDataProvider === mockExposureProvider;

export * from './types';
