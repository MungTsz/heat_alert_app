// src/screens/SettingsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, CheckCircle2, XCircle } from 'lucide-react-native';
import SettingsSection from '../components/SettingsSection';
import SettingsToggleRow from '../components/SettingsToggleRow';
import SegmentedControl from '../components/SegmentedControl';
import TimeStepperRow from '../components/TimeStepperRow';
import AlertProfileEditor from '../components/alerts/AlertProfileEditor';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { useLocationPermissionStatus } from '../hooks/useLocationPermissionStatus';
import { useMapSettings } from '../hooks/useMapSettings';
import { useExposureTrackingSettings } from '../hooks/useExposureTrackingSettings';
import { AllClearMode, DigestSlot, NoEventDays } from '../types/settings';
import {
  ALL_CLEAR_COPY,
  DELIVERY_SETTINGS_COPY,
  PROFILE_EDITOR_COPY,
} from '../config/alertCopy';
import { DIGEST_CONFIG } from '../config/alertConfig';
import { sendSampleNotification } from '../services/alertCheckService';
import { runAlertCheckNow } from '../services/alertCheckBus';

const ALL_CLEAR_OPTIONS: { value: AllClearMode; label: string }[] = (
  ['auto', 'always', 'off'] as const
).map(value => ({ value, label: ALL_CLEAR_COPY[value] }));

const NO_EVENT_OPTIONS: { value: NoEventDays; label: string }[] = (
  ['silent', 'summary'] as const
).map(value => ({ value, label: DELIVERY_SETTINGS_COPY.noEventOptions[value] }));

// Evening first: it carries the first heads-up of an episode.
const DIGEST_ROWS: { slot: DigestSlot; label: string; description: string }[] = [
  {
    slot: 'evening',
    label: DELIVERY_SETTINGS_COPY.eveningLabel,
    description: DELIVERY_SETTINGS_COPY.eveningDescription,
  },
  {
    slot: 'morning',
    label: DELIVERY_SETTINGS_COPY.morningLabel,
    description: DELIVERY_SETTINGS_COPY.morningDescription,
  },
];

// Settings decide HOW alerts arrive. WHEN a place counts as dangerous is set
// per place (Community → a card's alert line), apart from your own live
// location, which is "About you" here.
const SettingsScreen = () => {
  const { settings, update } = useNotificationSettings();
  const { granted, requestPermission, openAppSettings } = useLocationPermissionStatus();
  const { settings: mapSettings, update: updateMapSettings } = useMapSettings();
  const { enabled: exposureTrackingEnabled, setEnabled: setExposureTrackingEnabled } =
    useExposureTrackingSettings();

  const [checking, setChecking] = React.useState(false);

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

  const { quietHours } = settings;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Settings</Text>

        <SettingsSection
          title="ABOUT YOU"
          subtitle="Sets when alerts for your current location reach you"
        >
          <View style={styles.editorPadding}>
            <AlertProfileEditor
              profile={settings.currentLocationProfile}
              onChange={currentLocationProfile => update({ currentLocationProfile })}
              question={PROFILE_EDITOR_COPY.selfQuestion}
              showCaringFor={false}
            />
          </View>
        </SettingsSection>

        <SettingsSection
          title="NOTIFICATION SOURCES"
          subtitle="Choose where alerts are triggered from"
        >
          <SettingsToggleRow
            label="Current Location"
            description="Alert me based on my live location"
            value={settings.notifyCurrentLocation}
            onValueChange={notifyCurrentLocation => update({ notifyCurrentLocation })}
          />
          <View style={styles.divider} />
          <SettingsToggleRow
            label="Community Places"
            description="Alert me about my places, using who is there"
            value={settings.notifyBookmarkedLocations}
            onValueChange={notifyBookmarkedLocations => update({ notifyBookmarkedLocations })}
          />
        </SettingsSection>

        <SettingsSection title="DELIVERY" subtitle="How and when alerts reach you">
          {DIGEST_ROWS.map(({ slot, label, description }) => {
            const digest = settings.digests[slot];
            const setDigest = (patch: Partial<typeof digest>) =>
              update({ digests: { ...settings.digests, [slot]: { ...digest, ...patch } } });
            return (
              <View key={slot}>
                <SettingsToggleRow
                  label={label}
                  description={description}
                  value={digest.enabled}
                  onValueChange={enabled => setDigest({ enabled })}
                />
                {digest.enabled && (
                  <TimeStepperRow
                    label={DELIVERY_SETTINGS_COPY.timeLabel}
                    minuteOfDay={digest.minute}
                    onChange={minute => setDigest({ minute })}
                    range={DIGEST_CONFIG[slot]}
                  />
                )}
                <View style={styles.divider} />
              </View>
            );
          })}
          <SettingsToggleRow
            label={DELIVERY_SETTINGS_COPY.breakingLabel}
            description={DELIVERY_SETTINGS_COPY.breakingDescription}
            value={settings.breakingUpdates}
            onValueChange={breakingUpdates => update({ breakingUpdates })}
          />
          <View style={styles.divider} />
          <View style={styles.block}>
            <Text style={styles.rowLabel}>All clear message</Text>
            <Text style={styles.rowDescription}>
              Auto sends one only for places set up for family or others
            </Text>
            <View style={styles.segmentSpacing}>
              <SegmentedControl
                options={ALL_CLEAR_OPTIONS}
                value={settings.allClear}
                onChange={allClear => update({ allClear })}
              />
            </View>
          </View>
          <View style={styles.divider} />
          <SettingsToggleRow
            label="Quiet hours"
            description="Only Serious air quality and Extreme Danger heat index alerts come through"
            value={quietHours.enabled}
            onValueChange={enabled => update({ quietHours: { ...quietHours, enabled } })}
          />
          {quietHours.enabled && (
            <>
              <TimeStepperRow
                label="From"
                minuteOfDay={quietHours.startMinute}
                onChange={startMinute => update({ quietHours: { ...quietHours, startMinute } })}
              />
              <TimeStepperRow
                label="Until"
                minuteOfDay={quietHours.endMinute}
                onChange={endMinute => update({ quietHours: { ...quietHours, endMinute } })}
              />
            </>
          )}
          <View style={styles.divider} />
          <View style={styles.block}>
            <Text style={styles.rowLabel}>{DELIVERY_SETTINGS_COPY.noEventLabel}</Text>
            <Text style={styles.rowDescription}>{DELIVERY_SETTINGS_COPY.noEventDescription}</Text>
            <View style={styles.segmentSpacing}>
              <SegmentedControl
                options={NO_EVENT_OPTIONS}
                value={settings.noEventDays}
                onChange={noEventDays => update({ noEventDays })}
              />
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.testButton} onPress={sendSampleNotification}>
            <Text style={styles.testButtonText}>Preview a notification</Text>
          </TouchableOpacity>
        </SettingsSection>

        <SettingsSection title="MAP DISPLAY">
          {(['standard', 'hybrid'] as const).map(type => (
            <TouchableOpacity
              key={type}
              style={styles.mapTypeRow}
              onPress={() => updateMapSettings({ ...mapSettings, mapType: type })}
            >
              <Text style={styles.mapTypeLabel}>{type === 'standard' ? 'Default' : 'Satellite'}</Text>
              {mapSettings.mapType === type && <Text style={styles.mapTypeCheck}>✓</Text>}
            </TouchableOpacity>
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
          </SettingsSection>
        )}
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
  editorPadding: { paddingBottom: 6 },
  block: { paddingVertical: 12 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  rowDescription: { fontSize: 12, color: '#999', marginTop: 2 },
  segmentSpacing: { marginTop: 10 },
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
