// src/components/HomeInfoBlock.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { glassCardStyle } from '../styles/glassCard';
import { HOME_INFO_BAR_COPY } from '../config/alertCopy';
import { HOME_INFO_BAR_CONFIG, HOME_INFO_BLOCK_TONES } from '../config/homeLayoutConfig';
import { EnviTone } from '../config/enviConfig';

export type HomeInfoBlockData = {
  key: string;
  Icon: LucideIcon;
  label: string;
  // Already formatted ("34°", "7", "82%"); null = unavailable → "--".
  value: string | null;
  // The hazard's own level colour (NWS / EPD); null for context values
  // with no levels (Temp, Humidity), which get the tone's neutral stripe.
  stripeColor: string | null;
  // Opens that hazard's forecast. Left out for Temp and Humidity: they are
  // context for the heat index, not something with a forecast of its own
  // here, so they are plain read-only blocks.
  onPress?: () => void;
};

type Props = {
  block: HomeInfoBlockData;
  // What the block sits on: Home's dark scene (default) or a white card
  // (the map's tapped-point card). Same keys as ENVI_TONES.
  tone?: EnviTone;
};

const C = HOME_INFO_BAR_CONFIG;

// One mini block of readings: icon + label, the value large, and a thin
// level-coloured stripe on the left. A stripe rather than a filled block,
// so the Environmental Index square stays the strongest colour on screen.
const HomeInfoBlock: React.FC<Props> = ({ block, tone = 'glass' }) => {
  const { Icon, label, value, stripeColor, onPress } = block;
  const colors = HOME_INFO_BLOCK_TONES[tone];
  const shown = value ?? HOME_INFO_BAR_COPY.unavailable;
  const surface =
    tone === 'glass'
      ? glassCardStyle
      : {
          backgroundColor: HOME_INFO_BLOCK_TONES.sheet.background,
          borderColor: HOME_INFO_BLOCK_TONES.sheet.border,
          borderWidth: StyleSheet.hairlineWidth,
        };
  // Surface first, so the block's own radius wins over the glass card's.
  const blockStyle = [surface, styles.block];
  const content = (
    <>
      <View
        style={[
          styles.stripe,
          {
            backgroundColor:
              value === null || stripeColor === null ? colors.neutralStripe : stripeColor,
          },
        ]}
      />
      <View style={styles.body}>
        <View style={styles.labelRow}>
          <Icon size={C.blockIconSize} color={colors.text} />
          <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
          {shown}
        </Text>
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View style={blockStyle} accessible accessibilityLabel={`${label} ${shown}`}>
        {content}
      </View>
    );
  }
  return (
    <TouchableOpacity
      style={blockStyle}
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
    borderRadius: 10,
    width: C.blockWidth,
    height: C.blockHeight,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  stripe: { width: C.stripeWidth },
  body: { flex: 1, paddingHorizontal: 6, justifyContent: 'center', gap: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { flexShrink: 1, fontSize: C.blockLabelFontSize, fontWeight: '600' },
  value: { fontSize: C.blockValueFontSize, fontWeight: '800' },
});

export default HomeInfoBlock;
