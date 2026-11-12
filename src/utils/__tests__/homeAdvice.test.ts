import { adviceFor } from '../alertMessages';
import { AUDIENCE_GROUPS, HAZARD_KINDS } from '../../config/alertConfig';
import { HOME_LAYOUT_CONFIG } from '../../config/homeLayoutConfig';
import { CaringFor, HazardKind } from '../../types/alerts';

// Home shows the notification's advice as a footer line under Temp ·
// Humidity on alert days. Every variant adviceFor can produce must stay a
// short line, the way pushBodyMaxChars holds the push bodies.
describe('Home advice line', () => {
  const hazardSets: HazardKind[][] = [...HAZARD_KINDS.map(h => [h]), [...HAZARD_KINDS]];
  const voices: CaringFor[] = ['self', 'family'];
  const variants = hazardSets.flatMap(hazards =>
    AUDIENCE_GROUPS.flatMap(audience =>
      voices.flatMap(caringFor =>
        [false, true].map(severe => adviceFor(hazards, { audience, caringFor }, severe)),
      ),
    ),
  );

  it.each(variants)('"%s" fits the footer', advice => {
    expect(advice.length).toBeLessThanOrEqual(HOME_LAYOUT_CONFIG.adviceMaxChars);
  });
});
