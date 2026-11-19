import { basedOnFor, forYouLineFor } from '../enviForYou';
import { EnviAdviceFor } from '../enviKeywords';
import { DEFAULT_ALERT_PERSON } from '../../config/alertConfig';
import { AlertPerson } from '../../types/alerts';
import { LocationContext, LocationContextSource } from '../../types/envi';

const advice = (
  person: Partial<AlertPerson>,
  context: LocationContext,
  source: LocationContextSource = context === 'unknown' ? 'none' : 'tracking',
): EnviAdviceFor => ({ person: { ...DEFAULT_ALERT_PERSON, ...person }, context, source });

describe('forYouLineFor', () => {
  it('names who and where', () => {
    expect(forYouLineFor(advice({ identities: ['pregnant'] }, 'outdoors'))).toBe(
      'For you: Pregnant · Outdoors now',
    );
    expect(forYouLineFor(advice({}, 'transit'))).toBe('For you: General adult · On the move');
  });

  it('names only who when the app can’t tell where', () => {
    expect(forYouLineFor(advice({ identities: ['pregnant'] }, 'unknown'))).toBe('For you: Pregnant');
  });

  it('names the identity whose tip leads, and how many more', () => {
    expect(forYouLineFor(advice({ identities: ['older', 'asthma'] }, 'indoors'))).toBe(
      'For you: Asthma +1 · Indoors now',
    );
  });

  it('words a guess from the daily answer as a habit, not a sighting', () => {
    expect(forYouLineFor(advice({ dailyActivity: 'outdoors' }, 'outdoors', 'dailyActivity'))).toBe(
      'For you: General adult · Often outdoors',
    );
  });

});

describe('basedOnFor', () => {
  it('lists every answer the advice used', () => {
    expect(basedOnFor(advice({ identities: ['pregnant'] }, 'outdoors'))).toBe(
      'Based on: Pregnant · Outdoors now',
    );
    expect(
      basedOnFor(
        advice({ identities: ['older', 'asthma'], takesRegularMedicine: true }, 'indoors', 'override'),
      ),
    ).toBe('Based on: Asthma, Older adult · Regular medicine · Indoors now');
    expect(basedOnFor(advice({}, 'unknown'))).toBe('Based on: General adult');
  });
});
