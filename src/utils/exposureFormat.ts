// src/utils/exposureFormat.ts

// Text formatting shared by the exposure map sheets and the day timeline, so
// a stay or trip reads the same in the list as in its sheet.

export const formatDuration = (ms: number): string => {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

export const formatTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const formatDateTime = (ms: number): string =>
  new Date(ms).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// "CLEAR WATER BAY ROAD" → "Clear Water Bay Road": the backend sends the
// Lands Department's all-caps names, which read as shouting in a sheet.
export const formatRoadName = (raw: string): string =>
  raw.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());

// "via Clear Water Bay Road → Hang Hau Road +2 more" — only the first few
// roads, in travel order; a long bus ride can touch a dozen.
export const formatRoadList = (roadNames: string[], maxShown: number): string | null => {
  if (roadNames.length === 0) return null;
  const shown = roadNames.slice(0, maxShown).map(formatRoadName).join(' → ');
  const hidden = roadNames.length - maxShown;
  return `via ${shown}${hidden > 0 ? ` +${hidden} more` : ''}`;
};
