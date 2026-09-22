import { fetchWalkingRoute } from '../routesApi';

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as Response;

describe('fetchWalkingRoute', () => {
  const origin = { lat: 22.3, lon: 114.2 };
  const destination = { lat: 22.31, lon: 114.21 };

  beforeEach(() => {
    globalThis.fetch = jest.fn() as unknown as typeof fetch;
  });

  it('sends a WALK-mode request with the minimal field mask, no routingPreference', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(200, {
        routes: [{ distanceMeters: 500, polyline: { encodedPolyline: 'abc' } }],
      }),
    );

    await fetchWalkingRoute(origin, destination);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://routes.googleapis.com/directions/v2:computeRoutes');
    expect(init.method).toBe('POST');
    expect(init.headers['X-Goog-FieldMask']).toBe(
      'routes.distanceMeters,routes.polyline.encodedPolyline',
    );
    const body = JSON.parse(init.body);
    expect(body.travelMode).toBe('WALK');
    expect(body).not.toHaveProperty('routingPreference');
    expect(body.origin.location.latLng).toEqual({ latitude: 22.3, longitude: 114.2 });
    expect(body.destination.location.latLng).toEqual({ latitude: 22.31, longitude: 114.21 });
  });

  it('returns the parsed polyline and distance on success', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(200, {
        routes: [{ distanceMeters: 742, polyline: { encodedPolyline: 'xyz123' } }],
      }),
    );

    const result = await fetchWalkingRoute(origin, destination);

    expect(result).toEqual({ encodedPolyline: 'xyz123', distanceMeters: 742 });
  });

  it('returns null when routes is empty', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, { routes: [] }));
    expect(await fetchWalkingRoute(origin, destination)).toBeNull();
  });

  it('returns null on a non-2xx response', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(jsonResponse(400, { error: 'bad request' }));
    expect(await fetchWalkingRoute(origin, destination)).toBeNull();
  });

  it('returns null (does not throw) when fetch rejects', async () => {
    (globalThis.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
    expect(await fetchWalkingRoute(origin, destination)).toBeNull();
  });
});
