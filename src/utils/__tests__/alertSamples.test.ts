import { ALERT_MESSAGE_CONFIG, DEFAULT_PLACE_ALERT_PROFILE } from '../../config/alertConfig';
import { AlertPlace } from '../alertMessages';
import { buildSampleGallery } from '../alertSamples';

// Wed 4 Nov 2026, 3 pm HKT — fixed so the snapshot never drifts.
const NOW = Date.UTC(2026, 10, 4, 7);

const mum: AlertPlace = {
  id: 'mum',
  label: "Mum's home",
  profile: { ...DEFAULT_PLACE_ALERT_PROFILE, audience: 'sensitive', caringFor: 'family' },
};
const you: AlertPlace = { id: 'current', label: 'Your location', profile: DEFAULT_PLACE_ALERT_PROFILE };

const gallery = buildSampleGallery(mum, you, NOW);

describe('buildSampleGallery', () => {
  it('covers every message the engine can send, each marked as a sample', () => {
    expect(gallery).toHaveLength(9);
    gallery.forEach(({ message }) => expect(message.title.startsWith('Sample · ')).toBe(true));
    expect(new Set(gallery.map(g => g.message.id)).size).toBe(gallery.length);
  });

  it('keeps single messages within the push budget', () => {
    gallery
      .filter(({ message }) => message.group !== 'digest')
      .forEach(({ message }) =>
        expect(message.body.length).toBeLessThanOrEqual(ALERT_MESSAGE_CONFIG.pushBodyMaxChars),
      );
  });

  // The snapshot file next to this test is the readable catalogue of every
  // message's wording — review copy changes there in the diff.
  it('matches the reviewed wording', () => {
    expect(gallery.map(({ message }) => `${message.title}\n${message.body}`)).toMatchSnapshot();
  });
});
