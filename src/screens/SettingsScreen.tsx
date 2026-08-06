import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, CheckCircle2, XCircle } from 'lucide-react-native';
import SettingsSection from '../components/SettingsSection';
import SettingsToggleRow from '../components/SettingsToggleRow';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { useLocationPermissionStatus } from '../hooks/useLocationPermissionStatus';
import { HEAT_LEVELS_ORDERED } from '../types/settings';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';
import { sendTestNotification } from '../services/notificationService';
import { runHeatAlertCheckNow } from '../services/heatAlertBus';

// Rough representative Celsius value per level, just to pull a matching
// color from getHeatIndexInfo for each row's accent dot — purely visual.
const LEVEL_SAMPLE_TEMP: Record<string, number> = {
  Neutral: 20,
  'Very Warm': 28,
  Hot: 33,
  'Very Hot': 42,
  'Extremely Hot': 56,
};

const SettingsScreen = () => {
  const {
    settings,
    toggleAlertLevel,
    setNotifyCurrentLocation,
    setNotifyBookmarkedLocations,
  } = useNotificationSettings();
  const { granted, requestPermission, openAppSettings } =
    useLocationPermissionStatus();

  const [checking, setChecking] = React.useState(false);

  const handleRunCheckNow = async () => {
    setChecking(true);
    const ran = await runHeatAlertCheckNow();
    setChecking(false);
    if (!ran) {
      console.log('Engine not ready yet — try again in a moment.');
    }
  };
  const handleLocationToggle = async (value: boolean) => {
    if (value) {
      await requestPermission();
    } else {
      // Android has no programmatic "revoke" API — direct the user to
      // system Settings if they want to turn it off.
      openAppSettings();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Settings</Text>

        <SettingsSection
          title="ALERT THRESHOLDS"
          subtitle="Choose which heat index levels send you a notification"
        >
          {HEAT_LEVELS_ORDERED.map((level, i) => {
            const { color } = getHeatIndexInfo(LEVEL_SAMPLE_TEMP[level]);
            return (
              <View key={level}>
                <View style={styles.levelRowWrapper}>
                  <View style={[styles.levelDot, { backgroundColor: color }]} />
                  <View style={styles.levelRowContent}>
                    <SettingsToggleRow
                      label={level}
                      value={settings.alertLevels[level]}
                      onValueChange={value => toggleAlertLevel(level, value)}
                    />
                  </View>
                </View>
                {i < HEAT_LEVELS_ORDERED.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            );
          })}
        </SettingsSection>

        <SettingsSection
          title="NOTIFICATION SOURCES"
          subtitle="Choose where alerts are triggered from"
        >
          <SettingsToggleRow
            label="Current Location"
            description="Alert me based on my live location"
            value={settings.notifyCurrentLocation}
            onValueChange={setNotifyCurrentLocation}
          />
          <View style={styles.divider} />
          <SettingsToggleRow
            label="Community Houses"
            description="Alert me about houses I'm monitoring"
            value={settings.notifyBookmarkedLocations}
            onValueChange={setNotifyBookmarkedLocations}
          />
        </SettingsSection>

        <SettingsSection title="LOCATION ACCESS">
          <View style={styles.permissionRow}>
            <MapPin size={20} color="#D9534F" />
            <View style={styles.permissionTextContainer}>
              <Text style={styles.permissionLabel}>GPS Location</Text>
              <View style={styles.permissionStatusRow}>
                {granted === true ? (
                  <>
                    <CheckCircle2 size={14} color="#4CAF50" />
                    <Text
                      style={[
                        styles.permissionStatusText,
                        { color: '#4CAF50' },
                      ]}
                    >
                      Allowed
                    </Text>
                  </>
                ) : granted === false ? (
                  <>
                    <XCircle size={14} color="#D9534F" />
                    <Text
                      style={[
                        styles.permissionStatusText,
                        { color: '#D9534F' },
                      ]}
                    >
                      Not allowed
                    </Text>
                  </>
                ) : (
                  <Text style={styles.permissionStatusText}>Checking...</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={() => handleLocationToggle(granted !== true)}
            >
              <Text style={styles.permissionButtonText}>
                {granted === true ? 'Manage' : 'Enable'}
              </Text>
            </TouchableOpacity>
          </View>
        </SettingsSection>
        <SettingsSection
          title="NOTIFICATION TESTING"
          subtitle="For development — trigger alerts manually"
        >
          <TouchableOpacity
            style={styles.testButton}
            onPress={sendTestNotification}
          >
            <Text style={styles.testButtonText}>Send Test Notification</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleRunCheckNow}
            disabled={checking}
          >
            <Text style={styles.testButtonText}>
              {checking ? 'Checking...' : 'Run Real Alert Check Now'}
            </Text>
          </TouchableOpacity>
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 80,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  levelRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  levelRowContent: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  permissionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  permissionStatusText: {
    fontSize: 12,
    color: '#999',
  },
  permissionButton: {
    backgroundColor: '#D9534F',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  testButton: {
    paddingVertical: 14,
  },
  testButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#D9534F',
  },
});

export default SettingsScreen;
