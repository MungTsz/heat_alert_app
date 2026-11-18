import { ENVI_SAMPLES, describeEnviSample } from '../enviSamples';
import { getEnviLevel } from '../enviUtils';

describe('ENVI_SAMPLES', () => {
  it('covers every level, the missing-data states and the special cases', () => {
    const levels = new Set(ENVI_SAMPLES.map(s => getEnviLevel(s.current)));
    [1, 2, 3, 4, 5, null].forEach(level => expect(levels.has(level)).toBe(true));
    expect(ENVI_SAMPLES.some(s => s.liveAdvice !== null)).toBe(true);
    expect(ENVI_SAMPLES.some(s => s.peakLevel !== null)).toBe(true);
    expect(new Set(ENVI_SAMPLES.map(s => s.key)).size).toBe(ENVI_SAMPLES.length);
  });

  // The snapshot file next to this test is the readable catalogue of what
  // the Environmental Index card and its sheet say in each situation —
  // review wording changes there in the diff.
  it('matches the reviewed wording', () => {
    expect(`\n${ENVI_SAMPLES.map(describeEnviSample).join('\n\n')}\n`).toMatchSnapshot();
  });
});
