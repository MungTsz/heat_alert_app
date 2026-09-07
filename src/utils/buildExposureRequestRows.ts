// src/utils/buildExposureRequestRows.ts
import { TrackSegment, ExposureRequestRow } from '../types/exposure';
import { toHkTimestampFull } from '../services/praiseApi';

const MS_PER_HOUR = 3600000;

// Builds expo_calx API rows from simplified track segments. Indoor/outdoor
// status can't be inferred from GPS alone, so every point is sent as
// "Outdoor" — the API's own server-side point validation already
// corrects/tags this when it finds a point off the road network (see API
// doc example 4).
export const buildExposureRows = (
  segments: TrackSegment[],
  pid: string,
): ExposureRequestRow[] =>
  segments.map(segment => [
    toHkTimestampFull(new Date(segment.startTime)),
    pid,
    segment.lon,
    segment.lat,
    { IO: 'Outdoor' },
    (segment.endTime - segment.startTime) / MS_PER_HOUR,
  ]);
