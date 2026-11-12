// src/components/alerts/HomeAlertBanner.tsx
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BellRing, ChevronRight } from 'lucide-react-native';
import { ActiveAlertBadge } from '../../hooks/useActiveAlerts';
import { ACTIVE_ALERT_BADGE_COPY, HOME_ALERT_COPY } from '../../config/alertCopy';
import { ALERT_UI } from '../../config/alertUiConfig';
import { HAZARD_KINDS } from '../../config/alertConfig';
import { openAlertDetail } from '../../services/alertCheckBus';

type Props = {
  // Told alerts at the user's own location (useActiveAlerts).
  badges: readonly ActiveAlertBadge[];
};

// Most pressing first: urgent, then live, then a heads-up.
const concern = (badge: ActiveAlertBadge): number =>
  badge.urgent ? 2 : badge.kind === 'now' ? 1 : 0;

// The most important thing on Home on an alert day, so it is not left to a
// small badge on a card. Sits in the sky above the scene's character, where
// the screen is otherwise empty, and shows only while an alert is active.
// One line for both hazards, worded like the card badges; tapping opens the
// detail sheet of the most pressing one.
const HomeAlertBanner = ({ badges }: Props) => {
  if (badges.length === 0) return null;

  const lead = [...badges].sort((a, b) => concern(b) - concern(a))[0];
  const color = lead.urgent
    ? ALERT_UI.urgentColor
    : lead.kind === 'now'
      ? ALERT_UI.badgeNowColor
      : ALERT_UI.badgeHeadsUpColor;
  const text = HAZARD_KINDS.flatMap(hazard =>
    badges
      .filter(b => b.hazard === hazard)
      .map(b => ACTIVE_ALERT_BADGE_COPY.withHazard(hazard, b.text)),
  ).join(HOME_ALERT_COPY.separator);
  const messageId = lead.messageId;

  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: color }]}
      onPress={messageId ? () => openAlertDetail(messageId) : undefined}
      disabled={!messageId}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityHint={HOME_ALERT_COPY.accessibilityHint}
    >
      <BellRing size={16} color="#FFFFFF" />
      <Text style={styles.text} numberOfLines={2}>
        {text}
      </Text>
      {messageId && <ChevronRight size={18} color="#FFFFFF" />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  text: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});

export default HomeAlertBanner;
