// src/components/ExposureTripSheet.tsx
import React from 'react';
import { Text } from 'react-native';
import { ExposureTripLeg } from '../types/exposure';
import { EXPOSURE_MAP_CONFIG } from '../config/exposureMapConfig';
import { formatDateTime, formatDuration, formatRoadList } from '../utils/exposureFormat';
import ExposureMapSheet, { mapSheetStyles } from './ExposureMapSheet';

type Props = {
  // null = closed, same single-prop convention as ExposureStaySheet.
  leg: ExposureTripLeg | null;
  onClose: () => void;
};

// A tapped route line / direction arrow: when, how long, which roads, and
// the exposure while travelling. No place action — a label only ever
// applies to stays, never to a route passing by.
const ExposureTripSheet: React.FC<Props> = ({ leg, onClose }) => {
  if (!leg) return null;
  const roads = formatRoadList(leg.roadNames, EXPOSURE_MAP_CONFIG.maxRoadNamesShown);

  return (
    <ExposureMapSheet io={leg.io} inHk={leg.inHk} reason={leg.reason} onClose={onClose}>
      <Text style={mapSheetStyles.time}>
        {formatDateTime(leg.startTime)} – {formatDateTime(leg.endTime)}
      </Text>
      <Text style={mapSheetStyles.meta}>{formatDuration(leg.totalDurationMs)}</Text>
      {roads && <Text style={mapSheetStyles.meta}>{roads}</Text>}
      <Text style={mapSheetStyles.exposure}>
        {leg.inHk
          ? `Exposure on the way: ${leg.totalExposure.toFixed(3)} %AR·h`
          : 'Outside Hong Kong — exposure not calculated'}
      </Text>
    </ExposureMapSheet>
  );
};

export default ExposureTripSheet;
