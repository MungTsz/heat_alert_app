// src/utils/exposureTrajectory.ts
import {
  ExposureSegmentResult,
  ExposureStayCluster,
  ExposureTripLeg,
} from '../types/exposure';
import { haversineMeters } from './geoClustering';

type LatLng = { latitude: number; longitude: number };

const METERS_PER_DEG_LAT = 111320;
const toRadians = (deg: number): number => (deg * Math.PI) / 180;
const toDegrees = (rad: number): number => (rad * 180) / Math.PI;

// Initial great-circle bearing a → b, degrees clockwise from north — the
// same convention as the backend's heading_deg.
export const bearingDeg = (a: LatLng, b: LatLng): number => {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
};

const samePosition = (a: LatLng, b: LatLng): boolean =>
  a.latitude === b.latitude && a.longitude === b.longitude;

// A leg changes wherever its line has to change style: io (color), the HK
// boundary (gray outside) or a GPS jump (dashed).
const legStyleKey = (segment: ExposureSegmentResult): string =>
  `${segment.io}|${segment.inHk}|${segment.reason === 'jump'}`;

const pushVertex = (path: LatLng[], vertex: LatLng): void => {
  const last = path[path.length - 1];
  // An hour-split point repeats its position — one vertex is enough.
  if (!last || !samePosition(last, vertex)) path.push(vertex);
};

// Groups chronologically sorted route segments into legs, one polyline each.
// Two connector vertices make the day read as one continuous trace instead
// of loose fragments:
// - a leg that follows a stay starts at that stay's dot (the route's first
//   ping is the stay's last ping, a few metres off the stay's median);
// - a leg ends at the next point, whatever it is: the backend gives each
//   point the time until the next one, so the last route point really was
//   travelling towards it.
export const buildTripLegs = (segments: ExposureSegmentResult[]): ExposureTripLeg[] => {
  const legs: ExposureTripLeg[] = [];
  let leg: ExposureTripLeg | null = null;
  let legKey = '';

  segments.forEach((segment, i) => {
    if (segment.kind !== 'route') {
      leg = null;
      return;
    }
    const key = legStyleKey(segment);
    if (!leg || key !== legKey) {
      leg = {
        io: segment.io,
        inHk: segment.inHk,
        pathInferred: segment.reason === 'jump',
        path: [],
        startTime: segment.startTime,
        endTime: segment.endTime,
        totalDurationMs: 0,
        totalExposure: 0,
        roadNames: [],
        reason: segment.reason,
      };
      legKey = key;
      legs.push(leg);
      const previous = segments[i - 1];
      if (previous && previous.kind !== 'route') {
        leg.path.push({ latitude: previous.lat, longitude: previous.lon });
      }
    }

    pushVertex(leg.path, { latitude: segment.lat, longitude: segment.lon });
    leg.endTime = segment.endTime;
    leg.totalDurationMs += segment.endTime - segment.startTime;
    leg.totalExposure += segment.exposure;
    if (segment.roadName && !leg.roadNames.includes(segment.roadName)) {
      leg.roadNames.push(segment.roadName);
    }

    const next = segments[i + 1];
    if (next && (next.kind !== 'route' || legStyleKey(next) !== key)) {
      pushVertex(leg.path, { latitude: next.lat, longitude: next.lon });
    }
  });

  return legs;
};

// The map's ground resolution for the current camera, snapped to the nearest
// power of two (so the real on-screen spacing stays within ~0.7-1.4x of the
// configured px). Everything spaced in screen pixels is derived from this
// snapped value, so a pan (which nudges latitudeDelta slightly under
// Mercator) keeps every arrow exactly where it was, and only a zoom of about
// one level re-spaces them. null before the map has been laid out.
export const quantizedMetersPerPx = (
  latitudeDelta: number,
  mapHeightPx: number,
): number | null => {
  if (mapHeightPx <= 0 || latitudeDelta <= 0) return null;
  return 2 ** Math.round(Math.log2((latitudeDelta * METERS_PER_DEG_LAT) / mapHeightPx));
};

export type DirectionArrow = LatLng & { headingDeg: number; legIndex: number };

export type ArrowViewport = { minLat: number; maxLat: number; minLon: number; maxLon: number };

type RegionLike = LatLng & { latitudeDelta: number; longitudeDelta: number };

// The visible region grown by marginFactor of its own size on every side, so
// a short pan doesn't uncover arrow-less line before the next
// onRegionChangeComplete places arrows there.
export const arrowViewport = (region: RegionLike, marginFactor: number): ArrowViewport => {
  const halfLat = region.latitudeDelta * (0.5 + marginFactor);
  const halfLon = region.longitudeDelta * (0.5 + marginFactor);
  return {
    minLat: region.latitude - halfLat,
    maxLat: region.latitude + halfLat,
    minLon: region.longitude - halfLon,
    maxLon: region.longitude + halfLon,
  };
};

const inViewport = (point: LatLng, viewport: ArrowViewport | undefined): boolean =>
  !viewport ||
  (point.latitude >= viewport.minLat &&
    point.latitude <= viewport.maxLat &&
    point.longitude >= viewport.minLon &&
    point.longitude <= viewport.maxLon);

type ArrowSpacing = { spacingPx: number; minLegLengthPx: number; maxArrows: number };

type Edge = { from: LatLng; to: LatLng; lengthM: number; headingDeg: number };

const legEdges = (leg: ExposureTripLeg): Edge[] => {
  const edges: Edge[] = [];
  for (let k = 0; k < leg.path.length - 1; k++) {
    const from = leg.path[k];
    const to = leg.path[k + 1];
    const lengthM = haversineMeters(from.latitude, from.longitude, to.latitude, to.longitude);
    if (lengthM === 0) continue;
    // From the drawn edge itself, not the row's heading_deg — see
    // ExposureHourlyApiRow.heading_deg for why that one can point backwards.
    edges.push({ from, to, lengthM, headingDeg: bearingDeg(from, to) });
  }
  return edges;
};

const placeAlongEdges = (edges: Edge[], distanceM: number): LatLng & { headingDeg: number } => {
  let remaining = distanceM;
  for (const edge of edges) {
    if (remaining <= edge.lengthM) {
      // Linear interpolation in degrees is accurate to well under a metre
      // over one thinned-route edge (backend keeps a point every ~300 m).
      const t = remaining / edge.lengthM;
      return {
        latitude: edge.from.latitude + (edge.to.latitude - edge.from.latitude) * t,
        longitude: edge.from.longitude + (edge.to.longitude - edge.from.longitude) * t,
        headingDeg: edge.headingDeg,
      };
    }
    remaining -= edge.lengthM;
  }
  const last = edges[edges.length - 1];
  return { latitude: last.to.latitude, longitude: last.to.longitude, headingDeg: last.headingDeg };
};

const placeArrows = (
  edgesByLeg: Edge[][],
  spacingM: number,
  minLegLengthM: number,
  viewport: ArrowViewport | undefined,
): DirectionArrow[] => {
  const arrows: DirectionArrow[] = [];
  edgesByLeg.forEach((edges, legIndex) => {
    const totalM = edges.reduce((sum, e) => sum + e.lengthM, 0);
    if (totalM < minLegLengthM) return;
    // One arrow per spacing, centred on the leg so the leftover splits evenly
    // between both ends — keeps arrows off the stay dots the leg connects,
    // and a short leg still gets one arrow at its middle.
    const count = Math.max(1, Math.floor(totalM / spacingM));
    const offset = (totalM - (count - 1) * spacingM) / 2;
    for (let j = 0; j < count; j++) {
      const arrow = { ...placeAlongEdges(edges, offset + j * spacingM), legIndex };
      if (inViewport(arrow, viewport)) arrows.push(arrow);
    }
  });
  return arrows;
};

// Direction arrows along every leg at a constant on-screen spacing. Only
// arrows inside `viewport` are kept, and only those count towards
// maxArrows — otherwise, zoomed in, the off-screen rest of the day would
// trip the cap and thin out the arrows the user is actually looking at.
// Positions depend only on the legs and the spacing, never on the
// viewport, so panning reveals arrows without moving the ones on screen.
export const placeDirectionArrows = (
  legs: ExposureTripLeg[],
  metersPerPx: number,
  { spacingPx, minLegLengthPx, maxArrows }: ArrowSpacing,
  viewport?: ArrowViewport,
): DirectionArrow[] => {
  const edgesByLeg = legs.map(legEdges);
  const minLegLengthM = minLegLengthPx * metersPerPx;
  let spacingM = spacingPx * metersPerPx;
  let arrows = placeArrows(edgesByLeg, spacingM, minLegLengthM, viewport);
  // Thin out a dense zoomed-out day rather than dropping arrows from its
  // tail, so direction stays readable along every leg. Bounded: once every
  // leg is down to its single middle arrow, doubling changes nothing.
  while (arrows.length > maxArrows) {
    spacingM *= 2;
    const thinner = placeArrows(edgesByLeg, spacingM, minLegLengthM, viewport);
    if (thinner.length === arrows.length) break;
    arrows = thinner;
  }
  return arrows.slice(0, maxArrows);
};

export type ExposureTimelineItem =
  | { type: 'stay'; startTime: number; stay: ExposureStayCluster }
  | { type: 'trip'; startTime: number; leg: ExposureTripLeg };

// The day as one chronological list of stays and trips — the same grouping
// the map draws, so a row in the list and a dot/line on the map are always
// the same thing.
export const buildExposureTimeline = (
  stays: ExposureStayCluster[],
  legs: ExposureTripLeg[],
): ExposureTimelineItem[] =>
  [
    ...stays.map(stay => ({ type: 'stay' as const, startTime: stay.startTime, stay })),
    ...legs.map(leg => ({ type: 'trip' as const, startTime: leg.startTime, leg })),
  ].sort((a, b) => a.startTime - b.startTime);
