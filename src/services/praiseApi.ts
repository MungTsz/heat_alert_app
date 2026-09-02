// src/services/praiseApi.ts
import { PRAISE_CONFIG } from '../config/praiseConfig';

const buildUrl = (params: Record<string, string>): string => {
  const query = new URLSearchParams({
    ...params,
    apikey: PRAISE_CONFIG.apiKey,
    myid: PRAISE_CONFIG.myId,
  });
  return `${PRAISE_CONFIG.baseUrl}?${query.toString()}`;
};

// Formats a Date as YYYYMMDDhh in Hong Kong time (UTC+8) — matches the
// confirmed-working format from live testing, rather than relying on the
// docs' claim that ISO is equally accepted.
export const toHkTimestamp = (date: Date = new Date()): string => {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const hkDate = new Date(utcMs + 8 * 60 * 60 * 1000);
  const yyyy = hkDate.getFullYear();
  const mm = (hkDate.getMonth() + 1).toString().padStart(2, '0');
  const dd = hkDate.getDate().toString().padStart(2, '0');
  const hh = hkDate.getHours().toString().padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}`;
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
