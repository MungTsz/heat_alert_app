import {
  EXPOSURE_IO_CONFIG,
  EXPOSURE_IO_GROUPS,
  isIndoorIo,
  normalizeExposureIo,
} from '../exposureIoConfig';
import { EXPOSURE_IO_TYPES } from '../../types/exposure';

describe('normalizeExposureIo', () => {
  it('passes known backend io types through unchanged', () => {
    for (const io of EXPOSURE_IO_TYPES) expect(normalizeExposureIo(io)).toBe(io);
  });

  it('maps legacy "Indoor" to Other Indoor', () => {
    expect(normalizeExposureIo('Indoor')).toBe('Other Indoor');
  });

  it('falls back by name for unknown io types', () => {
    expect(normalizeExposureIo('Office Indoor')).toBe('Other Indoor');
    expect(normalizeExposureIo('Transit')).toBe('Outdoor');
  });
});

describe('EXPOSURE_IO_CONFIG', () => {
  it('gives every io type its own distinct color', () => {
    const colors = EXPOSURE_IO_TYPES.map(io => EXPOSURE_IO_CONFIG[io].color.toLowerCase());
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe('EXPOSURE_IO_GROUPS', () => {
  it('lists every io type exactly once, in stack order', () => {
    expect(EXPOSURE_IO_GROUPS.flat()).toEqual([...EXPOSURE_IO_TYPES]);
  });
});

describe('isIndoorIo', () => {
  it('is true only for the place-label categories', () => {
    expect(EXPOSURE_IO_TYPES.filter(isIndoorIo)).toEqual([
      'Other Indoor',
      'School',
      'Office',
      'Home',
    ]);
  });
});
