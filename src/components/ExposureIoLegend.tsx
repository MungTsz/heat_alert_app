// src/components/ExposureIoLegend.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ExposureIo } from '../types/exposure';
import { EXPOSURE_IO_CONFIG, EXPOSURE_IO_GROUPS } from '../config/exposureIoConfig';
import { EXPOSURE_IO_ICONS } from '../config/exposureIoIconConfig';

// Large enough for the glyph to read (a house vs a briefcase) at legend
// text size, small enough that seven items still fit on two rows.
const LEGEND_ICON_SIZE = 13;

type Props = {
  // Only these io types are listed (all when omitted) — callers pass the
  // types that actually have a bar, so a user who never saved a School
  // doesn't scan past it. Colors never move: they're keyed by io, not by
  // legend position.
  present?: ReadonlySet<ExposureIo>;
};

// The io color key shared by every exposure stacked-bar chart. Pagers render
// it once above the swipeable area so it stays put while pages move. Items
// are chunked into outdoor / transit / indoor groups (wider gap between
// groups than within) — seven loose swatches are slow to scan. Each item
// shows its io icon in the io color, the same pairing as the map stay dots
// and sheet chips, so the legend also teaches the map's icons.
const ExposureIoLegend: React.FC<Props> = ({ present }) => (
  <View style={styles.row}>
    {EXPOSURE_IO_GROUPS.map(group => {
      const shown = present ? group.filter(io => present.has(io)) : group;
      if (shown.length === 0) return null;
      return (
        <View key={group.join('|')} style={styles.group}>
          {shown.map(io => {
            const Icon = EXPOSURE_IO_ICONS[io];
            const { color, label } = EXPOSURE_IO_CONFIG[io];
            return (
              <View key={io} style={styles.item}>
                <Icon size={LEGEND_ICON_SIZE} color={color} strokeWidth={2.5} />
                <Text style={styles.text}>{label}</Text>
              </View>
            );
          })}
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  // Wraps between groups first; a group itself wraps only on very narrow
  // phones.
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 4, marginBottom: 6 },
  group: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: { fontSize: 11, color: '#8E8E93' },
});

export default ExposureIoLegend;
