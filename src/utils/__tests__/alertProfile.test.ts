import { DEFAULT_PLACE_ALERT_PROFILE } from '../../config/alertConfig';
import {
  alertLevelFor,
  hasLevelOverride,
  summarizeAlertLevels,
  withAlertLevel,
} from '../alertProfile';

const general = DEFAULT_PLACE_ALERT_PROFILE;

describe('withAlertLevel', () => {
  it('sets an override for a level other than the audience’s own', () => {
    const p = withAlertLevel(general, 'aqhi', 'High');
    expect(p.levelOverride).toEqual({ aqhi: 'High' });
    expect(alertLevelFor(p, 'aqhi')).toBe('High');
  });

  it('picking the audience’s own level clears the override instead of storing it', () => {
    const changed = withAlertLevel(general, 'aqhi', 'High');
    const back = withAlertLevel(changed, 'aqhi', 'Very High');
    expect(back).not.toHaveProperty('levelOverride');
    expect(hasLevelOverride(back, 'aqhi')).toBe(false);
  });

  it('resets one hazard without touching the other', () => {
    const both = withAlertLevel(withAlertLevel(general, 'aqhi', 'High'), 'heat', 'Extreme Danger');
    const reset = withAlertLevel(both, 'aqhi', null);
    expect(reset.levelOverride).toEqual({ heat: 'Extreme Danger' });
  });

  it('a reset level follows a later audience change', () => {
    const p = withAlertLevel(withAlertLevel(general, 'aqhi', 'High'), 'aqhi', null);
    expect(alertLevelFor({ ...p, audience: 'sensitive' }, 'aqhi')).toBe('High');
    expect(alertLevelFor({ ...p, audience: 'general' }, 'aqhi')).toBe('Very High');
  });
});

describe('summarizeAlertLevels', () => {
  it('lists the level in effect for each hazard, overrides included', () => {
    expect(summarizeAlertLevels(general)).toBe('Heat index Danger · Air quality Very High');
    expect(summarizeAlertLevels(withAlertLevel(general, 'aqhi', 'High'))).toBe(
      'Heat index Danger · Air quality High',
    );
  });

  it('marks a switched-off hazard, or all alerts off', () => {
    expect(summarizeAlertLevels({ ...general, hazards: { heat: false, aqhi: true } })).toBe(
      'Heat index off · Air quality Very High',
    );
    expect(summarizeAlertLevels({ ...general, hazards: { heat: false, aqhi: false } })).toBe(
      'Alerts off',
    );
  });
});
