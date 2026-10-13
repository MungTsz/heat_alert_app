// src/services/deviceTrackingService.ts
import BackgroundGeolocation, {
  Location,
} from 'react-native-background-geolocation';
import { GeoJsonPointFeature } from '../types/exposure';

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

// /ingest only accepts GeoJSON Point Features (any other record shape is
// skipped server-side), so live locations are converted into the same shape
// an imported GPS export uses. The plugin reports an unknown speed as -1,
// which the backend also reads as "unknown", so it's passed through as-is.
export const toGeoJsonPing = (location: Location): GeoJsonPointFeature => ({
  type: 'Feature',
  properties: {
    time: new Date(location.timestamp).toISOString(),
    speed: location.coords.speed,
  },
  geometry: {
    type: 'Point',
    coordinates: [location.coords.longitude, location.coords.latitude],
  },
});

// `sample` locations are transient reads the plugin itself says not to
// persist — dropped here since the GeoJSON shape has no field to flag them.
// Fake-GPS (`mock`) locations are kept, matching the backend's old behavior.
export const toIngestablePings = (locations: Location[]): GeoJsonPointFeature[] =>
  locations.filter(location => !location.sample).map(toGeoJsonPing);

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
