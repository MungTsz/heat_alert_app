// src/components/LocationContextSheet.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Plus } from 'lucide-react-native';
import { LOCATION_CONTEXT_SHEET_COPY } from '../config/alertCopy';
import { ALERT_UI } from '../config/alertUiConfig';
import { LOCATION_CONTEXT_ICONS } from '../config/exposureIoIconConfig';
import { KnownLocationContext, LocationContext, LocationContextSource } from '../types/envi';

type Props = {
  visible: boolean;
  onClose: () => void;
  // What the advice uses now, and where that came from.
  context: LocationContext;
  source: LocationContextSource;
  // A one-tap correction, for this stay only.
  onPick: (context: KnownLocationContext) => void;
  // Drops the correction (shown only while there is one).
  onBackToAutomatic: () => void;
  // About you: who you are, in a line, and the way to change it.
  detailsSummary: string;
  onChangeDetails: () => void;
  // The Add place flow, starting on where the phone is now.
  onSavePlace: () => void;
};

const OPTIONS: readonly KnownLocationContext[] = ['indoors', 'outdoors', 'transit'];

// What the card's "For you" line opens — a quick fix, not a settings page:
// 1. "Change your details" → About you;
// 2. "Where are you now?" — one tap changes the advice at once, until the
//    phone leaves this spot or midnight; how the current answer was reached
//    is said underneath;
// 3. "Save this place as indoors" → the Add place flow at this spot, so
//    next time the app knows by itself (and Exposure gets it right too).
// A Modal with onRequestClose, so Android's back button closes it first.
const LocationContextSheet: React.FC<Props> = ({
  visible,
  onClose,
  context,
  source,
  onPick,
  onBackToAutomatic,
  detailsSummary,
  onChangeDetails,
  onSavePlace,
}) => {
  const insets = useSafeAreaInsets();
  const copy = LOCATION_CONTEXT_SHEET_COPY;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdropTapArea} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
          <View style={styles.grabber} />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={onChangeDetails}
            accessibilityRole="button"
          >
            <View style={styles.linkText}>
              <Text style={styles.linkTitle}>{copy.changeDetails}</Text>
              <Text style={styles.linkSubtitle} numberOfLines={2}>
                {detailsSummary}
              </Text>
            </View>
            <ChevronRight size={18} color={ALERT_UI.mutedTextColor} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.title}>{copy.title}</Text>
          <View style={styles.optionRow} accessibilityRole="radiogroup">
            {OPTIONS.map(option => {
              const selected = option === context;
              const Icon = LOCATION_CONTEXT_ICONS[option];
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => onPick(option)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Icon
                    size={22}
                    color={selected ? ALERT_UI.accentColor : ALERT_UI.mutedTextColor}
                  />
                  <Text
                    style={[styles.optionText, selected && styles.optionTextSelected]}
                    numberOfLines={1}
                  >
                    {copy.options[option]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.status}>{copy.status[source]}</Text>
          {source === 'override' && (
            <TouchableOpacity
              style={styles.textButton}
              onPress={onBackToAutomatic}
              accessibilityRole="button"
            >
              <Text style={styles.textButtonText}>{copy.backToAutomatic}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          <TouchableOpacity style={styles.saveRow} onPress={onSavePlace} accessibilityRole="button">
            <Plus size={18} color={ALERT_UI.accentColor} />
            <Text style={styles.saveText}>{copy.savePlace}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  backdropTapArea: { flex: 1 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    marginBottom: 6,
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 8 },
  linkText: { flex: 1, gap: 2 },
  linkTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  linkSubtitle: { fontSize: 13, color: ALERT_UI.mutedTextColor },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#DDD', marginVertical: 12 },
  title: { fontSize: 19, fontWeight: 'bold', color: '#222', marginBottom: 12 },
  optionRow: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 72,
    paddingHorizontal: 4,
    borderRadius: ALERT_UI.optionRadius,
    borderWidth: 1,
    borderColor: ALERT_UI.optionBorderColor,
  },
  optionSelected: { borderColor: ALERT_UI.accentColor, backgroundColor: ALERT_UI.selectedTint },
  optionText: { fontSize: 13, fontWeight: '600', color: '#555' },
  optionTextSelected: { color: ALERT_UI.accentColor },
  status: { fontSize: 13, lineHeight: 18, color: ALERT_UI.mutedTextColor, marginTop: 10 },
  textButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  textButtonText: { fontSize: 14, fontWeight: '700', color: ALERT_UI.accentColor },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  saveText: { fontSize: 15, fontWeight: '700', color: ALERT_UI.accentColor },
});

export default LocationContextSheet;
