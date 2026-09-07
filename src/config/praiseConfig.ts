import Config from 'react-native-config';

export const PRAISE_CONFIG = {
  apiKey: Config.PRAISE_API_KEY ?? '',
  myId: Config.PRAISE_MYID ?? '',
  baseUrl: Config.PRAISE_BASE_URL ?? 'https://envf.ust.hk/uwsgi/praise-service',
  // Exposure calculation (expo_calx) lives on a different uwsgi script than
  // the rest of the PRAISE API, hence its own base URL.
  irCalBaseUrl:
    Config.PRAISE_IR_CAL_BASE_URL ?? 'https://praise-web.ust.hk/uwsgi/praise-ir-cal',
};

// Lets every provider check this once instead of duplicating the same guard —
// if the key isn't configured yet, callers fall back to mock data gracefully.
export const isPraiseConfigured = (): boolean =>
  PRAISE_CONFIG.apiKey.length > 0;
