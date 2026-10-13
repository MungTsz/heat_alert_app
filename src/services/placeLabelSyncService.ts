// src/services/placeLabelSyncService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isPermanentPlaceLabelError,
  isPlaceLabelDataMocked,
  placeLabelDataProvider,
  PlaceLabel,
} from '../data/placeLabels';
import { BookmarkEntry } from '../types/bookmark';
import { readBookmarks } from './bookmarkStorage';

const CONTRIBUTOR_ID_KEY = 'place_label_contributor_id';
// labelId → the bookmark's updatedAt as of its last successful upload.
const SYNC_STATE_KEY = 'place_label_sync_state';

type SyncState = Record<string, number>;

// A random per-install id so the backend can tell which labels this device
// may update/delete — deliberately not the exposure pid or anything that
// identifies the person.
export const getContributorId = async (): Promise<string> => {
  const existing = await AsyncStorage.getItem(CONTRIBUTOR_ID_KEY);
  if (existing) return existing;
  const id = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(CONTRIBUTOR_ID_KEY, id);
  return id;
};

const readSyncState = async (): Promise<SyncState> => {
  const raw = await AsyncStorage.getItem(SYNC_STATE_KEY);
  return raw ? JSON.parse(raw) : {};
};

const writeSyncState = (state: SyncState): Promise<void> =>
  AsyncStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));

const toPlaceLabel = (bookmark: BookmarkEntry, contributorId: string): PlaceLabel => ({
  labelId: bookmark.id,
  contributorId,
  category: bookmark.category,
  latitude: bookmark.latitude,
  longitude: bookmark.longitude,
  radiusMeters: bookmark.radiusMeters,
  updatedAt: bookmark.updatedAt,
});

// Diff-based rather than a queue of pending operations: whatever the stored
// bookmarks look like now is what the server should end up with, so a
// failed or interrupted run is simply redone in full next time. State is
// saved after every item so one failure doesn't make finished uploads repeat.
const reconcile = async (): Promise<void> => {
  const [bookmarks, state, contributorId] = await Promise.all([
    readBookmarks(),
    readSyncState(),
    getContributorId(),
  ]);
  let firstError: unknown = null;

  for (const bookmark of bookmarks) {
    if (state[bookmark.id] === bookmark.updatedAt) continue;
    try {
      await placeLabelDataProvider.upsert(toPlaceLabel(bookmark, contributorId));
    } catch (error) {
      if (!isPermanentPlaceLabelError(error)) {
        firstError ??= error;
        continue;
      }
      // Recorded as handled so it isn't resent on every sync forever — the
      // place still works locally, it just doesn't feed the shared dataset.
      console.log(`Place label ${bookmark.id} rejected permanently:`, error);
    }
    state[bookmark.id] = bookmark.updatedAt;
    await writeSyncState(state);
  }

  const liveIds = new Set(bookmarks.map(bookmark => bookmark.id));
  for (const labelId of Object.keys(state)) {
    if (liveIds.has(labelId)) continue;
    try {
      await placeLabelDataProvider.remove(labelId, contributorId);
    } catch (error) {
      if (!isPermanentPlaceLabelError(error)) {
        firstError ??= error;
        continue;
      }
      console.log(`Place label ${labelId} delete rejected permanently:`, error);
    }
    delete state[labelId];
    await writeSyncState(state);
  }

  if (firstError) throw firstError;
};

// Runs are chained one after another: useBookmarkList is mounted in more than
// one place, and two overlapping runs could upload the same label twice or
// overwrite each other's sync state.
let queue: Promise<void> = Promise.resolve();

export const syncPlaceLabels = (): Promise<void> => {
  // With no exposure backend configured there's nothing to sync to — and
  // recording mock "successes" would stop those labels from ever being
  // uploaded once a backend URL is set.
  if (isPlaceLabelDataMocked) return Promise.resolve();
  const run = queue.then(reconcile);
  queue = run.catch(() => {});
  return run;
};
