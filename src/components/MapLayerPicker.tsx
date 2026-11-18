// src/components/MapLayerPicker.tsx
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Layers, Check } from 'lucide-react-native';
import { MapLayer } from '../types/mapSettings';
import { MAP_LAYER_ORDER, MAP_LAYER_PICKER_CONFIG } from '../config/mapLayerConfig';
import { MAP_LAYER_COPY } from '../config/alertCopy';
import { isPraiseConfigured } from '../config/praiseConfig';

type Props = {
  layer: MapLayer;
  onChange: (layer: MapLayer) => void;
  large?: boolean;
};

// Only the data layer is chosen here. The base map style (Default /
// Satellite) lives in App settings alone, so this list stays about the one
// question the map answers.

type OptionProps = {
  layer: MapLayer;
  selected: boolean;
  large: boolean;
  // A layer with no data source right now (AQHI without PRAISE): still
  // selectable — it shows "--", as before — but says so up front.
  noData?: boolean;
  indented?: boolean;
  onPress: () => void;
};

const Option = ({ layer, selected, large, noData, indented, onPress }: OptionProps) => {
  const label = MAP_LAYER_COPY.layerNames[layer];
  return (
    <TouchableOpacity
      style={[
        styles.option,
        large && styles.optionLarge,
        indented && styles.optionIndented,
        selected && styles.optionSelected,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={MAP_LAYER_COPY.layerOptionLabel(label)}
      accessibilityHint={noData ? MAP_LAYER_COPY.noData : undefined}
    >
      {selected ? (
        <Check size={large ? 18 : 14} color="#D9534F" />
      ) : (
        <View style={styles.checkSpacer} />
      )}
      <View style={styles.optionTexts}>
        <Text style={[styles.optionText, large && styles.optionTextLarge, noData && styles.noDataText]}>
          {label}
        </Text>
        {noData && (
          <Text style={[styles.noDataNote, large && styles.noDataNoteLarge]}>
            {MAP_LAYER_COPY.noData}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// The index first; heat index and AQHI under "View details" — the index is
// what every map opens on, the hazards are there when the user wants them.
const MapLayerPicker: React.FC<Props> = ({ layer, onChange, large = false }) => {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<View>(null);
  const buttonSize = large
    ? MAP_LAYER_PICKER_CONFIG.buttonSizeLarge
    : MAP_LAYER_PICKER_CONFIG.buttonSize;

  const openPicker = () => {
    // measureInWindow gives the button's real on-screen position, since the
    // dropdown Modal renders in a separate full-screen layer, not relative
    // to this button's own parent.
    buttonRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ top: y + h + 6, right: 16 });
      setOpen(true);
    });
  };

  const choose = (next: MapLayer) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <>
      <View ref={buttonRef} collapsable={false}>
        <TouchableOpacity
          style={[
            styles.iconButton,
            {
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
            },
          ]}
          onPress={openPicker}
          accessibilityRole="button"
          accessibilityLabel={MAP_LAYER_COPY.pickerButtonLabel}
        >
          <Layers size={large ? 26 : 18} color="#333" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.dropdown,
              large && styles.dropdownLarge,
              { top: anchor.top, right: anchor.right },
            ]}
          >
            <Option
              layer={MAP_LAYER_ORDER.primary}
              selected={MAP_LAYER_ORDER.primary === layer}
              large={large}
              onPress={() => choose(MAP_LAYER_ORDER.primary)}
            />
            <View style={styles.groupDivider} />
            <Text style={[styles.groupTitle, large && styles.groupTitleLarge]}>
              {MAP_LAYER_COPY.detailsGroup}
            </Text>
            {MAP_LAYER_ORDER.details.map(option => (
              <Option
                key={option}
                layer={option}
                selected={option === layer}
                large={large}
                indented
                noData={option === 'aqhi' && !isPraiseConfigured()}
                onPress={() => choose(option)}
              />
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  backdrop: {
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    width: 190,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#E2E2E2',
    overflow: 'hidden',
    paddingVertical: 4,
  },
  dropdownLarge: {
    width: 230,
    borderRadius: 14,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 2,
  },
  groupTitleLarge: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  groupDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E2E2',
    marginTop: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  optionLarge: {
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  optionIndented: {
    paddingLeft: 20,
  },
  optionSelected: {
    backgroundColor: '#F5F5F5',
  },
  checkSpacer: {
    width: 14,
  },
  optionTexts: { flexShrink: 1 },
  optionText: {
    fontSize: 13,
    color: '#222',
  },
  optionTextLarge: {
    fontSize: 16,
  },
  noDataText: { color: '#8E8E93' },
  noDataNote: { fontSize: 11, color: '#8E8E93' },
  noDataNoteLarge: { fontSize: 13 },
});

export default MapLayerPicker;
