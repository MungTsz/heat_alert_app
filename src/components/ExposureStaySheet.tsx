// src/components/ExposureStaySheet.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookmarkPlus } from 'lucide-react-native';
import { ExposureStayCluster } from '../types/exposure';
import { EXPOSURE_IO_CONFIG } from '../config/exposureIoConfig';
import { EXPOSURE_MAP_CONFIG } from '../config/exposureMapConfig';
import InfoNote from './addPlace/InfoNote';

type Props = {
  // null = closed. Kept as one prop (not visible + cluster) so the sheet can
  // never be open without a stay to describe.
  cluster: ExposureStayCluster | null;
  onClose: () => void;
  onBookmark: (cluster: ExposureStayCluster) => void;
};

const formatDuration = (ms: number): string => {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

const formatDateTime = (ms: number): string =>
  new Date(ms).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// Replaces the marker Callout: Android renders a Callout as a static bitmap,
// so a button inside one can't be tapped. A real sheet keeps the same stay
// details and adds a working "Bookmark this place" action.
const ExposureStaySheet: React.FC<Props> = ({ cluster, onClose, onBookmark }) => {
  const insets = useSafeAreaInsets();
  if (!cluster) return null;

  const ioColor = cluster.inHk
    ? EXPOSURE_IO_CONFIG[cluster.io].color
    : EXPOSURE_MAP_CONFIG.outsideHkTextColor;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdropTapArea} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
          <View style={[styles.ioChip, { backgroundColor: ioColor }]}>
            <Text style={styles.ioChipText}>{cluster.io}</Text>
          </View>
          <Text style={styles.time}>
            {formatDateTime(cluster.startTime)} – {formatDateTime(cluster.endTime)}
          </Text>
          <Text style={styles.meta}>
            {formatDuration(cluster.totalDurationMs)}
            {cluster.mergedSegmentCount > 1 ? ` · ${cluster.mergedSegmentCount} visits merged` : ''}
          </Text>
          <Text style={styles.meta}>
            {cluster.lat.toFixed(5)}, {cluster.lon.toFixed(5)}
          </Text>
          <Text style={styles.exposure}>
            {cluster.inHk
              ? `Total exposure: ${cluster.totalExposure.toFixed(3)} %AR·h`
              : 'Outside Hong Kong — exposure not calculated'}
          </Text>

          {/* Outside HK there's no heat/AQHI data for a Community card and the
              backend never scores stays there, so a place label would do
              nothing. */}
          {cluster.inHk && (
            <>
              {/* Labels are applied when an upload is processed, so the stay
                  the user is looking at keeps its type — say so before they
                  expect this dot to change color. */}
              <InfoNote>
                Save this spot as a place to improve future exposure readings. This stay keeps
                its current type.
              </InfoNote>
              <TouchableOpacity style={styles.bookmarkButton} onPress={() => onBookmark(cluster)}>
                <BookmarkPlus size={18} color="#fff" />
                <Text style={styles.bookmarkText}>Bookmark this place</Text>
              </TouchableOpacity>
            </>
          )}
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
    padding: 24,
  },
  ioChip: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  ioChipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  time: { fontSize: 17, fontWeight: '700', color: '#1C1C1E' },
  meta: { fontSize: 13, color: '#8E8E93', marginTop: 4 },
  exposure: { fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginTop: 10 },
  bookmarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#D9534F',
  },
  bookmarkText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default ExposureStaySheet;
