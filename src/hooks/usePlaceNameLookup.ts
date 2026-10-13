// src/hooks/usePlaceNameLookup.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { PLACE_LOOKUP_CONFIG } from '../config/placeLookupConfig';
import { formatPlaceAddress, lookupPlaceContext } from '../services/placeLookupService';
import { PlaceCategory } from '../types/bookmark';
import { buildDefaultPlaceName } from '../utils/placeNaming';

type Coordinates = { latitude: number; longitude: number };
export type PlaceNameResult = { name: string; address: string };

// Default name + address for wherever the place picker's pin settles.
// `existingNames` must be referentially stable (memoize it) — it's an effect
// dependency.
export const usePlaceNameLookup = (
  center: Coordinates | null,
  category: PlaceCategory,
  existingNames: readonly string[],
) => {
  const [result, setResult] = useState<PlaceNameResult | null>(null);
  const [loading, setLoading] = useState(false);
  // Only the newest lookup may write state: an earlier, slower one finishing
  // late would otherwise show the name of a spot the pin already left.
  const latestRequestRef = useRef(0);

  const resolve = useCallback(async (): Promise<PlaceNameResult | null> => {
    if (!center) return null;
    const context = await lookupPlaceContext(center.latitude, center.longitude);
    return {
      name: buildDefaultPlaceName(context, category, existingNames),
      address: formatPlaceAddress(context, center.latitude, center.longitude),
    };
  }, [center, category, existingNames]);

  useEffect(() => {
    if (!center) return;
    const requestId = ++latestRequestRef.current;
    setLoading(true);
    // Waits for the map to stay put — dragging fires a stream of region
    // changes, and the public lookup servers allow ~1 request/second.
    const timer = setTimeout(async () => {
      const next = await resolve();
      if (requestId !== latestRequestRef.current) return;
      setResult(next);
      setLoading(false);
    }, PLACE_LOOKUP_CONFIG.lookupDebounceMs);
    return () => clearTimeout(timer);
  }, [center, resolve]);

  // `resolve` lets Save get the final answer for the current pin straight
  // away (lookups are cached, so this reuses any request already in flight)
  // instead of waiting out the debounce.
  return { result, loading, resolve };
};
