// App.tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import ExposureScreen from './src/screens/ExposureScreen';
import FloatingNavBar, { TabName } from './src/components/FloatingNavBar';
import SettingsScreen from './src/screens/SettingsScreen';
import AlertEngine from './src/components/AlertEngine';
import AlertDetailSheet from './src/components/alerts/AlertDetailSheet';
import { useAlertDetailOpen } from './src/hooks/useAlertDetailOpen';

const App = () => {
  const [activeTab, setActiveTab] = useState<TabName>('Environment');
  // Mounted at the root so a tapped notification opens its details over
  // whichever tab is showing.
  const { messageId: alertDetailId, close: closeAlertDetail } = useAlertDetailOpen();

  const renderScreen = () => {
    switch (activeTab) {
      case 'Environment':
        return <HomeScreen />;
      case 'Exposure':
        return <ExposureScreen />;
      case 'Community':
        return <CommunityScreen />;
      case 'Settings':
        return <SettingsScreen />;
    }
  };

  return (
    <SafeAreaProvider>
      <AlertEngine />
      <View style={styles.container}>
        {renderScreen()}
        <FloatingNavBar activeTab={activeTab} onTabChange={setActiveTab} />
      </View>
      <AlertDetailSheet messageId={alertDetailId} onClose={closeAlertDetail} />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
