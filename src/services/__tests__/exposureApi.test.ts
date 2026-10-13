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

import {
  deletePlaceLabel,
  ExposureApiError,
  ingestExposureGpx,
  ingestExposurePings,
  upsertPlaceLabel,
} from '../exposureApi';

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

describe('place labels', () => {
  const fetchMock = jest.fn();
  const label = {
    labelId: 'bookmark-1',
    contributorId: 'c-abc',
    category: 'Office' as const,
    latitude: 22.3399579,
    longitude: 114.2632457,
    radiusMeters: 25,
    updatedAt: Date.UTC(2026, 9, 13, 1, 15),
  };

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
  });

  it('PUTs category + circle in the documented shape, with a zoned updated_at', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, {}));
    await upsertPlaceLabel(label);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://etl.test/place-labels/bookmark-1');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({
      contributor_id: 'c-abc',
      category: 'Office',
      lat: 22.3399579,
      lng: 114.2632457,
      radius_m: 25,
      updated_at: '2026-10-13T01:15:00.000Z',
    });
  });

  it('surfaces a 403 with its status so sync can stop retrying it', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(403, { detail: 'label_id belongs to another contributor_id' }),
    );
    const error = await upsertPlaceLabel(label).catch(e => e);
    expect(error).toBeInstanceOf(ExposureApiError);
    expect(error.status).toBe(403);
  });

  it('DELETEs with the contributor id and treats 404 as already deleted', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { detail: 'unknown label_id' }));
    await expect(deletePlaceLabel('bookmark-1', 'c-abc')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://etl.test/place-labels/bookmark-1?contributor_id=c-abc',
    );
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });
});
