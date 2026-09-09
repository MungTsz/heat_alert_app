const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStore.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      mockStore.delete(key);
      return Promise.resolve();
    }),
  },
}));

import { getDevices, createDevice, deleteDevice } from '../exposureDeviceService';

describe('exposureDeviceService', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('creates a device and reads it back, newest first', async () => {
    const a = await createDevice('Mom\'s phone');
    await new Promise<void>(resolve => setTimeout(() => resolve(), 2));
    const b = await createDevice('Dad\'s phone');

    const devices = await getDevices();
    expect(devices.map(d => d.name)).toEqual(['Dad\'s phone', 'Mom\'s phone']);
    expect(devices.map(d => d.id)).toEqual([b.id, a.id]);
  });

  it('removes a device and its per-day history key', async () => {
    const device = await createDevice('Test device');
    mockStore.set(`exposure_daily_history:${device.id}`, '{"2026-09-07":{}}');

    await deleteDevice(device.id);

    expect(await getDevices()).toEqual([]);
    expect(mockStore.has(`exposure_daily_history:${device.id}`)).toBe(false);
  });
});
