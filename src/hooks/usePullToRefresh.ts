// src/hooks/usePullToRefresh.ts
import { useCallback, useState } from 'react';

// A dedicated gesture-scoped `refreshing` flag for RefreshControl — kept
// separate from a screen's own `loading` state, since that also flips true
// on initial mount and (for polled data) on background refreshes, which
// would pop the pull-to-refresh spinner with no pull gesture behind it.
export const usePullToRefresh = (refreshFn: () => Promise<void>) => {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshFn();
    } finally {
      setRefreshing(false);
    }
  }, [refreshFn]);

  return { refreshing, onRefresh };
};
