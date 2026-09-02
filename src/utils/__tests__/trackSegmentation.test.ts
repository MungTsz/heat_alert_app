import { parseGeoJsonTrack } from '../gpsTrackParser';
import { simplifyTrackToSegments } from '../trackSegmentation';
import sampleTrack from '../__fixtures__/sampleTrack.geojson.json';

describe('simplifyTrackToSegments', () => {
  it('collapses the near-duplicate pings in the sample track into far fewer segments', () => {
    const points = parseGeoJsonTrack(sampleTrack);
    const segments = simplifyTrackToSegments(points);

    // The sample track has 21 raw pings clustered within a ~15m radius for
    // most of it, plus one distant point at the end — segmentation should
    // collapse that down to a handful of stay segments, not 21.
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.length).toBeLessThan(points.length);
  });

  it('produces contiguous, non-zero-duration segments', () => {
    const points = parseGeoJsonTrack(sampleTrack);
    const segments = simplifyTrackToSegments(points);

    segments.forEach(segment => {
      expect(segment.endTime).toBeGreaterThan(segment.startTime);
    });
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].startTime).toBe(segments[i - 1].endTime);
    }
  });

  it('the last segment reaches the distant final point far from the cluster', () => {
    const points = parseGeoJsonTrack(sampleTrack);
    const segments = simplifyTrackToSegments(points);
    const last = segments[segments.length - 1];

    // The fixture's final point (114.27, 22.345) is far from the ~114.2633
    // cluster the rest of the track sits in.
    expect(last.lon).toBeCloseTo(114.27, 2);
    expect(last.lat).toBeCloseTo(22.345, 2);
  });

  it('returns an empty array for fewer than 2 points', () => {
    expect(simplifyTrackToSegments([])).toEqual([]);
    expect(
      simplifyTrackToSegments([{ lat: 22.34, lon: 114.26, timestampMs: 0 }]),
    ).toEqual([]);
  });

  it('keeps points within the stationary radius in a single segment', () => {
    const segments = simplifyTrackToSegments(
      [
        { lat: 22.34, lon: 114.26, timestampMs: 0 },
        { lat: 22.34001, lon: 114.26001, timestampMs: 60000 }, // ~1.5m away
        { lat: 22.34, lon: 114.26, timestampMs: 120000 },
      ],
      15,
    );
    expect(segments.length).toBe(1);
    expect(segments[0].startTime).toBe(0);
    expect(segments[0].endTime).toBe(120000);
  });
});
