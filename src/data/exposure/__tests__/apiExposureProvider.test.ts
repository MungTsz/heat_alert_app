import { ExposureRequestRow } from '../types';

jest.mock('../../../services/praiseApi', () => ({
  fetchPraiseExposureCalc: jest.fn(),
}));

import { fetchPraiseExposureCalc } from '../../../services/praiseApi';
import { apiExposureProvider } from '../apiExposureProvider';

const mockedFetch = fetchPraiseExposureCalc as jest.Mock;

const makeRow = (t: string, pid: string): ExposureRequestRow => [
  t,
  pid,
  114.13,
  22.35,
  { IO: 'Outdoor' },
  0.5,
];

describe('apiExposureProvider.calculateExposure', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('maps [t, pid, exposure] response tuples to ExposureResultRow by index', async () => {
    const rows = [makeRow('20260904152301', '1'), makeRow('20260904152401', '1')];
    mockedFetch.mockResolvedValue({
      exposure: [
        ['20260904152301', '1', 3.893877502530813],
        ['20260904152401', '1', 0.5183912679925561],
      ],
    });

    const results = await apiExposureProvider.calculateExposure(rows);

    expect(results).toEqual([
      { ts: '20260904152301', pid: '1', exposure: 3.893877502530813 },
      { ts: '20260904152401', pid: '1', exposure: 0.5183912679925561 },
    ]);
  });

  it('batches rows into multiple calls when exceeding the per-call limit', async () => {
    const rows = Array.from({ length: 90 }, (_, i) => makeRow(`t${i}`, '1'));
    mockedFetch.mockImplementation(async (batch: ExposureRequestRow[]) => ({
      exposure: batch.map(row => [row[0], row[1], 1]),
    }));

    const results = await apiExposureProvider.calculateExposure(rows);

    expect(mockedFetch.mock.calls.length).toBeGreaterThan(1);
    expect(results.length).toBe(90);
  });
});
