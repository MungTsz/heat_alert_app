// src/services/praiseApi.ts
import { PRAISE_CONFIG } from '../config/praiseConfig';

const buildUrl = (
  params: Record<string, string>,
  baseUrl: string = PRAISE_CONFIG.baseUrl,
): string => {
  const query = new URLSearchParams({
    ...params,
    apikey: PRAISE_CONFIG.apiKey,
    myid: PRAISE_CONFIG.myId,
  });
  return `${baseUrl}?${query.toString()}`;
};

// PRAISE takes YYYYMMDDhh HK-time keys — the confirmed-working format from
// live testing, rather than relying on the docs' claim that ISO is equally
// accepted. Re-exported so existing PRAISE callers keep one import.
export { toHkTimestamp } from '../utils/hkDate';

// Renders a toHkTimestamp() string (YYYYMMDDhh) as a wall-clock label, e.g.
// "1:00PM" — used to show forecast frames as real times instead of "+Nh".
export const formatHkTimestampLabel = (ts: string): string => {
  const hour24 = parseInt(ts.slice(8, 10), 10);
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:00${period}`;
};

export type PraisePointDataResponse = {
  ts?: string[];
  isots?: string[];
  [pollutantId: string]: any;
  status: number;
  msg?: string;
};

export const fetchPraisePointData = async (
  lat: number,
  lng: number,
  t0: string, // YYYYMMDDhh, HKT
  t1: string, // YYYYMMDDhh, HKT
  pids: string[],
): Promise<PraisePointDataResponse> => {
  const url = buildUrl({
    todo: 'get_data',
    lat: lat.toString(),
    lng: lng.toString(),
    t0,
    t1,
    pids: pids.join(','),
  });
  const response = await fetch(url);
  const data = await response.json();
  if (data.status !== 0) {
    throw new Error(data.msg ?? 'PRAISE-HK get_data call failed');
  }
  return data;
};

export type PraiseTilesResponse = {
  ts: string;
  param: string;
  level: number;
  tiles: {
    lng0: number;
    lat0: number;
    lng1: number;
    lat1: number;
    url: string;
  };
  status: number;
  msg?: string;
};

export const fetchPraiseTiles = async (
  pid: string,
  ts: string, // YYYYMMDDhh, HKT
  bounds: { lng0: number; lat0: number; lng1: number; lat1: number },
): Promise<PraiseTilesResponse> => {
  const url = buildUrl({
    todo: 'get_mtiles',
    pid,
    ts,
    lng0: bounds.lng0.toString(),
    lat0: bounds.lat0.toString(),
    lng1: bounds.lng1.toString(),
    lat1: bounds.lat1.toString(),
  });
  const response = await fetch(url);
  const data = await response.json();
  if (data.status !== 0) {
    throw new Error(data.msg ?? 'PRAISE-HK get_mtiles call failed');
  }
  return data;
};
