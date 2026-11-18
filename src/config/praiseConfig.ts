import Config from 'react-native-config';

export const PRAISE_CONFIG = {
  apiKey: Config.PRAISE_API_KEY ?? '',
  myId: Config.PRAISE_MYID ?? '',
  baseUrl: Config.PRAISE_BASE_URL ?? 'https://envf.ust.hk/uwsgi/praise-service',
};

// One check for everything that needs PRAISE. There is no mock AQHI: without
// the key, praiseApi refuses every call, AQHI shows "--", the map never
// opens on the AQHI layer and the alert engine skips AQHI.
export const isPraiseConfigured = (): boolean =>
  PRAISE_CONFIG.apiKey.length > 0;
