// App.tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import FloatingNavBar, { TabName } from './src/components/FloatingNavBar';
import SettingsScreen from './src/screens/SettingsScreen';
import HeatAlertEngine from './src/components/HeatAlertEngine';

const App = () => {
  const [activeTab, setActiveTab] = useState<TabName>('HeatIndex');

  const renderScreen = () => {
    switch (activeTab) {
      case 'HeatIndex':
        return <HomeScreen />;
      case 'Community':
        return <CommunityScreen />;
      case 'Settings':
        return <SettingsScreen />;
    }
  };

  return (
    <SafeAreaProvider>
      <HeatAlertEngine />
      <View style={styles.container}>
        {renderScreen()}
        <FloatingNavBar activeTab={activeTab} onTabChange={setActiveTab} />
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
