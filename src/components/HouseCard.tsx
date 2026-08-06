import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import HouseHeatIcon from './HouseHeatIcon';
import { valueToPinColor } from '../utils/idw';

type Props = {
  label: string;
  temperature: number;
  distance: number;
  onPress: () => void;
  onRemove: () => void;
};

const HouseCard = ({
  label,
  temperature,
  distance,
  onPress,
  onRemove,
}: Props) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <HouseHeatIcon
        temperature={temperature}
        color={valueToPinColor(temperature)}
      />
      <View style={styles.info}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.distance}>{distance.toFixed(1)} miles away</Text>
      </View>
      <TouchableOpacity
        onPress={onRemove}
        style={styles.removeButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Trash2 size={18} color="#999" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  distance: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  removeButton: {
    padding: 6,
  },
});

export default HouseCard;
