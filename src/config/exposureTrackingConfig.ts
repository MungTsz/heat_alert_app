// src/config/exposureTrackingConfig.ts

// Tunables for live exposure tracking (deviceTrackingService.ts).
export const EXPOSURE_TRACKING_CONFIG = {
  // While moving, record a ping every this many meters — roughly the
  // stay-point radius the exposure map clusters with (exposureMapConfig.ts).
  distanceFilterMeters: 30,

  // The plugin turns GPS off once the phone is still, so a day at a desk
  // would otherwise send no pings at all and the backend would see a hole
  // instead of an indoor stay. While stationary, a heartbeat records one
  // fresh fix this often. The backend reads a still run longer than its
  // INDOOR_MIN_S as indoors, and repeated positions spanning more than its
  // SPIKE_MAX_S (300 s) as a stay rather than a GPS spike — so 5 min keeps
  // the stay continuous without waking GPS every minute. Android can't go
  // below 60 s, and Doze may stretch it further while the screen is off.
  stationaryHeartbeatSeconds: 5 * 60,

  // getCurrentPosition options for those stationary pings (and the one the
  // Exposure tab takes on each refresh). One sample is enough for a phone
  // that isn't moving; a fix younger than maximumAgeMs is reused instead of
  // waking GPS again, and it stays below the heartbeat so consecutive
  // heartbeats never record the same cached fix twice.
  currentPosition: {
    samples: 1,
    timeoutSeconds: 30,
    maximumAgeMs: 60 * 1000,
  },
};
