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

export interface PlaceLabelDataProvider {
  // Idempotent create-or-update, keyed by labelId.
  upsert: (label: PlaceLabel) => Promise<void>;
  // Resolves when the label is gone, including when it never existed.
  remove: (labelId: string, contributorId: string) => Promise<void>;
}
