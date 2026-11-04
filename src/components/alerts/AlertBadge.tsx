// src/components/alerts/AlertBadge.tsx
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BellRing } from 'lucide-react-native';
import { ActiveAlertBadge } from '../../hooks/useActiveAlerts';
import { ALERT_UI } from '../../config/alertUiConfig';
import { openAlertDetail } from '../../services/alertCheckBus';

type Props = {
  badge: ActiveAlertBadge;
  // Overrides badge.text — Community cards prefix the hazard name.
  label?: string;
};

// A told, still-relevant alert on a card. Tapping opens the message that
// announced it, so the card links straight to the full advice.
const AlertBadge = ({ badge, label }: Props) => {
  const color = badge.kind === 'now' ? ALERT_UI.badgeNowColor : ALERT_UI.badgeHeadsUpColor;
  const text = label ?? badge.text;
  const messageId = badge.messageId;
  return (
    <TouchableOpacity
      style={[styles.pill, { backgroundColor: color }]}
      onPress={messageId ? () => openAlertDetail(messageId) : undefined}
      disabled={!messageId}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`${text}. Tap for details`}
    >
      <BellRing size={11} color="#FFFFFF" />
      <Text style={styles.text} numberOfLines={1}>
        {text}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    maxWidth: '100%',
  },
  text: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', flexShrink: 1 },
});

export default AlertBadge;
