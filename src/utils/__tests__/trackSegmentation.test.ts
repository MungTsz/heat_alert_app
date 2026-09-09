import { parseGeoJsonTrack } from '../gpsTrackParser';
import { bucketTrackPoints } from '../trackSegmentation';
import sampleTrack from '../__fixtures__/sampleTrack.geojson.json';

const BUCKET_MS = 10 * 60 * 1000;

describe('bucketTrackPoints', () => {
  it('collapses the sample track pings into far fewer 10-minute-window segments', () => {
    const points = parseGeoJsonTrack(sampleTrack);
    const segments = bucketTrackPoints(points);

    expect(segments.length).toBeGreaterThan(0);
    expect(segments.length).toBeLessThan(points.length);
  });

  it('produces contiguous, fixed-width (10-minute) segments', () => {
    const points = parseGeoJsonTrack(sampleTrack);
    const segments = bucketTrackPoints(points);

    segments.forEach(segment => {
      expect(segment.endTime - segment.startTime).toBe(BUCKET_MS);
    });
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].startTime).toBeGreaterThan(segments[i - 1].startTime);
    }
  });

  it('the last segment reaches the distant final point far from the cluster', () => {
    const points = parseGeoJsonTrack(sampleTrack);
    const segments = bucketTrackPoints(points);
    const last = segments[segments.length - 1];

    // The fixture's final point (114.27, 22.345) is far from the ~114.2633
    // cluster the rest of the track sits in.
    expect(last.lon).toBeCloseTo(114.27, 2);
    expect(last.lat).toBeCloseTo(22.345, 2);
  });

  it('returns an empty array for no points', () => {
    expect(bucketTrackPoints([])).toEqual([]);
  });

  it('merges points within the same 10-minute window into a single segment', () => {
    const segments = bucketTrackPoints([
      { lat: 22.34, lon: 114.26, timestampMs: 0 },
      { lat: 22.3401, lon: 114.2601, timestampMs: 5 * 60 * 1000 },
      { lat: 22.34, lon: 114.26, timestampMs: 9 * 60 * 1000 },
    ]);
    expect(segments.length).toBe(1);
    expect(segments[0].startTime).toBe(0);
    expect(segments[0].endTime).toBe(BUCKET_MS);
    // Anchor is the first point observed in the window.
    expect(segments[0].lat).toBe(22.34);
    expect(segments[0].lon).toBe(114.26);
  });

  it('splits points that land in different 10-minute windows, even with no gap between them', () => {
    const segments = bucketTrackPoints([
      { lat: 22.34, lon: 114.26, timestampMs: BUCKET_MS - 1000 }, // 9:59 into window 0
      { lat: 22.3401, lon: 114.2601, timestampMs: BUCKET_MS + 1000 }, // 0:01 into window 1
    ]);
    expect(segments.length).toBe(2);
    expect(segments[0].startTime).toBe(0);
    expect(segments[0].endTime).toBe(BUCKET_MS);
    expect(segments[1].startTime).toBe(BUCKET_MS);
    expect(segments[1].endTime).toBe(2 * BUCKET_MS);
  });

  it('produces no segment for an empty window between two active ones', () => {
    const segments = bucketTrackPoints([
      { lat: 22.34, lon: 114.26, timestampMs: 0 }, // window 0
      { lat: 22.34, lon: 114.26, timestampMs: 3 * BUCKET_MS }, // window 3 — windows 1 and 2 have no data
    ]);
    expect(segments.length).toBe(2);
    expect(segments[0].startTime).toBe(0);
    expect(segments[1].startTime).toBe(3 * BUCKET_MS);
  });
});
