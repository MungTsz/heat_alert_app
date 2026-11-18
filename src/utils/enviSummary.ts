// src/utils/enviSummary.ts
import { HazardKind } from '../types/alerts';
import { ENVI_SUMMARY_COPY } from '../config/alertCopy';
import { levelOf } from './hazardLevels';
import { HazardReadings, hazardLevelOf, leadHazard } from './enviUtils';

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const phraseFor = (hazard: HazardKind, value: number): string =>
  ENVI_SUMMARY_COPY[hazard][levelOf(hazard, value)] ?? '';

// The card's plain-language line: how heat and air are right now, in a few
// everyday words. null without readings.
// - One reading: just that one ("It's hot.").
// - One hazard at level 1, the other above: the fine one, "but" the concern
//   ("Air quality is good, but it's very hot.").
// - Both above level 1: the higher first ("It's very hot and air quality is
//   poor."); on a tie the season's hazard first.
// - Both at level 1: air first ("Air quality is good and it's not too hot.").
export const enviSummaryFor = (
  current: HazardReadings,
  nowMs: number = Date.now(),
): string | null => {
  const { heat, aqhi } = current;
  if (heat === null && aqhi === null) return null;
  if (heat === null || aqhi === null) {
    const [hazard, value] = heat === null ? (['aqhi', aqhi] as const) : (['heat', heat] as const);
    return capitalise(ENVI_SUMMARY_COPY.single(phraseFor(hazard, value as number)));
  }

  const lead = leadHazard(current, nowMs);
  const other: HazardKind = lead === 'heat' ? 'aqhi' : 'heat';
  const leadLevel = hazardLevelOf(lead, current[lead]) ?? 1;
  const otherLevel = hazardLevelOf(other, current[other]) ?? 1;
  const leadPhrase = phraseFor(lead, current[lead] as number);
  const otherPhrase = phraseFor(other, current[other] as number);

  if (leadLevel > 1 && otherLevel === 1) {
    return capitalise(ENVI_SUMMARY_COPY.contrast(otherPhrase, leadPhrase));
  }
  if (leadLevel > 1) return capitalise(ENVI_SUMMARY_COPY.both(leadPhrase, otherPhrase));
  return capitalise(ENVI_SUMMARY_COPY.both(phraseFor('aqhi', aqhi), phraseFor('heat', heat)));
};
