import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';

type Props = {
  isSpatial: boolean;
  onToggle: (value: boolean) => void;
};

const MapModeToggle = ({ isSpatial, onToggle }: Props) => (
  <View style={styles.container}>
    <Text style={styles.label}>{isSpatial ? 'Spatial Map' : 'Normal Map'}</Text>
    <Switch
      value={isSpatial}
      onValueChange={onToggle}
      trackColor={{ false: '#ccc', true: '#4CD964' }}
      thumbColor="#fff"
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  label: {
    marginRight: 8,
    fontWeight: '600',
    color: '#333',
    fontSize: 13,
  },
});

export default MapModeToggle;
