import { useEffect, useMemo, useState } from 'react';
import { ExposureStayCluster } from '../types/exposure';
import { EXPOSURE_MAP_CONFIG } from '../config/exposureMapConfig';
import { isRoutesApiConfigured } from '../config/routesApiConfig';
import { fetchWalkingRoute } from '../services/routesApi';
import { getCachedRoute, setCachedRoute } from '../services/routeCacheService';
import { decodePolyline, LatLng } from '../utils/googlePolyline';
import { runWithConcurrencyLimit } from '../utils/concurrencyLimit';
import { isReasonableRoute } from '../utils/routeDetour';
import { buildRouteCacheKey } from '../utils/routeCacheKey';
import { haversineMeters } from '../utils/geoClustering';

export type RouteHopSegment = {
  key: string;
  coordinates: LatLng[];
  isFallback: boolean;
};

const straightLineSegment = (
  cluster: ExposureStayCluster,
  next: ExposureStayCluster,
  index: number,
): RouteHopSegment => ({
  key: `hop-${cluster.startTime}-${index}`,
  coordinates: [
    { latitude: cluster.lat, longitude: cluster.lon },
    { latitude: next.lat, longitude: next.lon },
  ],
  isFallback: false,
});

// Resolves each consecutive cluster pair into a road-snapped Polyline path
// via Google Routes API, falling back to a straight line (styled dashed by
// the caller once isFallback is true) when no reasonable route is found.
// Seeds synchronously with straight lines so the map has something to show
// immediately, then upgrades hop-by-hop as each route resolves — mirrors the
// cancelled-flag / per-item-degrade shape of useAqhiForecastTiles.ts.
export const useRoadSnappedRoute = (clusters: ExposureStayCluster[]): RouteHopSegment[] => {
  const seeded = useMemo<RouteHopSegment[]>(
    () => clusters.slice(0, -1).map((cluster, i) => straightLineSegment(cluster, clusters[i + 1], i)),
    [clusters],
  );

  const [overrides, setOverrides] = useState<Record<string, RouteHopSegment>>({});

  useEffect(() => {
    setOverrides({});
    if (!isRoutesApiConfigured() || seeded.length === 0) return;

    let cancelled = false;

    const resolveHop = async (segment: RouteHopSegment, index: number) => {
      const cluster = clusters[index];
      const next = clusters[index + 1];
      const cacheKey = buildRouteCacheKey(
        { lat: cluster.lat, lon: cluster.lon },
        { lat: next.lat, lon: next.lon },
        EXPOSURE_MAP_CONFIG.routeCacheCoordPrecision,
      );

      const cached = await getCachedRoute(cacheKey);
      if (cached) {
        if (!cancelled) {
          setOverrides(prev => ({
            ...prev,
            [segment.key]: { ...segment, coordinates: cached.coordinates, isFallback: cached.isFallback },
          }));
        }
        return;
      }

      const straightLineMeters = haversineMeters(cluster.lat, cluster.lon, next.lat, next.lon);
      const route = await fetchWalkingRoute(
        { lat: cluster.lat, lon: cluster.lon },
        { lat: next.lat, lon: next.lon },
      );

      const resolved: RouteHopSegment =
        route &&
        isReasonableRoute(route.distanceMeters, straightLineMeters, EXPOSURE_MAP_CONFIG.maxRouteDetourRatio)
          ? { ...segment, coordinates: decodePolyline(route.encodedPolyline), isFallback: false }
          : { ...segment, isFallback: true };

      await setCachedRoute(cacheKey, {
        coordinates: resolved.coordinates,
        isFallback: resolved.isFallback,
      });

      if (!cancelled) {
        setOverrides(prev => ({ ...prev, [segment.key]: resolved }));
      }
    };

    runWithConcurrencyLimit(seeded, EXPOSURE_MAP_CONFIG.maxConcurrentRouteRequests, resolveHop);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seeded]);

  return useMemo(
    () => seeded.map(segment => overrides[segment.key] ?? segment),
    [seeded, overrides],
  );
};
