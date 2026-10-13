// src/utils/fetchWithTimeout.ts

// react-native's fetch has no request timeout of its own — without this, a
// slow or hung server is only cut off by the underlying platform networking
// default (~60s), long after the UI should have moved on.
export const fetchWithTimeout = async (
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};
