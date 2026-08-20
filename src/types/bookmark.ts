export type BookmarkType = 'house' | 'place';

export type BookmarkEntry = {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  type: BookmarkType;
};
