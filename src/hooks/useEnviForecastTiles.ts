// src/hooks/useEnviForecastTiles.ts
import { Region } from 'react-native-maps';
import { ENVI_MAP_SOURCE } from '../config/mapLayerConfig';
import { SPATIAL_TEMP_CONFIG } from '../config/spatialTempConfig';
import { MapForecastFrame } from '../types/mapSettings';
import { enviForecastSupported } from '../utils/enviMapLayer';

type EnviForecastResult = {
  frames: MapForecastFrame[];
  loading: boolean;
  error: string | null;
};

const NO_FORECAST: EnviForecastResult = { frames: [], loading: false, error: null };

// Environmental Index counterpart of useHeatIndexForecastTiles /
// useAqhiForecastTiles — same arguments, same { frames, loading, error }
// result, frames in the shared MapForecastFrame shape — so Play Forecast
// works the same on every layer.
//
// No frames unless enviForecastSupported: never in the AQHI demo (the AQHI
// forecast is not an index forecast), and with a real index tile only once
// heat has a real forecast too (forecastFromHistory false). With no frames
// MapScreen shows no Play button on this layer.
export const useEnviForecastTiles = (
  region: Region,
  active: boolean,
): EnviForecastResult => {
  const supported = enviForecastSupported({
    source: ENVI_MAP_SOURCE,
    forecastFromHistory: SPATIAL_TEMP_CONFIG.forecastFromHistory,
  });
  if (!active || !supported) return NO_FORECAST;
  // Supported, but the index tile service isn't built yet. When it is,
  // fetch its timeseries for `region` over MAP_LAYER_CONFIG.forecastHours,
  // pre-cache every frame with Image.prefetch and report `loading`
  // meanwhile, exactly as useHeatIndexForecastTiles does. Until then there
  // is nothing to fetch, and no frames are made up.
  return NO_FORECAST;
};
