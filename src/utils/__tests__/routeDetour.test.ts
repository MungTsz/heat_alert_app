import { isReasonableRoute } from '../routeDetour';

describe('isReasonableRoute', () => {
  it('accepts a route under the detour ratio', () => {
    expect(isReasonableRoute(150, 100, 3.5)).toBe(true);
  });

  it('accepts a route exactly at the detour ratio', () => {
    expect(isReasonableRoute(350, 100, 3.5)).toBe(true);
  });

  it('rejects a route over the detour ratio', () => {
    expect(isReasonableRoute(351, 100, 3.5)).toBe(false);
  });

  it('accepts any route when the straight-line distance is near zero', () => {
    expect(isReasonableRoute(500, 1, 3.5)).toBe(true);
  });
});
