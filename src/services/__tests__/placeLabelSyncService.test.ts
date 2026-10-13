const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStore.set(key, value);
      return Promise.resolve();
    }),
  },
}));

const mockUpsert = jest.fn();
const mockRemove = jest.fn();
jest.mock('../../data/placeLabels', () => ({
  ...jest.requireActual('../../data/placeLabels/types'),
  isPlaceLabelDataMocked: false,
  placeLabelDataProvider: {
    upsert: (...args: unknown[]) => mockUpsert(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

import { syncPlaceLabels } from '../placeLabelSyncService';
import { BookmarkEntry } from '../../types/bookmark';

const BOOKMARKS_KEY = 'monitored_bookmarks';

const bookmark = (id: string, updatedAt = 1): BookmarkEntry => ({
  id,
  label: `Name ${id}`,
  address: 'Somewhere',
  latitude: 22.3,
  longitude: 114.17,
  category: 'Office',
  radiusMeters: 25,
  updatedAt,
});

const storeBookmarks = (entries: unknown[]) =>
  mockStore.set(BOOKMARKS_KEY, JSON.stringify(entries));

describe('syncPlaceLabels', () => {
  beforeEach(() => {
    mockStore.clear();
    mockUpsert.mockReset().mockResolvedValue(undefined);
    mockRemove.mockReset().mockResolvedValue(undefined);
  });

  it('uploads category + circle only, never the name or address', async () => {
    storeBookmarks([bookmark('a')]);
    await syncPlaceLabels();

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const sent = mockUpsert.mock.calls[0][0];
    expect(sent).toMatchObject({
      labelId: 'a',
      category: 'Office',
      latitude: 22.3,
      longitude: 114.17,
      radiusMeters: 25,
      updatedAt: 1,
    });
    expect(sent.contributorId).toMatch(/^c-/);
    expect(JSON.stringify(sent)).not.toContain('Name a');
    expect(JSON.stringify(sent)).not.toContain('Somewhere');
  });

  it('skips labels already synced at their current version', async () => {
    storeBookmarks([bookmark('a')]);
    await syncPlaceLabels();
    await syncPlaceLabels();
    expect(mockUpsert).toHaveBeenCalledTimes(1);

    storeBookmarks([bookmark('a', 2)]);
    await syncPlaceLabels();
    expect(mockUpsert).toHaveBeenCalledTimes(2);
  });

  it('deletes labels whose bookmark was removed', async () => {
    storeBookmarks([bookmark('a'), bookmark('b')]);
    await syncPlaceLabels();
    storeBookmarks([bookmark('b')]);
    await syncPlaceLabels();

    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockRemove.mock.calls[0][0]).toBe('a');
  });

  it('retries a failed upload on the next run without repeating finished ones', async () => {
    storeBookmarks([bookmark('a'), bookmark('b')]);
    mockUpsert.mockImplementation(label =>
      label.labelId === 'b' ? Promise.reject(new Error('offline')) : Promise.resolve(),
    );
    await expect(syncPlaceLabels()).rejects.toThrow('offline');

    mockUpsert.mockReset().mockResolvedValue(undefined);
    await syncPlaceLabels();
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert.mock.calls[0][0].labelId).toBe('b');
  });

  it('does not retry a label the server rejected permanently (403)', async () => {
    storeBookmarks([bookmark('taken')]);
    mockUpsert.mockRejectedValue(Object.assign(new Error('belongs to another contributor'), { status: 403 }));
    await expect(syncPlaceLabels()).resolves.toBeUndefined();

    await syncPlaceLabels();
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('treats a permanently rejected delete as done', async () => {
    storeBookmarks([bookmark('a')]);
    await syncPlaceLabels();
    storeBookmarks([]);
    mockRemove.mockRejectedValue(Object.assign(new Error('forbidden'), { status: 403 }));
    await syncPlaceLabels();
    await syncPlaceLabels();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  it('migrates legacy house/place bookmarks and uploads them once', async () => {
    storeBookmarks([
      { id: 'old', label: 'Mum', address: '', latitude: 22.3, longitude: 114.17, type: 'house' },
    ]);
    await syncPlaceLabels();

    expect(mockUpsert.mock.calls[0][0]).toMatchObject({ category: 'Home', radiusMeters: 25 });
    const migrated = JSON.parse(mockStore.get(BOOKMARKS_KEY) as string);
    expect(migrated[0]).toMatchObject({ category: 'Home', radiusMeters: 25, label: 'Mum' });
    expect(migrated[0].type).toBeUndefined();
  });
});
