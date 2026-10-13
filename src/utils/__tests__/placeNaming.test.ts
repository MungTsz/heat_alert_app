import {
  buildDefaultPlaceName,
  classifyArea,
  pickDisplayName,
  validatePlaceName,
} from '../placeNaming';
import { EnclosingArea, PlaceContext, ReverseGeocodeResult } from '../../types/placeLookup';

// Fixtures trimmed from real Overpass is_in / Nominatim reverse responses
// (2026-10). Bounding-box sizes are illustrative — only their order matters.
const HK_BOUNDARY: EnclosingArea = {
  tags: { boundary: 'administrative', admin_level: '3', name: '香港 Hong Kong', short_name: 'HK' },
  areaDeg2: 1,
};

const HKUST_CAMPUS: EnclosingArea = {
  tags: {
    amenity: 'university',
    name: '香港科技大學 The Hong Kong University of Science and Technology',
    'name:en': 'The Hong Kong University of Science and Technology',
    short_name: 'HKUST',
    'short_name:zh': '科大',
  },
  areaDeg2: 0.00005,
};

const ACADEMIC_BUILDING: EnclosingArea = {
  tags: { building: 'university', name: 'Academic Building' },
  areaDeg2: 0.000004,
};

// Inside the campus, Nominatim's nearest object is a restaurant — never the
// university itself.
const HKUST_REVERSE: ReverseGeocodeResult = {
  displayName: 'UniBistro & Bar, University Road, Pik Shui Sun Tsuen, Sai Kung District, Hong Kong',
  category: 'amenity',
  type: 'restaurant',
  name: 'UniBistro & Bar',
  namedetails: { name: 'UniBistro & Bar' },
  address: {
    amenity: 'UniBistro & Bar',
    road: 'University Road',
    hamlet: 'Pik Shui Sun Tsuen',
    suburb: 'Sai Kung District',
  },
};

const ICC_AREAS: EnclosingArea[] = [
  { tags: { place: 'city_block', name: '港鐵九龍站 Union Square', 'name:en': 'Union Square' }, areaDeg2: 0.00002 },
  {
    tags: {
      building: 'office',
      name: '環球貿易廣場 International Commerce Centre',
      'name:en': 'International Commerce Centre',
      short_name: 'ICC',
    },
    areaDeg2: 0.000001,
  },
  { tags: { building: 'retail', name: 'Elements', 'name:en': 'Elements' }, areaDeg2: 0.000008 },
  HK_BOUNDARY,
];

const PARKSIDE_REVERSE: ReverseGeocodeResult = {
  displayName: 'The Parkside Place, Chi Shin Street, Tseung Kwan O South, Sai Kung District, Hong Kong',
  category: 'shop',
  type: 'mall',
  name: 'The Parkside Place',
  namedetails: { name: 'The Parkside Place' },
  address: {
    shop: 'The Parkside Place',
    road: 'Chi Shin Street',
    quarter: 'Tseung Kwan O South',
    suburb: 'Sai Kung District',
  },
};

const hkust: PlaceContext = {
  enclosingAreas: [HK_BOUNDARY, HKUST_CAMPUS, ACADEMIC_BUILDING],
  reverse: HKUST_REVERSE,
};

describe('pickDisplayName', () => {
  it('prefers the official short name', () => {
    expect(pickDisplayName(HKUST_CAMPUS.tags)).toBe('HKUST');
  });

  it('keeps only the English half of a bilingual name and drops a leading "The"', () => {
    expect(pickDisplayName({ name: '香港科技大學 The Hong Kong University of Science and Technology' })).toBe(
      'Hong Kong University of Science and Technology',
    );
  });

  it('ignores a Chinese-only short name', () => {
    expect(pickDisplayName({ short_name: '科大', 'name:en': 'Some College' })).toBe('Some College');
  });

  it('keeps a purely Chinese name rather than returning nothing', () => {
    expect(pickDisplayName({ name: '海怡半島' })).toBe('海怡半島');
  });
});

describe('classifyArea', () => {
  it('skips administrative boundaries', () => {
    expect(classifyArea(HK_BOUNDARY.tags)).toBeNull();
  });

  it('maps campuses, blocks, buildings and venues to their levels', () => {
    expect(classifyArea(HKUST_CAMPUS.tags)).toBe('institution');
    expect(classifyArea({ place: 'city_block' })).toBe('estate');
    expect(classifyArea({ landuse: 'residential' })).toBe('estate');
    expect(classifyArea({ building: 'office' })).toBe('building');
    expect(classifyArea({ shop: 'mall' })).toBe('venue');
  });
});

describe('buildDefaultPlaceName', () => {
  it('names a school after its campus, not the nearest café', () => {
    expect(buildDefaultPlaceName(hkust, 'School', [])).toBe('HKUST');
  });

  it('falls back to the street when the campus lookup failed', () => {
    const overpassDown: PlaceContext = { enclosingAreas: [], reverse: HKUST_REVERSE };
    expect(buildDefaultPlaceName(overpassDown, 'School', [])).toBe('University Road');
  });

  it('names an office after the smallest named building around the pin', () => {
    expect(buildDefaultPlaceName({ enclosingAreas: ICC_AREAS, reverse: null }, 'Office', [])).toBe(
      'ICC',
    );
  });

  it('names a home after its estate / block', () => {
    expect(buildDefaultPlaceName({ enclosingAreas: ICC_AREAS, reverse: null }, 'Home', [])).toBe(
      'Union Square',
    );
  });

  it('names an other-indoor place after the venue', () => {
    expect(
      buildDefaultPlaceName({ enclosingAreas: [], reverse: PARKSIDE_REVERSE }, 'Other Indoor', []),
    ).toBe('Parkside Place');
  });

  it('appends a finer detail when the core name is taken', () => {
    expect(buildDefaultPlaceName(hkust, 'School', ['hkust'])).toBe('HKUST · Academic Building');
  });

  it('tries the next finer detail, then numbers the name once details run out', () => {
    const taken = ['HKUST', 'HKUST · Academic Building'];
    expect(buildDefaultPlaceName(hkust, 'School', taken)).toBe('HKUST · University Road');

    taken.push('HKUST · University Road');
    expect(buildDefaultPlaceName(hkust, 'School', taken)).toBe('HKUST 2');

    taken.push('HKUST 2');
    expect(buildDefaultPlaceName(hkust, 'School', taken)).toBe('HKUST 3');
  });

  it('skips a detail that would make the name too long', () => {
    const longBuilding: EnclosingArea = {
      tags: { building: 'university', name: 'Lee Shau Kee Campus Innovation Centre' },
      areaDeg2: 0.000001,
    };
    const context: PlaceContext = {
      enclosingAreas: [HKUST_CAMPUS, longBuilding],
      reverse: null,
    };
    expect(buildDefaultPlaceName(context, 'School', ['HKUST'])).toBe('HKUST 2');
  });

  it('falls back to the category label with no location data at all', () => {
    const nothing: PlaceContext = { enclosingAreas: [], reverse: null };
    expect(buildDefaultPlaceName(nothing, 'Home', [])).toBe('Home');
    expect(buildDefaultPlaceName(nothing, 'Home', ['Home'])).toBe('Home 2');
  });
});

describe('validatePlaceName', () => {
  it('rejects empty and duplicate names, case-insensitively', () => {
    expect(validatePlaceName('   ', [])).not.toBeNull();
    expect(validatePlaceName(' home ', ['Home'])).not.toBeNull();
    expect(validatePlaceName("Mom's flat", ['Home'])).toBeNull();
  });
});
