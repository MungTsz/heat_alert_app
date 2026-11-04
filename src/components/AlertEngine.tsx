// src/components/AlertEngine.tsx
import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from '../utils/useLocation';
import { runAlertCheck } from '../services/alertCheckService';
import { registerAlertCheckTrigger } from '../services/alertCheckBus';
import { ALERT_CHECK_INTERVAL_MS } from '../config/alertConfig';

// Headless timer for heat and air quality alerts while the app is open. All
// logic lives in runAlertCheck, which reads places and settings from
// storage on every tick — so edits made on other screens are picked up
// without this component re-subscribing to them.
const AlertEngine = () => {
  const { coords } = useLocation();

  // Read through a ref so a position update doesn't reset the interval.
  const coordsRef = useRef(coords);
  coordsRef.current = coords;

  const check = useCallback(
    (flush: boolean) => runAlertCheck({ coords: coordsRef.current, flush }),
    [],
  );

  useEffect(() => {
    registerAlertCheckTrigger(() => check(true));
  }, [check]);

  useEffect(() => {
    check(false);
    const interval = setInterval(() => check(false), ALERT_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [check]);

  // The first real fix arrives after mount — check then too, so the current
  // location isn't skipped until the next tick.
  const hasCoords = coords !== null;
  useEffect(() => {
    if (hasCoords) check(false);
  }, [hasCoords, check]);

  return null;
};

export default AlertEngine;
