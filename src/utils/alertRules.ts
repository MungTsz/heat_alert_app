import { getHeatIndexInfo } from './heatIndexUtils';
import { HeatAlert } from '../types/alerts';
import {
  NotificationSettings,
  HEAT_LEVELS_ORDERED,
  HeatLevel,
} from '../types/settings';
import { DayForecast, HourlyForecastPoint } from '../data/forecast/types';

const rank = (level: string): number =>
  HEAT_LEVELS_ORDERED.indexOf(level as HeatLevel);

const isEnabled = (settings: NotificationSettings, level: string): boolean => {
  return !!settings.alertLevels[level as HeatLevel];
};

// Rule 1: current location's heat index crosses a level the user has enabled
export const evaluateCurrentThreshold = (
  currentTemp: number,
  settings: NotificationSettings,
): HeatAlert | null => {
  if (!settings.notifyCurrentLocation) return null;

  const { classification } = getHeatIndexInfo(currentTemp);
  if (!isEnabled(settings, classification)) return null;
  if (rank(classification) <= rank('Very Warm')) return null; // don't alert on mild levels even if toggled on accidentally

  const actionByLevel: Record<string, string> = {
    Hot: 'Stay hydrated and take breaks in the shade.',
    'Very Hot':
      'Avoid outdoor activity where possible. Stay hydrated and cool.',
    'Extremely Hot':
      'Avoid outdoor activity now. If indoors, turn on air conditioning and stay hydrated.',
  };

  return {
    id: `current-threshold:${classification}`,
    category: 'current_threshold',
    title: `Heat Index: ${classification} (${currentTemp}°C)`,
    body: actionByLevel[classification] ?? 'Take precautions against the heat.',
  };
};

// Rule 2: the next few hours are trending into a hotter zone than right now
export const evaluateUpcomingTrend = (
  todayPoints: HourlyForecastPoint[],
  currentHourIndex: number,
  settings: NotificationSettings,
): HeatAlert | null => {
  if (!settings.notifyCurrentLocation) return null;
  if (currentHourIndex < 0 || currentHourIndex >= todayPoints.length)
    return null;

  const currentTemp = todayPoints[currentHourIndex].heatIndex;
  const currentClass = getHeatIndexInfo(currentTemp).classification;

  const lookahead = todayPoints.slice(
    currentHourIndex + 1,
    currentHourIndex + 4,
  ); // next ~3 hours
  if (lookahead.length === 0) return null;

  const peakPoint = lookahead.reduce((max, p) =>
    p.heatIndex > max.heatIndex ? p : max,
  );
  const peakClass = getHeatIndexInfo(peakPoint.heatIndex).classification;

  if (rank(peakClass) <= rank(currentClass)) return null; // not actually rising
  if (!isEnabled(settings, peakClass)) return null;
  if (rank(peakClass) <= rank('Very Warm')) return null;

  return {
    id: `upcoming-trend:${currentClass}->${peakClass}:${peakPoint.time}`,
    category: 'upcoming_trend',
    title: `Heat rising to ${peakClass} by ${peakPoint.time}`,
    body: `Plan to head indoors and avoid outdoor activity before then. If you're already inside, turn on air conditioning.`,
  };
};

// Rule 3: the coming days stay hot, not just today
export const evaluateSustainedTrend = (
  days: DayForecast[],
  settings: NotificationSettings,
): HeatAlert | null => {
  if (!settings.notifyCurrentLocation) return null;
  if (days.length < 2) return null;

  const dailyPeaks = days.map(day => {
    const maxPoint = day.points.reduce((max, p) =>
      p.heatIndex > max.heatIndex ? p : max,
    );
    return {
      dayLabel: day.dayLabel,
      classification: getHeatIndexInfo(maxPoint.heatIndex).classification,
    };
  });

  const allHotOrWorse = dailyPeaks.every(
    d => rank(d.classification) >= rank('Hot'),
  );
  if (!allHotOrWorse) return null;

  const worstClass = dailyPeaks.reduce(
    (worst, d) =>
      rank(d.classification) > rank(worst) ? d.classification : worst,
    dailyPeaks[0].classification,
  );

  if (!isEnabled(settings, worstClass)) return null;

  return {
    id: `sustained-trend:${worstClass}:${days.length}`,
    category: 'sustained_trend',
    title: `Hot weather continuing for ${days.length} days`,
    body: `Heat index is expected to reach ${worstClass} on multiple upcoming days. Plan outdoor activities for early morning or evening.`,
  };
};

// Rule 4: a monitored community house crosses an enabled threshold
export const evaluateCommunityThresholds = (
  housesWithTemp: { id: string; label: string; temperature: number }[],
  settings: NotificationSettings,
): HeatAlert[] => {
  if (!settings.notifyBookmarkedLocations) return [];

  const alerts: HeatAlert[] = [];
  for (const house of housesWithTemp) {
    const { classification } = getHeatIndexInfo(house.temperature);
    if (!isEnabled(settings, classification)) continue;
    if (rank(classification) <= rank('Very Warm')) continue;

    alerts.push({
      id: `community:${house.id}:${classification}`,
      category: 'community_threshold',
      title: `${house.label}: ${classification} (${house.temperature}°C)`,
      body: `Heat index at ${house.label} has reached ${classification}. Consider checking in.`,
    });
  }
  return alerts;
};
