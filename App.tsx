// App.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import PlacesScreen from './src/screens/PlacesScreen';
import ExposureScreen from './src/screens/ExposureScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import FloatingNavBar from './src/components/FloatingNavBar';
import AlertEngine from './src/components/AlertEngine';
import AlertDetailSheet from './src/components/alerts/AlertDetailSheet';
import AboutYouOnboarding from './src/components/alerts/AboutYouOnboarding';
import { useAlertDetailOpen } from './src/hooks/useAlertDetailOpen';
import { useActiveAlerts } from './src/hooks/useActiveAlerts';
import { resumeTrackingIfEnabled } from './src/services/deviceTrackingService';
import { onNavigationRequest } from './src/services/navigationBus';
import { DEFAULT_TAB, TabName } from './src/config/navConfig';

const App = () => {
  const [activeTab, setActiveTab] = useState<TabName>(DEFAULT_TAB);
  // A place another tab asked Places to open (see navigationBus).
  const [focusPlaceId, setFocusPlaceId] = useState<string | null>(null);
  // Mounted at the root so a tapped notification opens its details over
  // whichever tab is showing.
  const { messageId: alertDetailId, close: closeAlertDetail } = useAlertDetailOpen();
  // The Alerts tab carries a dot while anything is active, so an alert is
  // noticed from every tab, not only from Home's banner.
  const activeAlerts = useActiveAlerts();
  const hasActiveAlert = Object.values(activeAlerts).some(badges => badges.length > 0);

  // At the root, not in the Exposure/Alerts tabs, so stationary heartbeats
  // are recorded whichever tab the session is spent on.
  useEffect(() => {
    resumeTrackingIfEnabled();
  }, []);

  useEffect(
    () =>
      onNavigationRequest(({ tab, placeId }) => {
        setActiveTab(tab);
        if (placeId) setFocusPlaceId(placeId);
      }),
    [],
  );

  // With no navigation library, Android's back button would otherwise close
  // the app from any tab. Back goes to the home tab first, as Android users
  // expect, and only leaves from there. Open sheets are Modals whose
  // onRequestClose takes the back press before it reaches this handler.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeTab === DEFAULT_TAB) return false;
      setActiveTab(DEFAULT_TAB);
      return true;
    });
    return () => subscription.remove();
  }, [activeTab]);

  const clearFocusPlace = useCallback(() => setFocusPlaceId(null), []);

  const renderScreen = () => {
    switch (activeTab) {
      case 'Environment':
        return <HomeScreen />;
      case 'Places':
        return <PlacesScreen focusPlaceId={focusPlaceId} onFocusHandled={clearFocusPlace} />;
      case 'Exposure':
        return <ExposureScreen />;
      case 'Alerts':
        return <AlertsScreen />;
    }
  };

  return (
    <SafeAreaProvider>
      <AlertEngine />
      <View style={styles.container}>
        {renderScreen()}
        <FloatingNavBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          dottedTabs={hasActiveAlert ? ['Alerts'] : []}
        />
      </View>
      <AlertDetailSheet messageId={alertDetailId} onClose={closeAlertDetail} />
      {/* First launch only: asks who the owner is, once. */}
      <AboutYouOnboarding />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
