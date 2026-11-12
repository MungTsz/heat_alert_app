import { DEFAULT_PLACE_ALERT_PROFILE, NEW_PLACE_ALERT_PROFILE } from '../../config/alertConfig';
import {
  alertLevelFor,
  hasLevelOverride,
  resolvePlaceAlertProfile,
  summarizeAlertLevels,
  withAlertLevel,
  withCaringFor,
  withPlaceAudience,
} from '../alertProfile';

const general = DEFAULT_PLACE_ALERT_PROFILE;
const aboutYouOutdoor = { ...general, audience: 'outdoor' as const };

describe('resolvePlaceAlertProfile', () => {
  it('a new place for yourself uses your About you answer', () => {
    const p = resolvePlaceAlertProfile(NEW_PLACE_ALERT_PROFILE, aboutYouOutdoor);
    expect(p.audience).toBe('outdoor');
    expect(p.followsAboutYou).toBe(true);
  });

  it('follows a later About you change without re-saving the place', () => {
    const saved = resolvePlaceAlertProfile(NEW_PLACE_ALERT_PROFILE, aboutYouOutdoor);
    const later = resolvePlaceAlertProfile(saved, { ...general, audience: 'chronic' });
    expect(later.audience).toBe('chronic');
  });

  it('keeps a place’s own audience and a family place’s audience', () => {
    const own = { ...general, audience: 'sensitive' as const, followsAboutYou: false };
    expect(resolvePlaceAlertProfile(own, aboutYouOutdoor).audience).toBe('sensitive');
    const mum = { ...general, audience: 'general' as const, caringFor: 'family' as const };
    const resolvedMum = resolvePlaceAlertProfile(mum, aboutYouOutdoor);
    expect(resolvedMum.audience).toBe('general');
    expect(resolvedMum.followsAboutYou).toBe(false);
  });

  it('older saves: a place for yourself left on General adult follows About you', () => {
    expect(resolvePlaceAlertProfile(undefined, aboutYouOutdoor).audience).toBe('outdoor');
    expect(resolvePlaceAlertProfile(general, aboutYouOutdoor).audience).toBe('outdoor');
    // Any other answer was a real choice for that place.
    const chose = { ...general, audience: 'sensitive' as const };
    expect(resolvePlaceAlertProfile(chose, aboutYouOutdoor).audience).toBe('sensitive');
  });
});

describe('withCaringFor / withPlaceAudience', () => {
  const mine = resolvePlaceAlertProfile(NEW_PLACE_ALERT_PROFILE, aboutYouOutdoor);

  it('switching to "for myself" starts from the About you answer', () => {
    const family = { ...mine, caringFor: 'family' as const, audience: 'sensitive' as const };
    const back = withCaringFor(family, 'self', 'outdoor');
    expect(back.audience).toBe('outdoor');
    expect(back.followsAboutYou).toBe(true);
  });

  it('switching to family stops following and keeps the pick', () => {
    const family = withCaringFor(mine, 'family', 'outdoor');
    expect(family.followsAboutYou).toBe(false);
    expect(family.audience).toBe('outdoor');
  });

  it('picking another audience gives a place for yourself its own answer', () => {
    const own = withPlaceAudience(mine, 'sensitive', 'outdoor');
    expect(own.followsAboutYou).toBe(false);
    expect(resolvePlaceAlertProfile(own, { ...general, audience: 'chronic' }).audience).toBe(
      'sensitive',
    );
  });

  it('picking your own answer again means "same as me" again', () => {
    const own = withPlaceAudience(mine, 'sensitive', 'outdoor');
    const back = withPlaceAudience(own, 'outdoor', 'outdoor');
    expect(back.followsAboutYou).toBe(true);
  });

  it('a family place never follows, even on the same audience', () => {
    const family = withCaringFor(mine, 'family', 'outdoor');
    expect(withPlaceAudience(family, 'outdoor', 'outdoor').followsAboutYou).toBe(false);
  });
});

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
