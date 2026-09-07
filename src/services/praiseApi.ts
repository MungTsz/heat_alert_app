// src/services/praiseApi.ts
import { PRAISE_CONFIG } from '../config/praiseConfig';
import { ExposureRequestRow } from '../types/exposure';

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

// --- Exposure calculation (get_exposure_list) ---

// Formats a Date as YYYYMMDDHHmmss in Hong Kong time (UTC+8) — the full
// second-resolution timestamp get_exposure_list's `t` field expects, as
// distinct from the hour-only format toHkTimestamp() produces above.
export const toHkTimestampFull = (date: Date = new Date()): string => {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const hkDate = new Date(utcMs + 8 * 60 * 60 * 1000);
  const yyyy = hkDate.getFullYear();
  const mm = (hkDate.getMonth() + 1).toString().padStart(2, '0');
  const dd = hkDate.getDate().toString().padStart(2, '0');
  const hh = hkDate.getHours().toString().padStart(2, '0');
  const min = hkDate.getMinutes().toString().padStart(2, '0');
  const ss = hkDate.getSeconds().toString().padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
};

export type ExposureCalcResponse = {
  exposure: [string, string, number][]; // [t, pid, exposure_value]
};

// expo_calx lives on a different uwsgi script (praise-ir-cal, not
// praise-service) and — unlike the newer 9-field format documented in "API
// for calculating Exposure" — the deployed Cal_Exposure.py still unpacks
// records as `ts, pid, lon, lat, micenv, deltaT = record`, i.e. the older
// 6-field ExposureRequestRow shape with no record_id/speed/status. Confirmed
// working live on 2026-09-07 against this exact URL/row shape. It's a GET
// with the rows JSON-encoded into the `input_data` query param, same as
// get_data/get_mtiles above.
export const fetchPraiseExposureCalc = async (
  rows: ExposureRequestRow[],
): Promise<ExposureCalcResponse> => {
  const url = buildUrl(
    { todo: 'expo_calx', input_data: JSON.stringify(rows) },
    PRAISE_CONFIG.irCalBaseUrl,
  );
  const response = await fetch(url);
  const data = await response.json();
  if (!Array.isArray(data?.exposure)) {
    throw new Error(
      typeof data?.msg === 'string' ? data.msg : 'PRAISE-HK expo_calx call failed',
    );
  }
  return data as ExposureCalcResponse;
};
