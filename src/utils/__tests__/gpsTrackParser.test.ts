import { parseGeoJsonTrack } from '../gpsTrackParser';
import sampleTrack from '../__fixtures__/sampleTrack.geojson.json';

describe('parseGeoJsonTrack', () => {
  it('parses all valid Point features from the sample track', () => {
    const points = parseGeoJsonTrack(sampleTrack);
    expect(points.length).toBe(sampleTrack.features.length);
  });

  it('sorts points chronologically', () => {
    const points = parseGeoJsonTrack(sampleTrack);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].timestampMs).toBeGreaterThanOrEqual(
        points[i - 1].timestampMs,
      );
    }
  });

  it('maps GeoJSON [lng, lat] coordinates to {lat, lon}', () => {
    const points = parseGeoJsonTrack(sampleTrack);
    expect(points[0].lat).toBeCloseTo(22.3399352);
    expect(points[0].lon).toBeCloseTo(114.2632821);
  });

  it('carries speed through when present', () => {
    const points = parseGeoJsonTrack(sampleTrack);
    const withSpeed = points.find(p => p.speed !== undefined);
    expect(withSpeed?.speed).toBeGreaterThan(0);
  });

  it('drops non-Point features and malformed entries without throwing', () => {
    const points = parseGeoJsonTrack({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [114.1, 22.1] } }, // no time
        {
          type: 'Feature',
          properties: { time: '2026-01-01T00:00:00.000Z' },
          geometry: { type: 'Point', coordinates: [114.1, 22.1] },
        },
      ],
    });
    expect(points.length).toBe(1);
  });

  it('throws on a non-FeatureCollection input', () => {
    expect(() => parseGeoJsonTrack({ foo: 'bar' })).toThrow();
  });
});
