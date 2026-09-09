// src/components/ExposureDaySwitcher.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { View } from 'react-native';
import { ExposureReport } from '../types/exposure';
import { splitExposureReportByDay } from '../utils/splitReportByDay';
import ExposureReportView from './ExposureReportView';
import DayTabRow, { ALL_DAYS_KEY } from './DayTabRow';

type Props = {
  report: ExposureReport;
  title: string;
};

// A report (an import, or a saved history entry) isn't guaranteed to be a
// single day — this shows a day-tab-row (with a leading "All") only when it
// actually spans more than one, and always renders the same
// ExposureReportView underneath, just fed whichever slice is selected.
const ExposureDaySwitcher: React.FC<Props> = ({ report, title }) => {
  const [selectedKey, setSelectedKey] = useState<string>(ALL_DAYS_KEY);

  const daySlices = useMemo(() => splitExposureReportByDay(report), [report]);

  useEffect(() => {
    setSelectedKey(ALL_DAYS_KEY);
  }, [report]);

  const displayedReport =
    selectedKey === ALL_DAYS_KEY
      ? report
      : daySlices.find(d => d.date === selectedKey)?.report ?? report;

  return (
    <View>
      {daySlices.length > 1 && (
        <DayTabRow
          days={daySlices.map(d => ({
            key: d.date,
            weekdayShort: new Date(d.report.timeRangeStart).toLocaleDateString([], {
              weekday: 'short',
            }),
            dayOfMonth: new Date(d.report.timeRangeStart).getDate(),
          }))}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          leadingLabel="All"
        />
      )}
      <ExposureReportView report={displayedReport} title={title} />
    </View>
  );
};

export default ExposureDaySwitcher;
