jest.mock('../../../services/exposureApi', () => ({
  ingestExposurePings: jest.fn(),
  fetchHourlyExposure: jest.fn(),
}));

import { ingestExposurePings, fetchHourlyExposure } from '../../../services/exposureApi';
import { apiExposureProvider } from '../apiExposureProvider';
import { ExposureIngestFeature } from '../../../types/exposure';

const mockedIngest = ingestExposurePings as jest.Mock;
const mockedFetch = fetchHourlyExposure as jest.Mock;

describe('apiExposureProvider.ingest', () => {
  beforeEach(() => mockedIngest.mockReset());

  it('forwards pid and features to the ETL backend as-is', async () => {
    const features: ExposureIngestFeature[] = [
      { timestamp: '2026-09-07T08:00:00.000Z', coords: { latitude: 22.3, longitude: 114.2 } },
    ];
    mockedIngest.mockResolvedValue(undefined);

    await apiExposureProvider.ingest('local-device', features);

    expect(mockedIngest).toHaveBeenCalledWith('local-device', features);
  });
});

describe('apiExposureProvider.getHourlyReport', () => {
  beforeEach(() => mockedFetch.mockReset());

  it('adapts hourly API rows into an ExposureReport', async () => {
    mockedFetch.mockResolvedValue([
      {
        hour_start_hk: '20260830160000',
        io: 'Outdoor',
        delta_t_hours: 0.5,
        exposure_value: 1.5,
        lng: 114.2632457,
        lat: 22.3399579,
      },
      {
        hour_start_hk: '20260830160000',
        io: 'Indoor',
        delta_t_hours: 0.5,
        exposure_value: 0.3,
        lng: 114.2632457,
        lat: 22.3399579,
      },
    ]);

    const report = await apiExposureProvider.getHourlyReport('local-device');

    expect(mockedFetch).toHaveBeenCalledWith('local-device');
    expect(report.segments).toHaveLength(2);
    expect(report.totalExposure).toBeCloseTo(1.8, 5);
    expect(report.segments.map(s => s.io).sort()).toEqual(['Indoor', 'Outdoor']);
  });

  it('returns an empty report when the backend has no data for this pid', async () => {
    mockedFetch.mockResolvedValue([]);
    const report = await apiExposureProvider.getHourlyReport('local-device');
    expect(report.segments).toEqual([]);
    expect(report.totalExposure).toBe(0);
  });
});
