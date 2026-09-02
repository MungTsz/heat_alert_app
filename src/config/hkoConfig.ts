import Config from 'react-native-config';

export const HKO_CONFIG = {
  baseUrl:
    Config.HKO_BASE_URL ??
    'https://data.weather.gov.hk/weatherAPI/opendata/weather.php',
  station: Config.HKO_STATION ?? 'Hong Kong Observatory',
};
