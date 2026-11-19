import { ENVI_SAMPLES, describeEnviSample } from '../enviSamples';
import { getEnviLevel } from '../enviUtils';
import { enviKeywordsFor } from '../enviKeywords';
import { PLACE_IDENTITY_GROUPS as IDENTITY_GROUPS } from '../../config/alertConfig';
import { ENVI_ESCALATION } from '../../config/enviKeywords';

describe('ENVI_SAMPLES', () => {
  it('covers every level, the missing-data states and the special cases', () => {
    const levels = new Set(ENVI_SAMPLES.map(s => getEnviLevel(s.current)));
    [1, 2, 3, 4, 5, null].forEach(level => expect(levels.has(level)).toBe(true));
    expect(ENVI_SAMPLES.some(s => s.liveAdvice !== null)).toBe(true);
    expect(ENVI_SAMPLES.some(s => s.peakLevel !== null)).toBe(true);
    expect(new Set(ENVI_SAMPLES.map(s => s.key)).size).toBe(ENVI_SAMPLES.length);
  });

  it('covers every place, every identity, medicine, family places and going indoors sooner', () => {
    const self = ENVI_SAMPLES.filter(s => s.advice.caringFor === 'self');
    (['indoors', 'outdoors', 'transit', 'unknown'] as const).forEach(context =>
      expect(self.some(s => s.advice.context === context)).toBe(true),
    );
    (['tracking', 'override', 'dailyActivity', 'none'] as const).forEach(source =>
      expect(self.some(s => s.advice.source === source)).toBe(true),
    );
    expect(ENVI_SAMPLES.some(s => !s.trackingOn)).toBe(true);
    const identities = new Set(ENVI_SAMPLES.flatMap(s => s.advice.person.identities));
    IDENTITY_GROUPS.forEach(identity => expect(identities.has(identity)).toBe(true));
    expect(ENVI_SAMPLES.some(s => s.advice.person.identities.length > 1)).toBe(true);
    expect(ENVI_SAMPLES.some(s => s.advice.person.takesRegularMedicine)).toBe(true);
    expect(ENVI_SAMPLES.some(s => s.advice.caringFor === 'family')).toBe(true);
    expect(
      ENVI_SAMPLES.some(s =>
        enviKeywordsFor(s.current, s.nowMs, s.advice).actions.includes(ENVI_ESCALATION.action),
      ),
    ).toBe(true);
  });

  // The snapshot file next to this test is the readable catalogue of what
  // the Environmental Index card and its sheet say in each situation —
  // review wording changes there in the diff.
  it('matches the reviewed wording', () => {
    expect(`\n${ENVI_SAMPLES.map(describeEnviSample).join('\n\n')}\n`).toMatchSnapshot();
  });
});
