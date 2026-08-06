import { useCallback, useEffect } from 'react';
import { useLocation } from '../utils/useLocation';
import { useHeatData } from '../hooks/useHeatData';
import { useForecastData } from '../hooks/useForecastData';
import { useHouseList } from '../hooks/useHouseList';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { idwInterpolate } from '../utils/idw';
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

const FALLBACK_CENTER = { latitude: 22.3375, longitude: 114.263 };
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // every 5 min while the app is running

// Renders nothing — mount once near the root of the app.
const HeatAlertEngine = () => {
  const { coords } = useLocation();
  const { settings, loading: settingsLoading } = useNotificationSettings();
  const { houses } = useHouseList();

  const center = coords ?? FALLBACK_CENTER;
  const { points } = useHeatData(center);
  const { days } = useForecastData(center);

  const runCheck = useCallback(async () => {
    if (settingsLoading) return;
    await ensureNotificationSetup();

    const weightedPoints = points.map(p => ({
      latitude: p.latitude,
      longitude: p.longitude,
      value: p.temperature,
    }));
    const currentTemp = Math.round(
      idwInterpolate(center.latitude, center.longitude, weightedPoints),
    );

    const alerts: HeatAlert[] = [];

    const currentAlert = evaluateCurrentThreshold(currentTemp, settings);
    if (currentAlert) alerts.push(currentAlert);

    if (days.length > 0) {
      const today = days[0];
      const now = Date.now();
      const currentHourIndex = today.points.reduce(
        (closestIdx, p, idx) =>
          Math.abs(p.timestamp - now) <
          Math.abs(today.points[closestIdx].timestamp - now)
            ? idx
            : closestIdx,
        0,
      );

      const trendAlert = evaluateUpcomingTrend(
        today.points,
        currentHourIndex,
        settings,
      );
      if (trendAlert) alerts.push(trendAlert);

      const sustainedAlert = evaluateSustainedTrend(days, settings);
      if (sustainedAlert) alerts.push(sustainedAlert);
    }

    const housesWithTemp = houses.map(h => ({
      id: h.id,
      label: h.label,
      temperature: Math.round(
        idwInterpolate(h.latitude, h.longitude, weightedPoints),
      ),
    }));
    alerts.push(...evaluateCommunityThresholds(housesWithTemp, settings));

    await deliverNewAlerts(alerts);
  }, [
    settingsLoading,
    settings,
    points,
    days,
    houses,
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
