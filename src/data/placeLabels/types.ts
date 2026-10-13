import { PlaceCategory } from '../../types/bookmark';

// One crowd-sourced place label as the backend receives it — category +
// circle only. The user's own place name and address never leave the
// device: the server doesn't need them, and a Home's name/address is
// personal.
export type PlaceLabel = {
  labelId: string;
  contributorId: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  updatedAt: number; // epoch ms
};

// Rejections no retry can fix, per the API doc: 403 = the label_id belongs
// to another contributor, 422 = a field the server won't accept. Anything
// else (offline, 5xx, timeout) is worth retrying on the next sync.
const PERMANENT_FAILURE_STATUSES = [403, 422];

export const isPermanentPlaceLabelError = (error: unknown): boolean =>
  PERMANENT_FAILURE_STATUSES.includes((error as { status?: number })?.status ?? 0);

export interface PlaceLabelDataProvider {
  // Idempotent create-or-update, keyed by labelId.
  upsert: (label: PlaceLabel) => Promise<void>;
  // Resolves when the label is gone, including when it never existed.
  remove: (labelId: string, contributorId: string) => Promise<void>;
}
