// src/utils/hkDate.ts

const HK_UTC_OFFSET_HOURS = 8;
const HOUR_MS = 60 * 60 * 1000;

// Formats a Date as YYYYMMDDhh in Hong Kong time (UTC+8) — the hourly key
// both PRAISE and the spatial temperature API use. Lives here (re-exported by
// praiseApi.ts) so services don't import date math from each other.
export const toHkTimestamp = (date: Date = new Date()): string => {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const hkDate = new Date(utcMs + HK_UTC_OFFSET_HOURS * HOUR_MS);
  const yyyy = hkDate.getFullYear();
  const mm = (hkDate.getMonth() + 1).toString().padStart(2, '0');
  const dd = hkDate.getDate().toString().padStart(2, '0');
  const hh = hkDate.getHours().toString().padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}`;
};

// Inverse of toHkTimestamp: a YYYYMMDDhh HK-time key back to epoch ms.
export const parseHkTimestamp = (ts: string): number =>
  Date.UTC(
    Number(ts.slice(0, 4)),
    Number(ts.slice(4, 6)) - 1,
    Number(ts.slice(6, 8)),
    Number(ts.slice(8, 10)) - HK_UTC_OFFSET_HOURS,
  );

// Moves a YYYYMMDDhh key by whole hours (negative = earlier), going through
// epoch ms so day/month/year rollovers come out right.
export const shiftHkTimestamp = (ts: string, hours: number): string =>
  toHkTimestamp(new Date(parseHkTimestamp(ts) + hours * HOUR_MS));

// Formats a Date as YYYY-MM-DD in Hong Kong local time (UTC+8) — same offset
// math as toHkTimestamp, since the exposure history store keys days by
// HK-local boundaries too.
export const toHkDateKey = (date: Date = new Date()): string => {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const hkDate = new Date(utcMs + HK_UTC_OFFSET_HOURS * HOUR_MS);
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

// The first day of the week containing dateKey, for a week that starts on
// weekStartDay (0 = Sunday … 6 = Saturday, Date#getUTCDay's numbering) —
// plain calendar-date math like addHkDays, so it's stable across timezones.
export const getHkWeekStartKey = (dateKey: string, weekStartDay: number): string => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addHkDays(dateKey, -((weekday - weekStartDay + 7) % 7));
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

// Every YYYY-MM-DD key from first through last, inclusive — one entry per
// calendar day, so a day pager steps exactly one day per page even across
// days with no data.
export const listHkDays = (first: string, last: string): string[] =>
  Array.from({ length: Math.max(0, diffHkDays(first, last)) + 1 }, (_, i) => addHkDays(first, i));
