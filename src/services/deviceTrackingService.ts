// src/services/deviceTrackingService.ts
import BackgroundGeolocation, {
  Location,
} from 'react-native-background-geolocation';
import { TrackPoint } from '../types/exposure';

let isConfigured = false;

// The Transistor Software SDK license key is registered natively (not
// through this JS config) — Android: AndroidManifest.xml meta-data
// com.transistorsoft.locationmanager.license; iOS: Info.plist
// BackgroundGeolocationLicense. Free for dev/evaluation; a paid license is
// required for production builds.
const configure = async (): Promise<void> => {
  if (isConfigured) return;
  await BackgroundGeolocation.ready({
    geolocation: {
      desiredAccuracy: BackgroundGeolocation.DesiredAccuracy.High,
      distanceFilter: 30, // meters — roughly matches the segmentation radius used downstream
    },
    app: {
      stopOnTerminate: false,
      startOnBoot: true,
    },
    logger: {
      debug: false,
      logLevel: BackgroundGeolocation.LogLevel.Error,
    },
  });
  isConfigured = true;
};

export const startTracking = async (): Promise<void> => {
  await configure();
  await BackgroundGeolocation.start();
};

export const stopTracking = async (): Promise<void> => {
  await configure();
  await BackgroundGeolocation.stop();
};

const toTrackPoint = (location: Location): TrackPoint => ({
  lat: location.coords.latitude,
  lon: location.coords.longitude,
  timestampMs: new Date(location.timestamp).getTime(),
  speed:
    typeof location.coords.speed === 'number' && location.coords.speed >= 0
      ? location.coords.speed
      : undefined,
});

// Reads back everything the library has recorded since local midnight — it
// persists locations itself, so no separate AsyncStorage log is needed.
export const getTodayTrackPoints = async (): Promise<TrackPoint[]> => {
  await configure();
  const locations = (await BackgroundGeolocation.getLocations()) as Location[];
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayMs = startOfDay.getTime();

  return locations
    .map(toTrackPoint)
    .filter(point => point.timestampMs >= startOfDayMs)
    .sort((a, b) => a.timestampMs - b.timestampMs);
};
