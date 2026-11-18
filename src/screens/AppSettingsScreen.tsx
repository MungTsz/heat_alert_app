// src/screens/AppSettingsScreen.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, MapPin, CheckCircle2, XCircle } from 'lucide-react-native';
import SettingsSection from '../components/SettingsSection';
import SettingsToggleRow from '../components/SettingsToggleRow';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { useMapSettings } from '../hooks/useMapSettings';
import { MAP_TYPE_OPTIONS } from '../config/mapLayerConfig';
import { useLocationPermissionStatus } from '../hooks/useLocationPermissionStatus';
import { useExposureTrackingSettings } from '../hooks/useExposureTrackingSettings';
import { ALERTS_SCREEN_COPY } from '../config/alertCopy';
import { sendSampleGallery } from '../services/alertCheckService';
import { runAlertCheckNow } from '../services/alertCheckBus';
import EnviPreviewScreen from './EnviPreviewScreen';
import ScenePreviewScreen from './ScenePreviewScreen';

type Props = {
  visible: boolean;
  onClose: () => void;
};

// App-wide settings that are set once and rarely touched again — map style,
// location access, background exposure tracking and (dev builds) testing
// tools. Behind the Alerts tab's gear, its one fixed home, so they don't
// crowd the alert settings people do come back to. The map style is also
// on the map's own layer picker; both write the same stored value.
const AppSettingsScreen = ({ visible, onClose }: Props) => {
  const { update } = useNotificationSettings();
  const { settings: mapSettings, update: updateMapSettings } = useMapSettings();
  const { granted, requestPermission, openAppSettings } = useLocationPermissionStatus();
  const { enabled: exposureTrackingEnabled, setEnabled: setExposureTrackingEnabled } =
    useExposureTrackingSettings();

  const [checking, setChecking] = React.useState(false);
  const [enviPreviewOpen, setEnviPreviewOpen] = React.useState(false);
  const [scenePreviewOpen, setScenePreviewOpen] = React.useState(false);

  const handleRunCheckNow = async () => {
    setChecking(true);
    const ran = await runAlertCheckNow();
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
    // A full page rather than a bottom sheet: it holds several sections, and
    // Android's back closes it like any other page (onRequestClose).
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{ALERTS_SCREEN_COPY.appSettingsTitle}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SettingsSection title="MAP DISPLAY">
            {MAP_TYPE_OPTIONS.map(({ key, label }, index) => (
              <View key={key}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.mapTypeRow}
                  onPress={() => updateMapSettings({ ...mapSettings, mapType: key })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mapSettings.mapType === key }}
                >
                  <Text style={styles.mapTypeLabel}>{label}</Text>
                  {mapSettings.mapType === key && <Check size={18} color="#D9534F" />}
                </TouchableOpacity>
              </View>
            ))}
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
                      <Text style={[styles.permissionStatusText, { color: '#4CAF50' }]}>Allowed</Text>
                    </>
                  ) : granted === false ? (
                    <>
                      <XCircle size={14} color="#D9534F" />
                      <Text style={[styles.permissionStatusText, { color: '#D9534F' }]}>
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

          {/* Development builds only: runs the real check at once, skipping
              the batching wait (quiet hours and the daily cap still apply). */}
          {__DEV__ && (
            <SettingsSection title="NOTIFICATION TESTING" subtitle="Development builds only">
              <TouchableOpacity
                style={styles.testButton}
                onPress={handleRunCheckNow}
                disabled={checking}
              >
                <Text style={styles.testButtonText}>
                  {checking ? 'Checking...' : 'Run Real Alert Check Now'}
                </Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              {/* Every message type through the real composers, worded for
                  your first place — check wording and the detail sheet. */}
              <TouchableOpacity style={styles.testButton} onPress={() => sendSampleGallery()}>
                <Text style={styles.testButtonText}>Send Every Message Type</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.testButton}
                onPress={() => update({ aboutYouConfirmed: false })}
              >
                <Text style={styles.testButtonText}>Show First-Launch Question Again</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              {/* The real Environmental Index card in every situation, from
                  sample readings — check layout and wording per level. */}
              <TouchableOpacity style={styles.testButton} onPress={() => setEnviPreviewOpen(true)}>
                <Text style={styles.testButtonText}>Preview Environmental Index</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              {/* Home's cartoon scene at every heat / AQHI level, day and
                  night, from sample readings — with a Play tour. */}
              <TouchableOpacity style={styles.testButton} onPress={() => setScenePreviewOpen(true)}>
                <Text style={styles.testButtonText}>Preview Cartoon Scene</Text>
              </TouchableOpacity>
            </SettingsSection>
          )}
        </ScrollView>
      </SafeAreaView>

      {__DEV__ && (
        <EnviPreviewScreen visible={enviPreviewOpen} onClose={() => setEnviPreviewOpen(false)} />
      )}
      {__DEV__ && (
        <ScenePreviewScreen visible={scenePreviewOpen} onClose={() => setScenePreviewOpen(false)} />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  divider: { height: 1, backgroundColor: '#EEE' },
  mapTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  mapTypeLabel: { fontSize: 15, color: '#333' },
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

export default AppSettingsScreen;
