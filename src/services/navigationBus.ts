// src/services/navigationBus.ts
import type { TabName } from '../config/navConfig';

// There is no navigation library: App.tsx owns the active tab. This
// module-level registry (same pattern as alertCheckBus) lets any screen or
// sheet send the user to another tab without prop drilling — the links
// that make the four tabs one app (a map pin or an Exposure stay opening
// that place in Places).
export type NavigationRequest = {
  tab: TabName;
  // Places only: the saved place to open once the tab shows.
  placeId?: string;
};

const listeners = new Set<(request: NavigationRequest) => void>();

export const onNavigationRequest = (listener: (request: NavigationRequest) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const openTab = (tab: TabName) => listeners.forEach(listener => listener({ tab }));

export const openPlace = (placeId: string) =>
  listeners.forEach(listener => listener({ tab: 'Places', placeId }));
