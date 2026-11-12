// src/hooks/useDefaultMapLayer.ts
import { HazardKind, PlaceAlertProfile } from '../types/alerts';
import { MapLayer } from '../types/mapSettings';
import { isPraiseConfigured } from '../config/praiseConfig';
import { pickDefaultMapLayer } from '../utils/defaultMapLayer';
import { useNotificationSettings } from './useNotificationSettings';

// The hazard layer a map opens on, for every screen that shows a map —
// from the values the screen already has, so no extra lookups. `profile`
// is whose alert level counts: a saved place's own profile on that place's
// map, otherwise the owner's About you answer.
export const useDefaultMapLayer = (
  current: Record<HazardKind, number | null>,
  profile?: PlaceAlertProfile,
): MapLayer => {
  const aboutYou = useNotificationSettings().settings.currentLocationProfile;
  return pickDefaultMapLayer({
    current,
    profile: profile ?? aboutYou,
    praiseConfigured: isPraiseConfigured(),
    nowMs: Date.now(),
  });
};
