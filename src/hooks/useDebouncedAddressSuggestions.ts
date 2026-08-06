import { useEffect, useRef, useState } from 'react';
import { searchAddressSuggestions, GeocodeResult } from '../utils/geocode';

export const useDebouncedAddressSuggestions = (
  query: string,
  delayMs: number = 400,
) => {
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const thisRequestId = ++requestIdRef.current;

    debounceRef.current = setTimeout(async () => {
      const results = await searchAddressSuggestions(query);
      // Only apply results if this is still the most recent request —
      // prevents an older, slower response from overwriting a newer one
      if (thisRequestId === requestIdRef.current) {
        setSuggestions(results);
        setLoading(false);
      }
    }, delayMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, delayMs]);

  return { suggestions, loading };
};
