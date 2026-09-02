// src/screens/SettingsScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapPin,
  CheckCircle2,
  XCircle,
  Thermometer,
  Wind,
} from 'lucide-react-native';
import SettingsSection from '../components/SettingsSection';
import SettingsToggleRow from '../components/SettingsToggleRow';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { useLocationPermissionStatus } from '../hooks/useLocationPermissionStatus';
import { useMapSettings } from '../hooks/useMapSettings';
import { useExposureTrackingSettings } from '../hooks/useExposureTrackingSettings';
import { HEAT_LEVELS_ORDERED } from '../types/settings';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';
import { getAqhiInfo } from '../utils/aqhiUtils';
import { sendTestNotification } from '../services/notificationService';
import { runHeatAlertCheckNow } from '../services/heatAlertBus';
import { AqhiLevel } from '../types/settings';

const LEVEL_SAMPLE_TEMP: Record<string, number> = {
  Safe: 25,
  Caution: 30,
  'Extreme Caution': 35,
  Danger: 45,
  'Extreme Danger': 55,
};

// AQHI thresholds use the real 1-11 severity bands, grouped into named
// levels for the toggle UI, mirroring how heat's levels work.
const AQHI_LEVEL_GROUPS: { label: AqhiLevel; sampleValue: number }[] = [
  { label: 'Low', sampleValue: 2 },
  { label: 'Moderate', sampleValue: 5 },
  { label: 'High', sampleValue: 7 },
  { label: 'Very High', sampleValue: 9 },
  { label: 'Serious', sampleValue: 11 },
];

const SettingsScreen = () => {
  const {
    settings,
    toggleAlertLevel,
    setNotifyCurrentLocation,
    setNotifyBookmarkedLocations,
  } = useNotificationSettings();
  const { granted, requestPermission, openAppSettings } =
    useLocationPermissionStatus();
  const { settings: mapSettings, update: updateMapSettings } = useMapSettings();
  const { enabled: exposureTrackingEnabled, setEnabled: setExposureTrackingEnabled } =
    useExposureTrackingSettings();

  const [checking, setChecking] = React.useState(false);
  const [activeIndexTab, setActiveIndexTab] = React.useState<'heat' | 'aqhi'>(
    'heat',
  );

  const handleRunCheckNow = async () => {
    setChecking(true);
    const ran = await runHeatAlertCheckNow();
    setChecking(false);
    if (!ran) console.log('Engine not ready yet — try again in a moment.');
  };

  const handleLocationToggle = async (value: boolean) => {
    if (value) {
      await requestPermission();
    } else {
      openAppSettings();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Settings</Text>

        {/* Index selector card — pick which index's thresholds to edit below */}
        <SettingsSection
          title="ALERT THRESHOLDS"
          subtitle="Choose which levels send a notification, per index"
        >
          <View style={styles.indexTabRow}>
            <TouchableOpacity
              style={[
                styles.indexTab,
                activeIndexTab === 'heat' && styles.indexTabActive,
              ]}
              onPress={() => setActiveIndexTab('heat')}
            >
              <Thermometer
                size={16}
                color={activeIndexTab === 'heat' ? '#fff' : '#666'}
              />
              <Text
                style={[
                  styles.indexTabText,
                  activeIndexTab === 'heat' && styles.indexTabTextActive,
                ]}
              >
                Heat Index
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.indexTab,
                activeIndexTab === 'aqhi' && styles.indexTabActive,
              ]}
              onPress={() => setActiveIndexTab('aqhi')}
            >
              <Wind
                size={16}
                color={activeIndexTab === 'aqhi' ? '#fff' : '#666'}
              />
              <Text
                style={[
                  styles.indexTabText,
                  activeIndexTab === 'aqhi' && styles.indexTabTextActive,
                ]}
              >
                AQHI
              </Text>
            </TouchableOpacity>
          </View>

          {activeIndexTab === 'heat'
            ? HEAT_LEVELS_ORDERED.map((level, i) => {
                const { color } = getHeatIndexInfo(LEVEL_SAMPLE_TEMP[level]);
                return (
                  <View key={level}>
                    <View style={styles.levelRowWrapper}>
                      <View
                        style={[styles.levelDot, { backgroundColor: color }]}
                      />
                      <View style={styles.levelRowContent}>
                        <SettingsToggleRow
                          label={level}
                          value={settings.alertLevels[level]}
                          onValueChange={value =>
                            toggleAlertLevel(level, value)
                          }
                        />
                      </View>
                    </View>
                    {i < HEAT_LEVELS_ORDERED.length - 1 && (
                      <View style={styles.divider} />
                    )}
                  </View>
                );
              })
            : AQHI_LEVEL_GROUPS.map((group, i) => {
                const { color } = getAqhiInfo(group.sampleValue);
                return (
                  <View key={group.label}>
                    <View style={styles.levelRowWrapper}>
                      <View
                        style={[styles.levelDot, { backgroundColor: color }]}
                      />
                      <View style={styles.levelRowContent}>
                        <SettingsToggleRow
                          label={group.label}
                          value={!!settings.aqhiAlertLevels?.[group.label]}
                          onValueChange={value =>
                            toggleAlertLevel(group.label, value, 'aqhi')
                          }
                        />
                      </View>
                    </View>
                    {i < AQHI_LEVEL_GROUPS.length - 1 && (
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
            label="Community Bookmarks"
            description="Alert me about places I'm monitoring"
            value={settings.notifyBookmarkedLocations}
            onValueChange={setNotifyBookmarkedLocations}
          />
        </SettingsSection>

        <SettingsSection title="MAP DISPLAY">
          {(['standard', 'satellite', 'terrain'] as const).map(type => (
            <TouchableOpacity
              key={type}
              style={styles.mapTypeRow}
              onPress={() =>
                updateMapSettings({ ...mapSettings, mapType: type })
              }
            >
              <Text style={styles.mapTypeLabel}>
                {type === 'standard'
                  ? 'Default'
                  : type === 'satellite'
                  ? 'Satellite'
                  : 'Terrain'}
              </Text>
              {mapSettings.mapType === type && (
                <Text style={styles.mapTypeCheck}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
          <View style={styles.divider} />
          <SettingsToggleRow
            label="3D Buildings"
            description="Show raised building outlines"
            value={mapSettings.show3DBuildings}
            onValueChange={v =>
              updateMapSettings({ ...mapSettings, show3DBuildings: v })
            }
          />
        </SettingsSection>

        <SettingsSection
          title="EXPOSURE TRACKING"
          subtitle="Track my location in the background to show today's spatial-temporal exposure on the Exposure tab"
        >
          <SettingsToggleRow
            label="Background Exposure Tracking"
            description="Uses your location even when the app is closed"
            value={exposureTrackingEnabled}
            onValueChange={setExposureTrackingEnabled}
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
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 20, paddingBottom: 80 },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  indexTabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  indexTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  indexTabActive: { backgroundColor: '#D9534F' },
  indexTabText: { fontSize: 13, fontWeight: '700', color: '#666' },
  indexTabTextActive: { color: '#fff' },
  levelRowWrapper: { flexDirection: 'row', alignItems: 'center' },
  levelDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  levelRowContent: { flex: 1 },
  divider: { height: 1, backgroundColor: '#EEE' },
  mapTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  mapTypeLabel: { fontSize: 15, color: '#333' },
  mapTypeCheck: { color: '#D9534F', fontWeight: '700' },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  permissionTextContainer: { flex: 1 },
  permissionLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  permissionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  permissionStatusText: { fontSize: 12, color: '#999' },
  permissionButton: {
    backgroundColor: '#D9534F',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  permissionButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  testButton: { paddingVertical: 14 },
  testButtonText: { fontSize: 15, fontWeight: '600', color: '#D9534F' },
});

export default SettingsScreen;
