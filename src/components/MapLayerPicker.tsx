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

export type MapLayer = 'default' | 'heat' | 'aqhi';

type Props = {
  layer: MapLayer;
  onChange: (layer: MapLayer) => void;
  large?: boolean;
};

const OPTIONS: { key: MapLayer; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'heat', label: 'Heat layer' },
  { key: 'aqhi', label: 'AQHI layer' },
];

const MapLayerPicker: React.FC<Props> = ({ layer, onChange, large = false }) => {
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
            {OPTIONS.map(option => {
              const isSelected = option.key === layer;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.option,
                    large && styles.optionLarge,
                    isSelected && styles.optionSelected,
                  ]}
                  onPress={() => {
                    onChange(option.key);
                    setOpen(false);
                  }}
                >
                  {isSelected ? (
                    <Check size={large ? 18 : 14} color="#D9534F" />
                  ) : (
                    <View style={styles.checkSpacer} />
                  )}
                  <Text style={[styles.optionText, large && styles.optionTextLarge]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
  },
  dropdownLarge: {
    width: 190,
    borderRadius: 14,
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
