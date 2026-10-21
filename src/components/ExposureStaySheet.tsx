// src/components/ExposureStaySheet.tsx
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BookmarkPlus } from 'lucide-react-native';
import { ExposureStayCluster } from '../types/exposure';
import { formatDateTime, formatDuration } from '../utils/exposureFormat';
import InfoNote from './addPlace/InfoNote';
import ExposureMapSheet, { mapSheetStyles } from './ExposureMapSheet';

type Props = {
  // null = closed. Kept as one prop (not visible + cluster) so the sheet can
  // never be open without a stay to describe.
  cluster: ExposureStayCluster | null;
  onClose: () => void;
  onBookmark: (cluster: ExposureStayCluster) => void;
};

// A tapped stay dot's details plus a working "Bookmark this place" action.
const ExposureStaySheet: React.FC<Props> = ({ cluster, onClose, onBookmark }) => {
  if (!cluster) return null;

  return (
    <ExposureMapSheet
      io={cluster.io}
      inHk={cluster.inHk}
      reason={cluster.reason}
      onClose={onClose}
    >
      <Text style={mapSheetStyles.time}>
        {formatDateTime(cluster.startTime)} – {formatDateTime(cluster.endTime)}
      </Text>
      <Text style={mapSheetStyles.meta}>
        {formatDuration(cluster.totalDurationMs)}
        {cluster.mergedSegmentCount > 1 ? ` · ${cluster.mergedSegmentCount} visits merged` : ''}
      </Text>
      <Text style={mapSheetStyles.meta}>
        {cluster.lat.toFixed(5)}, {cluster.lon.toFixed(5)}
      </Text>
      <Text style={mapSheetStyles.exposure}>
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
    </ExposureMapSheet>
  );
};

const styles = StyleSheet.create({
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
