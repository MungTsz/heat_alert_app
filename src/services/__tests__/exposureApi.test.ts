jest.mock('../../config/exposureApiConfig', () => ({
  EXPOSURE_API_CONFIG: {
    baseUrl: 'http://etl.test',
    timeoutMs: 1000,
    maxIngestBodyBytes: 200,
    batchPollIntervalMs: 0,
    batchMaxWaitMs: 0,
    maxFilesPerImport: 10,
  },
}));

import { ExposureApiError, ingestExposureGpx, ingestExposurePings } from '../exposureApi';

const GPX = '<?xml version="1.0"?><gpx><trk><trkseg><trkpt lat="22.3" lon="114.2"/></trkseg></trk></gpx>';

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) }) as Response;

describe('ingestExposureGpx', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
  });

  it('posts the raw GPX text to /ingest/gpx with an encoded pid', async () => {
    fetchMock.mockResolvedValue(jsonResponse(202, { status: 'queued', batch_id: 13 }));

    await expect(ingestExposureGpx('my device', GPX)).resolves.toBe(13);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://etl.test/ingest/gpx?pid=my%20device');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/gpx+xml' });
    expect(init.body).toBe(GPX);
  });

  it('maps an "invalid GPX" 400 to an unreadable-file message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { detail: 'invalid GPX: not a readable XML document (syntax error: line 1, column 0)' }),
    );
    await expect(ingestExposureGpx('p', GPX)).rejects.toThrow('Not a readable GPX file.');
  });

  it('maps a "no valid pings" 400 to the no-points message', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { detail: 'no valid pings in request' }));
    await expect(ingestExposureGpx('p', GPX)).rejects.toThrow(
      'No valid GPS points found in that file.',
    );
  });

  it('rejects an oversized file with 413 before sending anything', async () => {
    const error = await ingestExposureGpx('p', GPX.repeat(5)).catch(e => e);
    expect(error).toBeInstanceOf(ExposureApiError);
    expect(error.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('ingestExposurePings', () => {
  it('still posts JSON to /ingest', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(202, { status: 'queued', batch_id: 7 }));
    globalThis.fetch = fetchMock;

    await expect(ingestExposurePings('p', [])).resolves.toBe(7);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://etl.test/ingest');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({ pid: 'p', features: [] });
  });
});
