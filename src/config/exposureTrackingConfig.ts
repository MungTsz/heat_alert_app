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

// Tunables for judging where the owner is right now (indoors / outdoors /
// on the move / unknown) from the tracked positions above —
// utils/locationContext.ts. All on the phone; nothing extra is uploaded.
// Speeds, jitter and the drift margin are the exposure backend's own
// values (app/config/pipeline.py, io_types.py), so Home's advice and the
// Exposure tab read the same positions the same way.
export const LOCATION_CONTEXT_CONFIG = {
  // Outside every saved place, moving about on foot, for at least this
  // long before the advice turns to the outdoor version. Shorter, and
  // someone who just stepped out of an unsaved building would be called
  // outdoors.
  outdoorMinMinutes: 15,
  // Faster than this is a vehicle (backend WALK_MAX_V, ~3 m/s); slower than
  // stillMaxSpeedMps is sitting still (backend STILL_MAX_V, ~0.5 m/s).
  transitMinSpeedMps: 3,
  stillMaxSpeedMps: 0.5,
  // A ping's speed is its net displacement over the trailing window, less
  // GPS jitter, over at least the minimum span — a still phone indoors
  // jitters 10-20 m per ping, so per-ping speeds are useless (backend
  // V_NET_WINDOW_S, V_NET_MIN_SPAN_S, NOISE_DEG ≈ 30 m).
  speedWindowSeconds: 120,
  speedMinSpanSeconds: 60,
  gpsNoiseMeters: 30,
  // A vehicle stopped at lights or a bus stop is still on the move for this
  // long after its last fast ping (backend STOP_MAX_S).
  transitHoldMinutes: 3,
  // The newest position must be this fresh. A still phone records one fix
  // every stationaryHeartbeatSeconds (5 min); three missed heartbeats means
  // the app no longer knows where the phone is.
  maxFixAgeMinutes: 15,
  // Two positions further apart than this in time leave a hole the phone
  // could have been anywhere in (underground in the MTR, deep inside a
  // building) — an outdoor run can't span one.
  maxGapMinutes: 10,
  // Fixes blurrier than this (cell-tower fixes) can't tell a building from
  // the street outside it, so they are ignored.
  maxAccuracyMeters: 100,
  // Indoor GPS drifts out of a tight place circle; a saved place counts this
  // much wider, as the backend's place labels do (PLACE_LABEL_DRIFT_MARGIN_M).
  placeDriftMarginMeters: 30,
  // A correction ("I'm indoors") lasts for this stay: until the phone is
  // this far from where it was made, or HK midnight.
  overrideRadiusMeters: 100,
  // How often Home re-reads the tracked positions while it is open.
  refreshSeconds: 60,
};
