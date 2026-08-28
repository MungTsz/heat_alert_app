import Config from 'react-native-config';

export const PRAISE_CONFIG = {
  apiKey: Config.PRAISE_API_KEY ?? '',
  myId: Config.PRAISE_MYID ?? '',
  baseUrl: Config.PRAISE_BASE_URL ?? 'https://envf.ust.hk/uwsgi/praise-service',
};

// Lets every provider check this once instead of duplicating the same guard —
// if the key isn't configured yet, callers fall back to mock data gracefully.
export const isPraiseConfigured = (): boolean =>
  PRAISE_CONFIG.apiKey.length > 0;
