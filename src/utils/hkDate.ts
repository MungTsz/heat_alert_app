// src/utils/hkDate.ts

// Formats a Date as YYYY-MM-DD in Hong Kong local time (UTC+8) — same offset
// math praiseApi.ts's toHkTimestamp uses, factored out here since the
// exposure history store keys days by HK-local boundaries too.
export const toHkDateKey = (date: Date = new Date()): string => {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const hkDate = new Date(utcMs + 8 * 60 * 60 * 1000);
  const yyyy = hkDate.getFullYear();
  const mm = (hkDate.getMonth() + 1).toString().padStart(2, '0');
  const dd = hkDate.getDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Adds (or subtracts) whole days to a YYYY-MM-DD key, staying a plain
// calendar-date operation (no timezone conversion needed — the key is
// already a date, not an instant).
export const addHkDays = (dateKey: string, days: number): string => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  const yyyy = date.getUTCFullYear();
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = date.getUTCDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Day span between two YYYY-MM-DD keys (positive if b is after a) — plain
// calendar-date math, same as addHkDays, no timezone conversion needed since
// both inputs are already date keys. Callers add +1 for an inclusive count.
export const diffHkDays = (a: string, b: string): number => {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const aMs = Date.UTC(ay, am - 1, ad);
  const bMs = Date.UTC(by, bm - 1, bd);
  return Math.round((bMs - aMs) / 86400000);
};

// The one human-readable date label used across every exposure screen —
// "Today" when it matches todayKey, otherwise a short "Sep 9" style label
// with no year (all exposure history is recent, near-term data). Was
// previously copy-pasted per-component; consolidated here so every date
// label in the Exposure tab reads the same way.
export const formatHkDateLabel = (dateKey: string, todayKey?: string): string => {
  if (todayKey && dateKey === todayKey) return 'Today';
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
};
