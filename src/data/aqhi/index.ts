import { mockAqhiProvider } from './mockAqhiProvider';
import { apiAqhiProvider } from './apiAqhiProvider';
import { isPraiseConfigured } from '../../config/praiseConfig';

import { AqhiDataProvider } from './types';

export const aqhiDataProvider: AqhiDataProvider = isPraiseConfigured()
  ? apiAqhiProvider
  : mockAqhiProvider;

export * from './types';
