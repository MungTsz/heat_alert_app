export type HeatAlertCategory =
  | 'current_threshold'
  | 'upcoming_trend'
  | 'sustained_trend'
  | 'community_threshold';

export type HeatAlert = {
  // Encodes category + context (classification, day, house id, etc.) so the
  // same underlying condition always produces the same id — this is what
  // the dedup/cooldown layer keys off of.
  id: string;
  category: HeatAlertCategory;
  title: string;
  body: string;
};
