// Runs `worker` over every item with at most `limit` in flight at once —
// used to cap simultaneous Routes API requests (a single day's report can
// have dozens of hops) instead of firing them all at once. Hand-rolled
// rather than a dependency, matching this codebase's existing preference for
// small self-contained utils (e.g. geoClustering.ts's own haversine).
export const runWithConcurrencyLimit = async <T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> => {
  let cursor = 0;
  const runWorker = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor++;
      // One item rejecting must not stop this lane from pulling the rest of
      // the queue — every item should still get attempted.
      await worker(items[index], index).catch(error =>
        console.log('runWithConcurrencyLimit worker failed:', error),
      );
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, runWorker),
  );
};
