// src/services/deviceTrackingService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundGeolocation, {
  HeadlessEvent,
  Location,
} from 'react-native-background-geolocation';
import { EXPOSURE_TRACKING_CONFIG } from '../config/exposureTrackingConfig';
import { GeoJsonPointFeature } from '../types/exposure';

// The user's opt-in for background tracking (see useExposureTrackingSettings).
export const TRACKING_ENABLED_STORAGE_KEY = 'exposure_tracking_enabled';

let isConfigured = false;

// Records one fresh fix into the plugin's own store, so it is picked up by
// getTodayRawLocations and ingested like any other ping. Never throws:
// indoors a fix can time out, and a missed ping must not break the caller.
export const recordCurrentPosition = async (): Promise<void> => {
  const { samples, timeoutSeconds, maximumAgeMs } =
    EXPOSURE_TRACKING_CONFIG.currentPosition;
  try {
    await BackgroundGeolocation.getCurrentPosition({
      samples,
      timeout: timeoutSeconds,
      maximumAge: maximumAgeMs,
      persist: true,
    });
  } catch (error) {
    console.log('Failed to record current position:', error);
  }
};

// Heartbeats fire in every tracking state, but while moving the distance
// filter already records pings — only a still phone needs the extra fix.
const recordStationaryPing = async (): Promise<void> => {
  const state = await BackgroundGeolocation.getState();
  if (!state.enabled || state.isMoving) return;
  await recordCurrentPosition();
};

// The Transistor Software SDK license key is registered natively (not
// through this JS config) — Android: AndroidManifest.xml meta-data
// com.transistorsoft.locationmanager.license; iOS: Info.plist
// BackgroundGeolocationLicense. Free for dev/evaluation; a paid license is
// required for production builds.
const configure = async (): Promise<void> => {
  if (isConfigured) return;
  // Registered before ready() as the plugin recommends, so no heartbeat is
  // missed while the app is open. Once the app is closed, heartbeats go to
  // the headless task in index.js instead.
  BackgroundGeolocation.onHeartbeat(() => {
    recordStationaryPing().catch(error =>
      console.log('Stationary heartbeat failed:', error),
    );
  });
  await BackgroundGeolocation.ready({
    geolocation: {
      desiredAccuracy: BackgroundGeolocation.DesiredAccuracy.High,
      distanceFilter: EXPOSURE_TRACKING_CONFIG.distanceFilterMeters,
      // A still phone indoors often gets the very same fused fix back; by
      // default the plugin drops it, which would empty out the indoor stay
      // the heartbeat is there to record.
      allowIdenticalLocations: true,
    },
    app: {
      stopOnTerminate: false,
      startOnBoot: true,
      heartbeatInterval: EXPOSURE_TRACKING_CONFIG.stationaryHeartbeatSeconds,
      enableHeadless: true,
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

// Called once at app launch: the plugin keeps tracking natively across
// restarts, but this JS context still needs configure() for its heartbeat
// listener — otherwise a session spent outside the Exposure/Settings tabs
// would drop every stationary ping (headless only runs once the app is closed).
export const resumeTrackingIfEnabled = async (): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(TRACKING_ENABLED_STORAGE_KEY);
    if (raw === 'true') await startTracking();
  } catch (error) {
    console.log('Failed to resume exposure tracking:', error);
  }
};

// Plugin events delivered while the app is closed (stopOnTerminate: false).
// Must await all its work — the JS runtime is torn down when it returns.
export const handleTrackingHeadlessEvent = async (
  event: HeadlessEvent,
): Promise<void> => {
  if (event.name === BackgroundGeolocation.Event.Heartbeat) {
    await recordStationaryPing();
  }
};

// Registered from index.js, outside the React tree, since a headless run
// has no UI.
export const registerTrackingHeadlessTask = (): void => {
  BackgroundGeolocation.registerHeadlessTask(handleTrackingHeadlessEvent);
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
