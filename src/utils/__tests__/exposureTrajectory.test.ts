import { ExposureSegmentResult } from '../../types/exposure';
import {
  buildExposureTimeline,
  buildTripLegs,
  placeDirectionArrows,
  quantizedMetersPerPx,
} from '../exposureTrajectory';
import { clusterStayPoints } from '../geoClustering';
import { formatRoadList } from '../exposureFormat';

const MS_PER_MIN = 60000;
// haversineMeters' Earth radius (6371 km) — the distance the arrows are spaced by.
const METERS_PER_DEG_LAT = (6371000 * Math.PI) / 180;

const seg = (
  minute: number,
  overrides: Partial<ExposureSegmentResult> = {},
  durationMin = 1,
): ExposureSegmentResult => ({
  startTime: minute * MS_PER_MIN,
  endTime: (minute + durationMin) * MS_PER_MIN,
  lat: 22.3,
  lon: 114.2,
  exposure: 0.1,
  io: 'Outdoor',
  inHk: true,
  kind: 'route',
  ...overrides,
});

const at = (lat: number, lon: number) => ({ latitude: lat, longitude: lon });

describe('buildTripLegs', () => {
  const day = [
    seg(0, { kind: 'stay', io: 'Home', lat: 22.3, lon: 114.2 }, 60),
    seg(60, { reason: 'walk', lat: 22.3001, lon: 114.2001 }),
    seg(61, { reason: 'walk', lat: 22.3002, lon: 114.2002 }),
    seg(62, { io: 'MTR', reason: 'jump', lat: 22.3003, lon: 114.2003 }),
    seg(63, { io: 'MTR', reason: 'jump', lat: 22.32, lon: 114.21 }),
    seg(64, { kind: 'stay', io: 'Office', lat: 22.3201, lon: 114.2101 }, 120),
  ];

  it('starts a leg at the stay before it and ends it at the next point', () => {
    const [walk, mtr] = buildTripLegs(day);
    expect(walk.path.map(v => at(v.latitude, v.longitude))).toEqual([
      at(22.3, 114.2), // the Home dot
      at(22.3001, 114.2001),
      at(22.3002, 114.2002),
      at(22.3003, 114.2003), // where the MTR ride starts
    ]);
    expect(mtr.path.map(v => at(v.latitude, v.longitude))).toEqual([
      at(22.3003, 114.2003),
      at(22.32, 114.21),
      at(22.3201, 114.2101), // the Office dot
    ]);
  });

  it('splits legs on io and marks a GPS jump as an inferred path', () => {
    const legs = buildTripLegs(day);
    expect(legs.map(l => [l.io, l.pathInferred])).toEqual([
      ['Outdoor', false],
      ['MTR', true],
    ]);
  });

  it('sums each leg’s own segment time and exposure', () => {
    const [walk] = buildTripLegs(day);
    expect(walk.startTime).toBe(60 * MS_PER_MIN);
    expect(walk.endTime).toBe(62 * MS_PER_MIN);
    expect(walk.totalDurationMs).toBe(2 * MS_PER_MIN);
    expect(walk.totalExposure).toBeCloseTo(0.2, 5);
  });

  it('keeps one vertex for an hour-split point that repeats its position', () => {
    const [leg] = buildTripLegs([
      seg(58, { lat: 22.31, lon: 114.21 }, 2),
      seg(60, { lat: 22.31, lon: 114.21 }, 3),
      seg(63, { lat: 22.32, lon: 114.22 }),
    ]);
    expect(leg.path).toHaveLength(2);
  });

  it('splits a leg where it leaves Hong Kong', () => {
    const legs = buildTripLegs([
      seg(0, { io: 'Vehicle', lat: 22.5 }),
      seg(1, { io: 'Vehicle', lat: 22.53, inHk: false }),
      seg(2, { io: 'Vehicle', lat: 22.55, inHk: false }),
    ]);
    expect(legs.map(l => l.inHk)).toEqual([true, false]);
  });

  it('lists distinct road names in travel order', () => {
    const [leg] = buildTripLegs([
      seg(0, { io: 'Vehicle', roadName: 'A ROAD', lat: 22.3 }),
      seg(1, { io: 'Vehicle', roadName: 'B ROAD', lat: 22.31 }),
      seg(2, { io: 'Vehicle', roadName: 'A ROAD', lat: 22.32 }),
      seg(3, { io: 'Vehicle', lat: 22.33 }),
    ]);
    expect(leg.roadNames).toEqual(['A ROAD', 'B ROAD']);
  });

  it('makes no legs from stays alone', () => {
    expect(
      buildTripLegs([seg(0, { kind: 'stay' }, 60), seg(60, { kind: 'stay', lat: 22.31 })]),
    ).toEqual([]);
  });
});

describe('placeDirectionArrows', () => {
  const northLeg = (lengthM: number) =>
    buildTripLegs([
      seg(0, { lat: 22.3, lon: 114.2 }),
      seg(1, { lat: 22.3 + lengthM / METERS_PER_DEG_LAT, lon: 114.2, kind: 'stay' }),
    ]);
  const spacing = { spacingPx: 100, minLegLengthPx: 30, maxArrows: 60 };

  it('spaces arrows evenly, centred on the leg', () => {
    const arrows = placeDirectionArrows(northLeg(1050), 1, spacing);
    expect(arrows).toHaveLength(10);
    // 10 arrows 100 m apart span 900 m; the 150 m left over splits 75 / 75.
    const firstOffsetM = (arrows[0].latitude - 22.3) * METERS_PER_DEG_LAT;
    expect(firstOffsetM).toBeCloseTo(75, 0);
  });

  it('points each arrow along the edge it sits on, including the final edge into a stay', () => {
    // North 500 m, then east 500 m into a stay — the edge the backend's
    // repeated last heading would have mislabelled as north.
    const east = 500 / (METERS_PER_DEG_LAT * Math.cos((22.3045 * Math.PI) / 180));
    const legs = buildTripLegs([
      seg(0, { lat: 22.3, lon: 114.2 }),
      seg(1, { lat: 22.3 + 500 / METERS_PER_DEG_LAT, lon: 114.2 }),
      seg(2, { kind: 'stay', lat: 22.3 + 500 / METERS_PER_DEG_LAT, lon: 114.2 + east }),
    ]);
    const headings = placeDirectionArrows(legs, 1, { ...spacing, spacingPx: 250 }).map(a =>
      Math.round(a.headingDeg),
    );
    expect(headings).toEqual([0, 0, 90, 90]);
  });

  it('gives a leg shorter than the spacing one arrow at its middle', () => {
    const arrows = placeDirectionArrows(northLeg(60), 1, spacing);
    expect(arrows).toHaveLength(1);
    expect((arrows[0].latitude - 22.3) * METERS_PER_DEG_LAT).toBeCloseTo(30, 0);
  });

  it('skips a leg too short to show an arrow between its end dots', () => {
    expect(placeDirectionArrows(northLeg(20), 1, spacing)).toEqual([]);
  });

  it('widens the spacing until the arrows fit under the cap', () => {
    const arrows = placeDirectionArrows(northLeg(1050), 1, { ...spacing, maxArrows: 3 });
    expect(arrows).toHaveLength(2); // 10 → 5 → 2
  });

  it('keeps only arrows in the viewport, and only those count towards the cap', () => {
    // The southern ~350 m of the leg: 4 of the 10 arrows (75, 175, 275, 375 m)
    // minus the one past the edge.
    const viewport = {
      minLat: 22.3,
      maxLat: 22.3 + 350 / METERS_PER_DEG_LAT,
      minLon: 114.1,
      maxLon: 114.3,
    };
    const arrows = placeDirectionArrows(
      northLeg(1050),
      1,
      { ...spacing, maxArrows: 3 },
      viewport,
    );
    // Same spacing as without a viewport: the 7 off-screen arrows didn't
    // trigger the cap's thinning.
    expect(arrows.map(a => Math.round((a.latitude - 22.3) * METERS_PER_DEG_LAT))).toEqual([
      75, 175, 275,
    ]);
  });
});

describe('quantizedMetersPerPx', () => {
  it('snaps the ground resolution to the nearest power of two', () => {
    // 0.01° over 200px ≈ 5.6 m/px → 4; 0.02° ≈ 11.1 m/px → 8
    expect(quantizedMetersPerPx(0.01, 200)).toBe(4);
    expect(quantizedMetersPerPx(0.02, 200)).toBe(8);
  });

  it('is null before the map has been laid out', () => {
    expect(quantizedMetersPerPx(0.01, 0)).toBeNull();
  });
});

describe('clusterStayPoints with routes', () => {
  it('merges a stay’s hour-split slices but not two visits with a walk between', () => {
    const clusters = clusterStayPoints(
      [
        seg(0, { kind: 'stay', io: 'Home' }, 60),
        seg(60, { kind: 'stay', io: 'Home' }, 30),
        seg(90, { kind: 'route' }),
        seg(91, { kind: 'stay', io: 'Home', lat: 22.30005 }, 30),
      ],
      30,
    );
    expect(clusters.map(c => c.mergedSegmentCount)).toEqual([2, 1]);
  });
});

describe('buildExposureTimeline', () => {
  it('interleaves stays and trips by start time', () => {
    const segments = [
      seg(0, { kind: 'stay', io: 'Home' }, 60),
      seg(60, { lat: 22.31 }),
      seg(61, { kind: 'stay', io: 'Office', lat: 22.32 }, 60),
    ];
    const timeline = buildExposureTimeline(
      clusterStayPoints(segments, 30),
      buildTripLegs(segments),
    );
    expect(timeline.map(item => item.type)).toEqual(['stay', 'trip', 'stay']);
  });
});

describe('formatRoadList', () => {
  it('title-cases the first few roads and counts the rest', () => {
    expect(formatRoadList(['CLEAR WATER BAY ROAD', 'HANG HAU ROAD', 'WAN PO ROAD', 'PO YAP ROAD'], 3))
      .toBe('via Clear Water Bay Road → Hang Hau Road → Wan Po Road +1 more');
  });

  it('is null without road names', () => {
    expect(formatRoadList([], 3)).toBeNull();
  });
});
