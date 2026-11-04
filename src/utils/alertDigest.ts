// src/utils/alertDigest.ts
import { DigestSlot, NotificationSettings } from '../types/settings';
import { DIGEST_CONFIG } from '../config/alertConfig';
import { addHkDays, parseHkTimestamp, toHkDateKey } from './hkDate';

// When the scheduled digests (evening heads-up, morning reminder) fall due.
// Pure: the caller passes the clock and the record of digests already sent.

// HK date key ("2026-11-04") of the last time each slot was sent.
export type DigestLog = Partial<Record<DigestSlot, string>>;

const MINUTE_MS = 60 * 1000;
const DIGEST_SLOTS: readonly DigestSlot[] = ['morning', 'evening'];

const hkMidnightMs = (dateKey: string): number => parseHkTimestamp(`${dateKey.replace(/-/g, '')}00`);

export const digestTimeOn = (dateKey: string, minuteOfDay: number): number =>
  hkMidnightMs(dateKey) + minuteOfDay * MINUTE_MS;

// The slot to send now: its time today has passed, it isn't more than the
// late window ago, and it hasn't gone out today. Morning is checked first
// so a phone waking at 8 am never sends yesterday's evening slot instead.
export const dueDigestSlot = (
  nowMs: number,
  settings: Pick<NotificationSettings, 'digests'>,
  log: DigestLog,
): DigestSlot | null => {
  const today = toHkDateKey(new Date(nowMs));
  for (const slot of DIGEST_SLOTS) {
    const { enabled, minute } = settings.digests[slot];
    if (!enabled || log[slot] === today) continue;
    const at = digestTimeOn(today, minute);
    if (nowMs >= at && nowMs < at + DIGEST_CONFIG.lateWindowMs) return slot;
  }
  return null;
};

// The next enabled digest strictly after now — null when both are off,
// which sends heads-ups as they happen instead of holding them.
export const nextDigest = (
  nowMs: number,
  settings: Pick<NotificationSettings, 'digests'>,
): { slot: DigestSlot; atMs: number } | null => {
  const today = toHkDateKey(new Date(nowMs));
  const candidates = [today, addHkDays(today, 1)].flatMap(day =>
    DIGEST_SLOTS.filter(slot => settings.digests[slot].enabled).map(slot => ({
      slot,
      atMs: digestTimeOn(day, settings.digests[slot].minute),
    })),
  );
  return (
    candidates.filter(c => c.atMs > nowMs).sort((a, b) => a.atMs - b.atMs)[0] ?? null
  );
};
