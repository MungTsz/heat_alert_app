// src/components/HomeInfoBlock.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { glassCardStyle, glassLabelText } from '../styles/glassCard';
import { HOME_INFO_BAR_COPY } from '../config/alertCopy';
import { HOME_INFO_BAR_CONFIG } from '../config/homeLayoutConfig';

export type HomeInfoBlockData = {
  key: string;
  Icon: LucideIcon;
  label: string;
  // Already formatted ("34°", "7", "82%"); null = unavailable → "--".
  value: string | null;
  // The hazard's own level colour (NWS / EPD); neutral for context values.
  stripeColor: string;
  // Opens that hazard's forecast. Left out for Temp and Humidity: they are
  // context for the heat index, not something with a forecast of its own
  // here, so they are plain read-only blocks.
  onPress?: () => void;
};

// Shown on unavailable values and on Temp / Humidity, which have no levels.
export const NEUTRAL_STRIPE_COLOR = 'rgba(255,255,255,0.35)';

const C = HOME_INFO_BAR_CONFIG;

// One mini block of the side bar: icon + label, the value large, and a thin
// level-coloured stripe on the left. A stripe rather than a filled block,
// so the Environmental Index square stays the strongest colour on screen.
const HomeInfoBlock: React.FC<{ block: HomeInfoBlockData }> = ({ block }) => {
  const { Icon, label, value, stripeColor, onPress } = block;
  const shown = value ?? HOME_INFO_BAR_COPY.unavailable;
  const content = (
    <>
      <View
        style={[
          styles.stripe,
          { backgroundColor: value === null ? NEUTRAL_STRIPE_COLOR : stripeColor },
        ]}
      />
      <View style={styles.body}>
        <View style={styles.labelRow}>
          <Icon size={C.blockIconSize} color="#FFFFFF" />
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text style={styles.value} numberOfLines={1}>
          {shown}
        </Text>
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.block} accessible accessibilityLabel={`${label} ${shown}`}>
        {content}
      </View>
    );
  }
  return (
    <TouchableOpacity
      style={styles.block}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${shown}`}
      accessibilityHint={HOME_INFO_BAR_COPY.blockHint}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  block: {
    ...glassCardStyle,
    borderRadius: 10,
    width: C.blockWidth,
    height: C.blockHeight,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  stripe: { width: C.stripeWidth },
  body: { flex: 1, paddingHorizontal: 6, justifyContent: 'center', gap: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { flexShrink: 1, fontSize: C.blockLabelFontSize, fontWeight: '600', ...glassLabelText },
  value: { fontSize: C.blockValueFontSize, fontWeight: '800', ...glassLabelText },
});

export default HomeInfoBlock;
