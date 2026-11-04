// src/components/HeatAlertEngine.tsx
import { useCallback, useEffect } from 'react';
import { useLocation } from '../utils/useLocation';
import { useForecastData } from '../hooks/useForecastData';
import { useBookmarkList } from '../hooks/useBookmarkList';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { heatDataProvider } from '../data/heat';
import { lastObservedIndex } from '../data/forecast';
import { SPATIAL_TEMP_CONFIG } from '../config/spatialTempConfig';
import {
  evaluateCurrentThreshold,
  evaluateUpcomingTrend,
  evaluateSustainedTrend,
  evaluateCommunityThresholds,
} from '../utils/alertRules';
import {
  ensureNotificationSetup,
  deliverNewAlerts,
} from '../services/notificationService';
import { registerHeatAlertTrigger } from '../services/heatAlertBus';
import { HeatAlert } from '../types/alerts';
import { FALLBACK_CENTER } from '../config/locationConfig';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Reads heat index from the provider on every tick (rather than through a
// hook) because a hook only refetches when its inputs change — the alert
// check must see each new hourly API value even if the user never moves.
// A failed lookup skips that place's rule for this tick; it never falls
// back to an estimate, so a push alert always matches what the app shows.
const heatIndexOrNull = (latitude: number, longitude: number) =>
  heatDataProvider
    .getHeatIndexAt({ latitude, longitude })
    .then(Math.round)
    .catch(err => {
      console.log('Alert engine heat index fetch error:', err);
      return null;
    });

const HeatAlertEngine = () => {
  const { coords } = useLocation();
  const { settings, loading: settingsLoading } = useNotificationSettings();
  const { bookmarks } = useBookmarkList();

  const center = coords ?? FALLBACK_CENTER;
  const { days } = useForecastData(center);

  const runCheck = useCallback(async () => {
    if (settingsLoading) return;
    await ensureNotificationSetup();

    const [currentTemp, ...bookmarkTemps] = await Promise.all([
      heatIndexOrNull(center.latitude, center.longitude),
      ...bookmarks.map(b => heatIndexOrNull(b.latitude, b.longitude)),
    ]);

    const alerts: HeatAlert[] = [];

    if (currentTemp !== null) {
      const currentAlert = evaluateCurrentThreshold(currentTemp, settings);
      if (currentAlert) alerts.push(currentAlert);
    }

    // Skipped while the forecast is demo data borrowed from history, so a
    // placeholder never triggers a real "heat rising" push notification.
    if (days.length > 0 && !SPATIAL_TEMP_CONFIG.forecastFromHistory) {
      const today = days[0];
      const currentHourIndex = lastObservedIndex(today.points);

      const trendAlert = evaluateUpcomingTrend(
        today.points,
        currentHourIndex,
        settings,
      );
      if (trendAlert) alerts.push(trendAlert);

      const sustainedAlert = evaluateSustainedTrend(days, settings);
      if (sustainedAlert) alerts.push(sustainedAlert);
    }

    const bookmarksWithTemp = bookmarks.flatMap((b, i) => {
      const temperature = bookmarkTemps[i];
      return temperature === null
        ? []
        : [{ id: b.id, label: b.label, temperature }];
    });
    alerts.push(...evaluateCommunityThresholds(bookmarksWithTemp, settings));

    await deliverNewAlerts(alerts);
  }, [
    settingsLoading,
    settings,
    days,
    bookmarks,
    center.latitude,
    center.longitude,
  ]);

  useEffect(() => {
    registerHeatAlertTrigger(runCheck);
  }, [runCheck]);

  useEffect(() => {
    runCheck();
    const interval = setInterval(runCheck, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [runCheck]);

  return null;
};

export default HeatAlertEngine;
