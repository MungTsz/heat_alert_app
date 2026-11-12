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
import { GoogleMapType, MapLayer } from '../types/mapSettings';
// The base map style is offered here too, not only in App settings: it is
// usually wanted while looking at the map.
import { MAP_TYPE_OPTIONS } from '../config/mapLayerConfig';

type Props = {
  layer: MapLayer;
  onChange: (layer: MapLayer) => void;
  mapType: GoogleMapType;
  onMapTypeChange: (mapType: GoogleMapType) => void;
  large?: boolean;
};

// Heat index first, as everywhere else the two hazards appear together.
const LAYER_OPTIONS: { key: MapLayer; label: string }[] = [
  { key: 'heat', label: 'Heat index' },
  { key: 'aqhi', label: 'AQHI' },
];


type OptionProps = {
  label: string;
  selected: boolean;
  large: boolean;
  onPress: () => void;
};

const Option = ({ label, selected, large, onPress }: OptionProps) => (
  <TouchableOpacity
    style={[styles.option, large && styles.optionLarge, selected && styles.optionSelected]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
  >
    {selected ? (
      <Check size={large ? 18 : 14} color="#D9534F" />
    ) : (
      <View style={styles.checkSpacer} />
    )}
    <Text style={[styles.optionText, large && styles.optionTextLarge]}>{label}</Text>
  </TouchableOpacity>
);

const MapLayerPicker: React.FC<Props> = ({
  layer,
  onChange,
  mapType,
  onMapTypeChange,
  large = false,
}) => {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<View>(null);
  const buttonSize = large ? 54 : 38;

  const openPicker = () => {
    // measureInWindow gives the button's real on-screen position, since the
    // dropdown Modal renders in a separate full-screen layer, not relative
    // to this button's own parent.
    buttonRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ top: y + h + 6, right: 16 });
      setOpen(true);
    });
  };

  const choose = (apply: () => void) => {
    apply();
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
            <Text style={[styles.groupTitle, large && styles.groupTitleLarge]}>Layer</Text>
            {LAYER_OPTIONS.map(option => (
              <Option
                key={option.key}
                label={option.label}
                selected={option.key === layer}
                large={large}
                onPress={() => choose(() => onChange(option.key))}
              />
            ))}
            <View style={styles.groupDivider} />
            <Text style={[styles.groupTitle, large && styles.groupTitleLarge]}>Map style</Text>
            {MAP_TYPE_OPTIONS.map(option => (
              <Option
                key={option.key}
                label={option.label}
                selected={option.key === mapType}
                large={large}
                onPress={() => choose(() => onMapTypeChange(option.key))}
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
    width: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#E2E2E2',
    overflow: 'hidden',
    paddingVertical: 4,
  },
  dropdownLarge: {
    width: 190,
    borderRadius: 14,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    paddingHorizontal: 12,
    paddingTop: 6,
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
  optionSelected: {
    backgroundColor: '#F5F5F5',
  },
  checkSpacer: {
    width: 14,
  },
  optionText: {
    fontSize: 13,
    color: '#222',
  },
  optionTextLarge: {
    fontSize: 16,
  },
});

export default MapLayerPicker;
