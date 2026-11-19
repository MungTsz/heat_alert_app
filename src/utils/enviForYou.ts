// src/utils/enviForYou.ts
import { ENVI_FOR_YOU_COPY, IDENTITY_COPY, PERSON_SUMMARY_COPY } from '../config/alertCopy';
import { PLACE_IDENTITY_GROUPS } from '../config/alertConfig';
import { ENVI_PERSON_TIPS } from '../config/enviKeywords';
import { IdentityGroup } from '../types/alerts';
import { LocationContext, LocationContextSource } from '../types/envi';
import { EnviAdviceFor } from './enviKeywords';

// What the personal advice is based on, in words: the card's "For you" line
// and the recommendations sheet's "Based on" — always the phone's owner:
// who they are and where they are now. Never how the index itself is
// worked out.

// Identities in the order the person tips rank them, then any others,
// General adult last — so the line names the identity whose tip leads the
// card.
const IDENTITY_PRIORITY: readonly IdentityGroup[] = [
  ...ENVI_PERSON_TIPS.map(tip => tip.audience).filter(
    (audience): audience is Exclude<IdentityGroup, 'child'> => audience !== 'medicine',
  ),
  ...PLACE_IDENTITY_GROUPS.filter(identity => identity !== 'general'),
  'general' as const,
].filter((identity, i, all) => all.indexOf(identity) === i);

const byPriority = (identities: readonly IdentityGroup[]): IdentityGroup[] =>
  [...identities].sort((a, b) => IDENTITY_PRIORITY.indexOf(a) - IDENTITY_PRIORITY.indexOf(b));

const shortLabel = (identity: IdentityGroup): string =>
  IDENTITY_COPY[identity].short ?? IDENTITY_COPY[identity].label;

// "Outdoors now", or "Often outdoors" when it is only the daily answer (no
// tracking); nothing when the app can't tell.
const whereLabel = (context: LocationContext, source: LocationContextSource): string | null => {
  if (context === 'unknown') return null;
  if (source === 'dailyActivity') return ENVI_FOR_YOU_COPY.usuallyOutdoors;
  return ENVI_FOR_YOU_COPY.where[context];
};

// "For you: Pregnant +1 · Outdoors now" — the owner's most important
// identity, how many more, and where they are (left out when unknown).
export const forYouLineFor = (advice: EnviAdviceFor): string => {
  const [lead, ...others] = byPriority(advice.person.identities);
  const who =
    others.length > 0
      ? `${shortLabel(lead)} ${ENVI_FOR_YOU_COPY.moreIdentities(others.length)}`
      : shortLabel(lead);
  return ENVI_FOR_YOU_COPY.line(who, whereLabel(advice.context, advice.source));
};

// "Based on: Asthma, Older adult · Regular medicine · Outdoors now" — every
// answer that shaped the sheet's advice.
export const basedOnFor = (advice: EnviAdviceFor): string => {
  const parts = [
    byPriority(advice.person.identities).map(shortLabel).join(PERSON_SUMMARY_COPY.identitySeparator),
  ];
  if (advice.person.takesRegularMedicine) parts.push(ENVI_FOR_YOU_COPY.basedOnMedicine);
  const where = whereLabel(advice.context, advice.source);
  if (where) parts.push(where);
  return ENVI_FOR_YOU_COPY.basedOn(parts);
};
