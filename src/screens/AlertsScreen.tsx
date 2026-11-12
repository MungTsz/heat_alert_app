// src/screens/AlertsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Settings } from 'lucide-react-native';
import SettingsSection from '../components/SettingsSection';
import SettingsToggleRow from '../components/SettingsToggleRow';
import SegmentedControl from '../components/SegmentedControl';
import TimeStepperRow from '../components/TimeStepperRow';
import AlertProfileSheet from '../components/alerts/AlertProfileSheet';
import AppSettingsScreen from './AppSettingsScreen';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { ActiveAlertBadge, useActiveAlerts } from '../hooks/useActiveAlerts';
import { useAlertMessageLog } from '../hooks/useAlertMessageLog';
import { useBookmarkList } from '../hooks/useBookmarkList';
import { AllClearMode, DigestSlot, NoEventDays } from '../types/settings';
import {
  ABOUT_YOU_COPY,
  ALERTS_SCREEN_COPY,
  ALL_CLEAR_COPY,
  AUDIENCE_COPY,
  CURRENT_LOCATION_LABEL,
  DELIVERY_SETTINGS_COPY,
  HAZARD_COPY,
  NOTIFICATION_SOURCES_COPY,
} from '../config/alertCopy';
import {
  ALERT_MESSAGE_LOG_CONFIG,
  CURRENT_LOCATION_PLACE_ID,
  DIGEST_CONFIG,
  HAZARD_KINDS,
} from '../config/alertConfig';
import { ALERT_UI } from '../config/alertUiConfig';
import { sendSampleNotification } from '../services/alertCheckService';
import { openAlertDetail } from '../services/alertCheckBus';
import { summarizeAlertLevels } from '../utils/alertProfile';
import { describeSentAt } from '../utils/alertMessages';

const DAY_MS = 24 * 60 * 60 * 1000;

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

const badgeColor = (badge: ActiveAlertBadge): string =>
  badge.urgent
    ? ALERT_UI.urgentColor
    : badge.kind === 'now'
      ? ALERT_UI.badgeNowColor
      : ALERT_UI.badgeHeadsUpColor;

type ActiveRow = { placeId: string; placeLabel: string; badge: ActiveAlertBadge };

// The alert tab, top to bottom: what is happening now, what was sent, then
// who you are and how alerts reach you. WHEN a saved place counts as
// dangerous is set per place (Places → a card's alert line); app-wide
// settings that are rarely changed sit behind the header's gear.
const AlertsScreen = () => {
  const { settings, update } = useNotificationSettings();
  const activeAlerts = useActiveAlerts();
  const recentMessages = useAlertMessageLog();
  const { bookmarks } = useBookmarkList();

  const [editingAboutYou, setEditingAboutYou] = React.useState(false);
  const [appSettingsOpen, setAppSettingsOpen] = React.useState(false);

  // Your own location first, then places in the user's own Places order,
  // each place's hazards in the app's usual heat-then-AQHI order. An event
  // for a place deleted since has no name to show, so it is left out.
  const activeRows: ActiveRow[] = [
    { id: CURRENT_LOCATION_PLACE_ID, label: CURRENT_LOCATION_LABEL },
    ...bookmarks,
  ].flatMap(place =>
    HAZARD_KINDS.flatMap(hazard =>
      (activeAlerts[place.id] ?? [])
        .filter(badge => badge.hazard === hazard)
        .map(badge => ({ placeId: place.id, placeLabel: place.label, badge })),
    ),
  );

  const nowMs = Date.now();
  const { quietHours } = settings;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{ALERTS_SCREEN_COPY.title}</Text>
          <TouchableOpacity
            style={styles.gearButton}
            onPress={() => setAppSettingsOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={ALERTS_SCREEN_COPY.appSettingsLabel}
          >
            <Settings size={22} color="#333" />
          </TouchableOpacity>
        </View>

        <SettingsSection title={ALERTS_SCREEN_COPY.activeTitle}>
          {activeRows.length === 0 ? (
            <Text style={styles.emptyText}>{ALERTS_SCREEN_COPY.activeEmpty}</Text>
          ) : (
            activeRows.map(({ placeId, placeLabel, badge }, index) => (
              <View key={`${placeId}|${badge.hazard}`}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.listRow}
                  onPress={badge.messageId ? () => openAlertDetail(badge.messageId!) : undefined}
                  disabled={!badge.messageId}
                  accessibilityRole="button"
                >
                  <View style={[styles.swatch, { backgroundColor: badgeColor(badge) }]} />
                  <View style={styles.listText}>
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {HAZARD_COPY[badge.hazard].name} · {placeLabel}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.rowDescription}>{badge.text}</Text>
                      {badge.urgent && <UrgentTag />}
                    </View>
                  </View>
                  {badge.messageId && <ChevronRight size={20} color="#BBB" />}
                </TouchableOpacity>
              </View>
            ))
          )}
        </SettingsSection>

        <SettingsSection
          title={ALERTS_SCREEN_COPY.recentTitle}
          subtitle={ALERTS_SCREEN_COPY.recentSubtitle(
            Math.round(ALERT_MESSAGE_LOG_CONFIG.retentionMs / DAY_MS),
          )}
        >
          {recentMessages.length === 0 ? (
            <Text style={styles.emptyText}>{ALERTS_SCREEN_COPY.recentEmpty}</Text>
          ) : (
            recentMessages.map((message, index) => (
              <View key={message.id}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.listRow}
                  onPress={() => openAlertDetail(message.id)}
                  accessibilityRole="button"
                >
                  <View style={styles.listText}>
                    <Text style={styles.rowLabel} numberOfLines={2}>
                      {message.title}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.rowDescription}>
                        {describeSentAt(message.sentAtMs, nowMs)}
                      </Text>
                      {message.urgent && <UrgentTag />}
                    </View>
                  </View>
                  <ChevronRight size={20} color="#BBB" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </SettingsSection>

        {/* One summary row: who the owner is rarely changes, so the full
            editor opens only when they mean to change it. */}
        <SettingsSection title={ABOUT_YOU_COPY.sectionTitle} subtitle={ABOUT_YOU_COPY.sectionSubtitle}>
          <TouchableOpacity
            style={styles.summaryRow}
            onPress={() => setEditingAboutYou(true)}
            accessibilityRole="button"
          >
            <View style={styles.summaryText}>
              <Text style={styles.rowLabel}>
                {AUDIENCE_COPY[settings.currentLocationProfile.audience].label}
              </Text>
              <Text style={styles.rowDescription}>
                {summarizeAlertLevels(settings.currentLocationProfile)}
              </Text>
            </View>
            <ChevronRight size={20} color="#BBB" />
          </TouchableOpacity>
        </SettingsSection>

        <SettingsSection
          title={NOTIFICATION_SOURCES_COPY.title}
          subtitle={NOTIFICATION_SOURCES_COPY.subtitle}
        >
          <SettingsToggleRow
            label={NOTIFICATION_SOURCES_COPY.currentLabel}
            description={NOTIFICATION_SOURCES_COPY.currentDescription}
            value={settings.notifyCurrentLocation}
            onValueChange={notifyCurrentLocation => update({ notifyCurrentLocation })}
          />
          <View style={styles.divider} />
          <SettingsToggleRow
            label={NOTIFICATION_SOURCES_COPY.placesLabel}
            description={NOTIFICATION_SOURCES_COPY.placesDescription}
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
      </ScrollView>

      {editingAboutYou && (
        <AlertProfileSheet
          title={ABOUT_YOU_COPY.sheetTitle}
          initialProfile={settings.currentLocationProfile}
          onSave={currentLocationProfile => {
            // Saving here answers the first-launch question too.
            update({ currentLocationProfile, aboutYouConfirmed: true });
            setEditingAboutYou(false);
          }}
          onCancel={() => setEditingAboutYou(false)}
        />
      )}

      <AppSettingsScreen visible={appSettingsOpen} onClose={() => setAppSettingsOpen(false)} />
    </SafeAreaView>
  );
};

const UrgentTag = () => (
  <View style={styles.urgentTag}>
    <Text style={styles.urgentText}>{ALERTS_SCREEN_COPY.urgent}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 20, paddingBottom: 140 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
  },
  gearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 14, color: '#999', paddingVertical: 14 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  listText: { flex: 1 },
  swatch: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  urgentTag: {
    backgroundColor: ALERT_UI.urgentColor,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  urgentText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  summaryText: { flex: 1 },
  block: { paddingVertical: 12 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  rowDescription: { fontSize: 12, color: '#999', marginTop: 2 },
  segmentSpacing: { marginTop: 10 },
  divider: { height: 1, backgroundColor: '#EEE' },
  testButton: { paddingVertical: 14 },
  testButtonText: { fontSize: 15, fontWeight: '600', color: '#D9534F' },
});

export default AlertsScreen;
