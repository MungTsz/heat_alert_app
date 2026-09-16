// src/services/deviceTrackingService.ts
import BackgroundGeolocation, {
  Location,
} from 'react-native-background-geolocation';
import { LiveTrackingPing } from '../types/exposure';

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

// Maps the plugin's own location shape to the live-tracking ping shape the
// ETL backend's /ingest endpoint accepts directly — sample/mock flags are
// forwarded so the backend can drop transient "samples" itself.
export const toLiveTrackingPing = (location: Location): LiveTrackingPing => ({
  timestamp: location.timestamp,
  coords: { latitude: location.coords.latitude, longitude: location.coords.longitude },
  sample: location.sample,
  mock: location.mock,
});

// Reads back everything the library has recorded since local midnight — it
// persists locations itself, so no separate AsyncStorage log is needed.
export const getTodayRawLocations = async (): Promise<Location[]> => {
  await configure();
  const locations = (await BackgroundGeolocation.getLocations()) as Location[];
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayMs = startOfDay.getTime();

  return locations
    .filter(location => new Date(location.timestamp).getTime() >= startOfDayMs)
    .sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
};
