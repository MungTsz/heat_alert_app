import { mockAqhiForecastProvider } from './mockAqhiForecastProvider';
import { apiAqhiForecastProvider } from './apiAqhiForecastProvider';
import { isPraiseConfigured } from '../../config/praiseConfig';

import { AqhiForecastProvider } from './types';

export const aqhiForecastProvider: AqhiForecastProvider = isPraiseConfigured()
  ? apiAqhiForecastProvider
  : mockAqhiForecastProvider;

export * from './types';
