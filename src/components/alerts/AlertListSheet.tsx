// src/components/alerts/AlertListSheet.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import ForecastSheet from '../ForecastSheet';
import { ALERT_UI } from '../../config/alertUiConfig';
import { ALERTS_SCREEN_COPY } from '../../config/alertCopy';
import { openAlertDetail } from '../../services/alertCheckBus';

export type AlertListItem = {
  key: string;
  title: string;
  meta: string;
  urgent: boolean;
  // Level color strip on the left (active alerts); none for sent messages.
  color?: string;
  // The message the row opens; null if it has aged out of the log.
  messageId: string | null;
};

type Props = {
  visible: boolean;
  title: string;
  items: readonly AlertListItem[];
  onClose: () => void;
};

// A list of alerts in a bottom sheet — the Alerts tab's "Active now" and
// "Recent alerts". Kept off the tab itself so a busy week of messages can
// never push the settings below it out of reach. A row closes this sheet
// and opens the alert's detail sheet, the one detail sheet at the app root.
const AlertListSheet = ({ visible, title, items, onClose }: Props) => {
  const { height } = useWindowDimensions();

  const open = (messageId: string) => {
    onClose();
    openAlertDetail(messageId);
  };

  return (
    <ForecastSheet visible={visible} title={title} onClose={onClose}>
      <ScrollView
        style={{ maxHeight: height * ALERT_UI.listScrollMaxHeightRatio }}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, index) => (
          <View key={item.key}>
            {index > 0 && <View style={styles.divider} />}
            <TouchableOpacity
              style={styles.row}
              onPress={item.messageId ? () => open(item.messageId!) : undefined}
              disabled={!item.messageId}
              accessibilityRole="button"
            >
              {item.color && <View style={[styles.swatch, { backgroundColor: item.color }]} />}
              <View style={styles.text}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>{item.meta}</Text>
                  {item.urgent && (
                    <View style={styles.urgentTag}>
                      <Text style={styles.urgentText}>{ALERTS_SCREEN_COPY.urgent}</Text>
                    </View>
                  )}
                </View>
              </View>
              {item.messageId && <ChevronRight size={20} color="#BBB" />}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </ForecastSheet>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  swatch: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: '#333' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  meta: { fontSize: 12, color: '#999' },
  urgentTag: {
    backgroundColor: ALERT_UI.urgentColor,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  urgentText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#EEE' },
});

export default AlertListSheet;
