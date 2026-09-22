import { decodePolyline } from '../googlePolyline';

describe('decodePolyline', () => {
  it('decodes Google\'s own published example string', () => {
    // https://developers.google.com/maps/documentation/utilities/polylinealgorithm
    const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(points).toEqual([
      { latitude: 38.5, longitude: -120.2 },
      { latitude: 40.7, longitude: -120.95 },
      { latitude: 43.252, longitude: -126.453 },
    ]);
  });

  it('returns an empty array for an empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });

  it('decodes a single-point polyline', () => {
    const points = decodePolyline('_p~iF~ps|U');
    expect(points).toEqual([{ latitude: 38.5, longitude: -120.2 }]);
  });
});
