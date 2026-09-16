import { extractGeoJsonFeatures } from '../gpsTrackParser';
import sampleTrack from '../__fixtures__/sampleTrack.geojson.json';

describe('extractGeoJsonFeatures', () => {
  it('extracts all valid Point features from the sample track', () => {
    const features = extractGeoJsonFeatures(sampleTrack);
    expect(features.length).toBe(sampleTrack.features.length);
  });

  it('sorts features chronologically', () => {
    const features = extractGeoJsonFeatures(sampleTrack);
    for (let i = 1; i < features.length; i++) {
      expect(Date.parse(features[i].properties.time)).toBeGreaterThanOrEqual(
        Date.parse(features[i - 1].properties.time),
      );
    }
  });

  it('keeps GeoJSON [lng, lat] coordinate order untouched', () => {
    const features = extractGeoJsonFeatures(sampleTrack);
    expect(features[0].geometry.coordinates[0]).toBeCloseTo(114.2632821);
    expect(features[0].geometry.coordinates[1]).toBeCloseTo(22.3399352);
  });

  it('carries speed through when present', () => {
    const features = extractGeoJsonFeatures(sampleTrack);
    const withSpeed = features.find(f => f.properties.speed !== undefined);
    expect(withSpeed?.properties.speed).toBeGreaterThan(0);
  });

  it('drops non-Point features and malformed entries without throwing', () => {
    const features = extractGeoJsonFeatures({
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
    expect(features.length).toBe(1);
  });

  it('throws on a non-FeatureCollection input', () => {
    expect(() => extractGeoJsonFeatures({ foo: 'bar' })).toThrow();
  });
});
