// src/components/ExposureMapSheet.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExposureIo } from '../types/exposure';
import { EXPOSURE_IO_CONFIG, EXPOSURE_IO_REASON_TEXT } from '../config/exposureIoConfig';
import { EXPOSURE_IO_ICONS } from '../config/exposureIoIconConfig';
import { EXPOSURE_MAP_CONFIG } from '../config/exposureMapConfig';

type Props = {
  io: ExposureIo;
  inHk: boolean;
  reason?: string;
  onClose: () => void;
  children: React.ReactNode;
};

// The bottom-sheet chrome shared by the stay and trip sheets: a real Modal
// instead of a marker Callout (Android renders a Callout as a static bitmap,
// so nothing inside it can be tapped), headed by the same io chip — icon +
// color + name — the map marker uses, then a one-line "why this type".
const ExposureMapSheet: React.FC<Props> = ({ io, inHk, reason, onClose, children }) => {
  const insets = useSafeAreaInsets();
  const { color, label } = EXPOSURE_IO_CONFIG[io];
  const Icon = EXPOSURE_IO_ICONS[io];
  const chipColor = inHk ? color : EXPOSURE_MAP_CONFIG.outsideHkTextColor;
  const reasonText = reason ? EXPOSURE_IO_REASON_TEXT[reason] : undefined;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdropTapArea} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
          <View style={[styles.ioChip, { backgroundColor: chipColor }]}>
            <Icon size={13} color="#fff" />
            <Text style={styles.ioChipText}>{label}</Text>
          </View>
          {reasonText && <Text style={styles.reason}>{reasonText}</Text>}
          {children}
        </View>
      </View>
    </Modal>
  );
};

// Shared text styles for the sheets' bodies, so stay and trip details line up.
export const mapSheetStyles = StyleSheet.create({
  time: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginTop: 10 },
  meta: { fontSize: 13, color: '#8E8E93', marginTop: 4 },
  exposure: { fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginTop: 10 },
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  backdropTapArea: { flex: 1 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  ioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  ioChipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  reason: { fontSize: 13, color: '#636366', marginTop: 8 },
});

export default ExposureMapSheet;
