import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { SharedValue } from 'react-native-reanimated';
import HeatScene from './scene/HeatScene';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';

interface Props {
  temperatureCelsius: number;
  scrollY: SharedValue<number>;
}

const SCENE_HEIGHT = 200;

const AnimatedHeatIndexCard: React.FC<Props> = ({
  temperatureCelsius,
  scrollY,
}) => {
  const [width, setWidth] = useState(0);
  const { classification } = getHeatIndexInfo(temperatureCelsius);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {width > 0 && (
        <HeatScene
          width={width}
          height={SCENE_HEIGHT}
          temperatureCelsius={temperatureCelsius}
          scrollY={scrollY}
        />
      )}

      <View style={styles.textOverlay} pointerEvents="none">
        <Text style={styles.titleText}>Feels Like...</Text>
        <Text style={styles.temperatureText}>{temperatureCelsius}°C</Text>
        <Text style={styles.classificationText}>{classification}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: SCENE_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 16,
  },
  textOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingLeft: 20,
    width: '38%',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(60,40,20,0.75)',
  },
  temperatureText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3A2A15',
  },
  classificationText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A2A15',
    marginTop: 2,
  },
});

export default AnimatedHeatIndexCard;
