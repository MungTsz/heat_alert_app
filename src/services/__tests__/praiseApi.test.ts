import { fetchPraiseExposureCalc } from '../praiseApi';
import { ExposureRequestRow } from '../../types/exposure';

const rows: ExposureRequestRow[] = [
  ['20260904152301', '1', 114.13, 22.35, { IO: 'Outdoor' }, 0.5],
];

describe('fetchPraiseExposureCalc', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ exposure: [['20260904152301', '1', 3.893877502530813]] }),
    });
    globalThis.fetch = fetchMock as any;
  });

  it('calls the ir-cal endpoint with todo=expo_calx and the JSON-encoded rows', async () => {
    await fetchPraiseExposureCalc(rows);

    const calledUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      'https://praise-web.ust.hk/uwsgi/praise-ir-cal',
    );
    expect(calledUrl.searchParams.get('todo')).toBe('expo_calx');
    expect(calledUrl.searchParams.get('input_data')).toBe(JSON.stringify(rows));
  });

  it('attaches apikey and myid params', async () => {
    await fetchPraiseExposureCalc(rows);

    const calledUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(calledUrl.searchParams.has('apikey')).toBe(true);
    expect(calledUrl.searchParams.has('myid')).toBe(true);
  });

  it('resolves the exposure array on a happy-path response', async () => {
    const result = await fetchPraiseExposureCalc(rows);
    expect(result.exposure).toEqual([['20260904152301', '1', 3.893877502530813]]);
  });

  it('throws when the response has no exposure array', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as any;
    await expect(fetchPraiseExposureCalc(rows)).rejects.toThrow();
  });

  it('throws using the server msg when present', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ msg: 'bad todo' }),
    }) as any;
    await expect(fetchPraiseExposureCalc(rows)).rejects.toThrow('bad todo');
  });
});
