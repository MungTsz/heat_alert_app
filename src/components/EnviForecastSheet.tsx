// src/components/EnviForecastSheet.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import ForecastSheet from './ForecastSheet';
import SegmentedControl from './SegmentedControl';
import HeatHourlyForecastChart from './HeatHourlyForecastChart';
import AqhiHourlyForecastChart from './AqhiHourlyForecastChart';
import { ENVI_COPY, HOME_INFO_BAR_COPY } from '../config/alertCopy';
import { DayForecast } from '../data/forecast/types';
import { AqhiDayForecast } from '../data/aqhiForecast/types';
import { HazardKind } from '../types/alerts';

type Props = {
  visible: boolean;
  onClose: () => void;
  // The tab it opens on: the hazard that sets the level, or the season's
  // on a tie — Home passes the map's starting layer, so the two agree.
  defaultHazard: HazardKind;
  heatForecast: { days: DayForecast[]; loading: boolean };
  aqhiForecast: { days: AqhiDayForecast[]; loading: boolean };
};

const TABS: readonly { value: HazardKind; label: string }[] = [
  { value: 'heat', label: HOME_INFO_BAR_COPY.heat },
  { value: 'aqhi', label: HOME_INFO_BAR_COPY.aqhi },
];

// What tapping the Environmental Index opens: the forecast behind it. There
// is no forecast of the index itself, so it is the two hazards' existing
// charts as peers, one tab each, opening on the one that matters now.
const EnviForecastSheet: React.FC<Props> = ({
  visible,
  onClose,
  defaultHazard,
  heatForecast,
  aqhiForecast,
}) => {
  const [hazard, setHazard] = useState<HazardKind>(defaultHazard);
  // Each opening starts from the hazard that matters now, not the tab the
  // user left last time.
  useEffect(() => {
    if (visible) setHazard(defaultHazard);
  }, [visible, defaultHazard]);

  return (
    <ForecastSheet visible={visible} title={ENVI_COPY.forecastTitle} onClose={onClose}>
      <View style={styles.tabs}>
        <SegmentedControl options={TABS} value={hazard} onChange={setHazard} />
      </View>
      {hazard === 'heat' ? (
        <HeatHourlyForecastChart days={heatForecast.days} loading={heatForecast.loading} />
      ) : (
        <AqhiHourlyForecastChart days={aqhiForecast.days} loading={aqhiForecast.loading} />
      )}
    </ForecastSheet>
  );
};

const styles = StyleSheet.create({
  tabs: { marginBottom: 12 },
});

export default EnviForecastSheet;
