import { mockAqhiProvider } from './mockAqhiProvider';
// import { apiAqhiProvider } from './apiAqhiProvider'; // wire up when backend is ready

import { AqhiDataProvider } from './types';

export const aqhiDataProvider: AqhiDataProvider = mockAqhiProvider;

export * from './types';
