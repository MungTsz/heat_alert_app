// src/components/DualStatPin.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';
import { getAqhiInfo } from '../utils/aqhiUtils';
import { MapLayer } from '../types/mapSettings';
import { PlaceCategory } from '../types/bookmark';
import {
  MAP_PIN_ENVI_SQUARE_CONFIG,
  MAP_PLACE_PIN_CONFIG,
  MAP_POINT_PIN_CONFIG,
} from '../config/mapLayerConfig';
import { PLACE_CATEGORY_CONFIG } from '../config/placeCategoryConfig';
import { EXPOSURE_IO_CONFIG } from '../config/exposureIoConfig';
import { ENVI_COPY } from '../config/alertCopy';
import { getEnviLevelInfo } from '../utils/enviUtils';
import { pinEnviLevel } from '../utils/enviMapLayer';
import EnviLevelSquare from './EnviLevelSquare';

// null = loading / unavailable
type Props = {
  temperature: number | null; // heat index
  aqhi: number | null;
  // Temp · Humidity context — the tapped point only. Saved places leave
  // both out: that line would cost two more lookups per place.
  airTemperature?: number | null;
  humidity?: number | null;
  // A saved place: its name heads the pill.
  title?: string;
  // A saved place's category: the pin becomes that category's icon in its
  // own colour (the same pair as its card in Places and its stays on the
  // Exposure map), with a small copy in front of the name. Without it the
  // pin is the tapped point's blue one.
  category?: PlaceCategory;
  // The map layer on screen. 'envi': a small Environmental Index square
  // (from both values, as on Home's card) instead of numbers. 'heat' /
  // 'aqhi': only that hazard's value. Both values when omitted.
  layer?: MapLayer;
  // On the index layer, the level's name beside the square — the tapped
  // point; saved places keep to the square, as they already carry a name.
  showLevelName?: boolean;
};

// Neutral grey, so a missing value never reads as a heat level color.
const UNAVAILABLE_DOT_COLOR = '#BBBBBB';

const DualStatPin: React.FC<Props> = ({
  temperature,
  airTemperature,
  humidity,
  aqhi,
  title,
  category,
  layer,
  showLevelName = false,
}) => {
  // Same classification colors as the heat card, chart and legend.
  const heatColor =
    temperature === null
      ? UNAVAILABLE_DOT_COLOR
      : getHeatIndexInfo(temperature).color;
  const aqhiColor =
    aqhi === null ? UNAVAILABLE_DOT_COLOR : getAqhiInfo(aqhi).color;
  const showEnvi = layer === 'envi';
  const showHeat = layer === undefined || layer === 'heat';
  const showAqhi = layer === undefined || layer === 'aqhi';
  const enviLevel = showEnvi ? pinEnviLevel({ heatIndex: temperature, aqhi }) : null;
  const CategoryIcon = category ? PLACE_CATEGORY_CONFIG[category].Icon : null;
  const categoryColor = category ? EXPOSURE_IO_CONFIG[category].color : null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.pill}>
        {title !== undefined && (
          <View style={styles.titleRow}>
            {CategoryIcon && categoryColor && (
              <CategoryIcon size={MAP_PLACE_PIN_CONFIG.titleIconSize} color={categoryColor} />
            )}
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
        )}
        <View style={styles.row}>
          {showEnvi && (
            <>
              <EnviLevelSquare
                level={enviLevel}
                tone="sheet"
                dimensions={MAP_PIN_ENVI_SQUARE_CONFIG}
              />
              {showLevelName && (
                <Text style={styles.text}>
                  {enviLevel === null ? ENVI_COPY.unavailable : getEnviLevelInfo(enviLevel).name}
                </Text>
              )}
            </>
          )}
          {showHeat && (
            <>
              <View style={[styles.dot, { backgroundColor: heatColor }]} />
              <Text style={styles.text}>Feels Like {temperature ?? '--'}°</Text>
            </>
          )}
          {showHeat && showAqhi && <View style={styles.divider} />}
          {showAqhi && (
            <>
              <View style={[styles.dot, { backgroundColor: aqhiColor }]} />
              <Text style={styles.text}>AQHI {aqhi ?? '--'}</Text>
            </>
          )}
        </View>
        {/* Secondary context only: lets the user compare "feels like" with
            the thermometer at the exact spot they tapped, without a separate
            temperature map layer competing with the heat index one. Always
            rendered for the tapped point ("--" while loading) so the pin's
            height never changes after the marker is drawn — see MapScreen's
            marker key. */}
        {airTemperature !== undefined && (
          <Text style={styles.subText}>
            Temp {airTemperature ?? '--'}° · Humidity {humidity ?? '--'}%
          </Text>
        )}
      </View>

      {CategoryIcon && categoryColor ? (
        <View style={[styles.categoryBadge, { borderColor: categoryColor }]}>
          <CategoryIcon size={MAP_PLACE_PIN_CONFIG.iconSize} color={categoryColor} />
        </View>
      ) : (
        <MapPin
          size={MAP_POINT_PIN_CONFIG.iconSize}
          color={MAP_POINT_PIN_CONFIG.color}
          fill={MAP_POINT_PIN_CONFIG.color}
          strokeWidth={1.5}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  pill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 0.5,
    borderColor: '#E2E2E2',
    gap: 2,
    marginBottom: 2,
    maxWidth: 220,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  title: { fontSize: 11, fontWeight: '700', color: '#555', flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  divider: {
    width: 0.5,
    height: 14,
    backgroundColor: '#DDD',
    marginHorizontal: 2,
  },
  text: { fontSize: 12, fontWeight: '700', color: '#222' },
  subText: { fontSize: 11, fontWeight: '500', color: '#666' },
  // White so the category colour reads on any map style; the coloured ring
  // keeps the badge visible on a pale map.
  categoryBadge: {
    width: MAP_PLACE_PIN_CONFIG.badgeSize,
    height: MAP_PLACE_PIN_CONFIG.badgeSize,
    borderRadius: MAP_PLACE_PIN_CONFIG.badgeSize / 2,
    borderWidth: MAP_PLACE_PIN_CONFIG.borderWidth,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DualStatPin;
