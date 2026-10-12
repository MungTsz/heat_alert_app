import {
  countGpxTrackPoints,
  detectTrackFormat,
  extractGeoJsonFeatures,
} from '../gpsTrackParser';
import sampleTrack from '../__fixtures__/sampleTrack.geojson.json';

const GPX_TWO_TRACKS = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <wpt lat="22.30" lon="114.10"><name>ignored</name></wpt>
  <trk><trkseg>
    <trkpt lat="22.3399" lon="114.2632"><time>2026-08-29T16:00:00Z</time></trkpt>
    <trkpt lat="22.3400" lon="114.2633"><time>2026-08-29T16:10:00Z</time></trkpt>
  </trkseg></trk>
  <trk><trkseg>
    <trkpt lat="22.5010" lon="114.1280"/>
  </trkseg></trk>
</gpx>`;

describe('detectTrackFormat', () => {
  it('detects GPX with or without an XML declaration', () => {
    expect(detectTrackFormat(GPX_TWO_TRACKS)).toBe('gpx');
    expect(detectTrackFormat('<gpx version="1.0"></gpx>')).toBe('gpx');
  });

  it('ignores a UTF-8 BOM and leading whitespace', () => {
    expect(detectTrackFormat('﻿<?xml version="1.0"?><gpx/>')).toBe('gpx');
    expect(detectTrackFormat('\n  \t<gpx/>')).toBe('gpx');
  });

  it('treats JSON as GeoJSON', () => {
    expect(detectTrackFormat(JSON.stringify(sampleTrack))).toBe('geojson');
    expect(detectTrackFormat('﻿  {"type":"FeatureCollection"}')).toBe('geojson');
  });
});

describe('countGpxTrackPoints', () => {
  it('counts every <trkpt> across tracks, including self-closing ones', () => {
    expect(countGpxTrackPoints(GPX_TWO_TRACKS)).toBe(3);
  });

  it('returns 0 when the file has only waypoints/routes', () => {
    expect(
      countGpxTrackPoints('<gpx><wpt lat="1" lon="2"/><rte><rtept lat="1" lon="2"/></rte></gpx>'),
    ).toBe(0);
  });
});

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
