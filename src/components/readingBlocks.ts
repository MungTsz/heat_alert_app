// src/components/readingBlocks.ts
import { Droplet, Thermometer, ThermometerSun, Wind } from 'lucide-react-native';
import { HomeInfoBlockData } from './HomeInfoBlock';
import { HOME_INFO_BAR_COPY } from '../config/alertCopy';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';
import { formatAqhiValue, getAqhiInfo } from '../utils/aqhiUtils';

// The four readings at one spot; null = loading / unavailable → "--".
export type SpotReadings = {
  heatIndex: number | null;
  aqhi: number | null;
  temperature: number | null;
  humidity: number | null;
};

// The four reading blocks — Heat index, AQHI, Temp, Humidity — built in one
// place, so Home's side bar and the map's tapped-point card always show the
// same labels, formats and colours. Each hazard in its own colours (NWS for
// heat index, EPD for AQHI); the Environmental Index palette stays on the
// index square. Temp and Humidity have no levels (neutral stripe) and are
// read-only context. The hazards open their forecast only where the caller
// passes a handler.
export const readingBlocks = (
  readings: SpotReadings,
  handlers: { onHeatPress?: () => void; onAqhiPress?: () => void } = {},
): HomeInfoBlockData[] => {
  const { heatIndex, aqhi, temperature, humidity } = readings;
  return [
    {
      key: 'heat',
      Icon: ThermometerSun,
      label: HOME_INFO_BAR_COPY.heat,
      value: heatIndex === null ? null : `${heatIndex}°`,
      stripeColor: heatIndex === null ? null : getHeatIndexInfo(heatIndex).color,
      onPress: handlers.onHeatPress,
    },
    {
      key: 'aqhi',
      Icon: Wind,
      label: HOME_INFO_BAR_COPY.aqhi,
      value: aqhi === null ? null : formatAqhiValue(aqhi),
      // aqhiUtils' per-value colour, as on the AQHI map layer and legend.
      stripeColor: aqhi === null ? null : getAqhiInfo(aqhi).color,
      onPress: handlers.onAqhiPress,
    },
    {
      key: 'temperature',
      Icon: Thermometer,
      label: HOME_INFO_BAR_COPY.temperature,
      value: temperature === null ? null : `${temperature}°`,
      stripeColor: null,
    },
    {
      key: 'humidity',
      Icon: Droplet,
      label: HOME_INFO_BAR_COPY.humidity,
      value: humidity === null ? null : `${humidity}%`,
      stripeColor: null,
    },
  ];
};
