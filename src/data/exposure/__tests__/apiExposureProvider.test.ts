jest.mock('../../../services/exposureApi', () => ({
  ingestExposurePings: jest.fn(),
  ingestExposureGpx: jest.fn(),
  waitForIngestBatch: jest.fn(),
  fetchHourlyExposure: jest.fn(),
}));

import {
  ingestExposurePings,
  ingestExposureGpx,
  waitForIngestBatch,
  fetchHourlyExposure,
} from '../../../services/exposureApi';
import { apiExposureProvider } from '../apiExposureProvider';
import { ExposureIngestFeature } from '../../../types/exposure';

const mockedIngest = ingestExposurePings as jest.Mock;
const mockedIngestGpx = ingestExposureGpx as jest.Mock;
const mockedWait = waitForIngestBatch as jest.Mock;
const mockedFetch = fetchHourlyExposure as jest.Mock;

describe('apiExposureProvider.ingest', () => {
  beforeEach(() => {
    mockedIngest.mockReset();
    mockedWait.mockReset();
  });

  const features: ExposureIngestFeature[] = [
    {
      type: 'Feature',
      properties: { time: '2026-09-07T08:00:00.000Z' },
      geometry: { type: 'Point', coordinates: [114.2, 22.3] },
    },
  ];

  it('forwards pid and features, then waits for the queued batch', async () => {
    mockedIngest.mockResolvedValue(12);
    mockedWait.mockResolvedValue({ id: 12, status: 'done', rows: 86 });

    const result = await apiExposureProvider.ingest('local-device', features);

    expect(mockedIngest).toHaveBeenCalledWith('local-device', features);
    expect(mockedWait).toHaveBeenCalledWith(12);
    expect(result).toEqual({ processedRows: 86 });
  });

  it('reports a null processed count when the batch has no row count', async () => {
    mockedIngest.mockResolvedValue(14);
    mockedWait.mockResolvedValue({ id: 14, status: 'done', rows: null });

    await expect(apiExposureProvider.ingest('local-device', features)).resolves.toEqual({
      processedRows: null,
    });
  });

  it('rejects when the background batch fails', async () => {
    mockedIngest.mockResolvedValue(13);
    mockedWait.mockRejectedValue(new Error('Server failed to process this upload'));

    await expect(apiExposureProvider.ingest('local-device', features)).rejects.toThrow(
      'Server failed to process this upload',
    );
  });
});

describe('apiExposureProvider.ingestGpx', () => {
  beforeEach(() => {
    mockedIngestGpx.mockReset();
    mockedWait.mockReset();
  });

  const gpx = '<gpx><trk><trkseg><trkpt lat="22.3" lon="114.2"/></trkseg></trk></gpx>';

  it('uploads the raw GPX text, then waits for the queued batch', async () => {
    mockedIngestGpx.mockResolvedValue(21);
    mockedWait.mockResolvedValue({ id: 21, status: 'done', rows: 70 });

    const result = await apiExposureProvider.ingestGpx('local-device', gpx);

    expect(mockedIngestGpx).toHaveBeenCalledWith('local-device', gpx);
    expect(mockedWait).toHaveBeenCalledWith(21);
    expect(result).toEqual({ processedRows: 70 });
  });

  it('rejects when the background batch fails', async () => {
    mockedIngestGpx.mockResolvedValue(22);
    mockedWait.mockRejectedValue(new Error('Server failed to process this upload'));

    await expect(apiExposureProvider.ingestGpx('local-device', gpx)).rejects.toThrow(
      'Server failed to process this upload',
    );
  });
});

describe('apiExposureProvider.getHourlyReport', () => {
  beforeEach(() => mockedFetch.mockReset());

  it('adapts hourly API rows into an ExposureReport', async () => {
    mockedFetch.mockResolvedValue([
      {
        hour_start_hk: '20260830160000',
        start_time_hk: '20260830160000',
        io: 'Outdoor',
        delta_t_hours: 0.5,
        exposure_value: 1.5,
        lng: 114.2632457,
        lat: 22.3399579,
      },
      {
        hour_start_hk: '20260830160000',
        start_time_hk: '20260830163000',
        io: 'Home',
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
    expect(report.segments.map(s => s.io).sort()).toEqual(['Home', 'Outdoor']);
  });

  it('maps a legacy "Indoor" io row onto Other Indoor', async () => {
    mockedFetch.mockResolvedValue([
      {
        hour_start_hk: '20260830160000',
        start_time_hk: '20260830160000',
        io: 'Indoor',
        delta_t_hours: 0.5,
        exposure_value: 0.3,
        lng: 114.2632457,
        lat: 22.3399579,
      },
    ]);
    const report = await apiExposureProvider.getHourlyReport('local-device');
    expect(report.segments[0].io).toBe('Other Indoor');
  });

  it('returns an empty report when the backend has no data for this pid', async () => {
    mockedFetch.mockResolvedValue([]);
    const report = await apiExposureProvider.getHourlyReport('local-device');
    expect(report.segments).toEqual([]);
    expect(report.totalExposure).toBe(0);
  });
});
